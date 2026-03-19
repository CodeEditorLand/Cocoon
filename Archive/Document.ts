/**
 * @module Document
 * @description Defines the service for managing the state of all open text documents.
 * It acts as the extension host's source of truth for document content, lifecycle
 * events, and provides an implementation of `vscode.workspace`'s document-related APIs.
 */

import type { IModelChangedEvent } from "@codeeditorland/output/vs/editor/common/model/mirrorTextModel.js";
import type { MainThreadDocumentsShape } from "@codeeditorland/output/vs/workbench/api/common/extHost.protocol.js";
import { ExtHostDocumentData } from "@codeeditorland/output/vs/workbench/api/common/extHostDocumentData.js";
import { Effect, Option, Ref } from "effect";
import {
	CancellationTokenSource,
	Disposable,
	type Event,
	type ProviderResult,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentProvider,
	type Uri,
} from "vscode";

import { IPCService } from "./IPC.js";
import { ToAPI as RangeToAPI } from "./TypeConverter/Main/Range.js";
import { ToAPI as UriToAPI } from "./TypeConverter/Main/URI.js";
import { CreateEventStream } from "./Utility/EventStream.js";

/**
 * @interface Document
 * @description The contract for the Document service.
 */
export interface Document {
	readonly TextDocuments: readonly TextDocument[];
	readonly OnDidOpenTextDocument: Event<TextDocument>;
	readonly OnDidCloseTextDocument: Event<TextDocument>;
	readonly OnDidChangeTextDocument: Event<TextDocumentChangeEvent>;
	readonly OnDidSaveTextDocument: Event<TextDocument>;
	readonly GetDocument: (
		Uri: Uri,
	) => Effect.Effect<Option.Option<TextDocument>, never>;
	readonly RegisterTextDocumentContentProvider: (
		Scheme: string,
		Provider: TextDocumentContentProvider,
	) => Disposable;
}

/**
 * @class DocumentService
 * @description The `Effect.Service` for managing text documents.
 */
export class DocumentService extends Effect.Service<DocumentService>()(
	"Service/Document",
	{
		effect: Effect.gen(function* () {
			const IPC = yield* IPCService;
			const DocumentMapRef = yield* Ref.make(
				new Map<string, ExtHostDocumentData>(),
			);
			const ContentProvidersRef = yield* Ref.make(
				new Map<string, TextDocumentContentProvider>(),
			);
			const MainThreadDocumentsProxy =
				IPC.CreateProxy<MainThreadDocumentsShape>(
					"$rpc:mainThreadDocuments",
				);

			const { event: OnDidOpenTextDocument, Fire: FireOpen } =
				CreateEventStream<TextDocument>();
			const { event: OnDidCloseTextDocument, Fire: FireClose } =
				CreateEventStream<TextDocument>();
			const { event: OnDidChangeTextDocument, Fire: FireChange } =
				CreateEventStream<TextDocumentChangeEvent>();
			const { event: OnDidSaveTextDocument } =
				CreateEventStream<TextDocument>();

			// --- RPC Handlers ---
			const AcceptModelAdded = (Data: any) =>
				Effect.gen(function* () {
					const RevivedUri = UriToAPI(Data.uri);
					const DocumentData = new ExtHostDocumentData(
						MainThreadDocumentsProxy,
						RevivedUri,
						Data.lines,
						Data.eol,
						Data.versionId,
						Data.languageId,
						Data.isDirty,
						Data.encoding,
					);
					yield* Ref.update(DocumentMapRef, (Map) =>
						Map.set(
							DocumentData.document.uri.toString(),
							DocumentData,
						),
					);
					yield* FireOpen(DocumentData.document);
				});

			const AcceptModelRemoved = (UriDTO: any) =>
				Effect.gen(function* () {
					const UriString = UriToAPI(UriDTO).toString();
					const DocumentData = (yield* Ref.get(DocumentMapRef)).get(
						UriString,
					);
					if (DocumentData) {
						yield* Ref.update(
							DocumentMapRef,
							(Map) => (Map.delete(UriString), Map),
						);
						yield* FireClose(DocumentData.document);
					}
				});

			const AcceptModelChanged = (UriDTO: any, ChangeEventDTO: any) =>
				Effect.gen(function* () {
					const UriString = UriToAPI(UriDTO).toString();
					const DocumentData = (yield* Ref.get(DocumentMapRef)).get(
						UriString,
					);
					if (DocumentData) {
						const ModelChangedEvent: IModelChangedEvent = {
							changes: ChangeEventDTO.changes,
							eol: ChangeEventDTO.eol,
							versionId: ChangeEventDTO.versionId,
							isUndoing: false,
							isRedoing: false,
						};
						DocumentData.onEvents(ModelChangedEvent);
						yield* FireChange({
							document: DocumentData.document,
							contentChanges: ChangeEventDTO.changes.map(
								(Change: any) => ({
									range: RangeToAPI(Change.range),
									rangeOffset: Change.rangeOffset,
									rangeLength: Change.rangeLength,
									text: Change.text,
								}),
							),
							reason: ChangeEventDTO.reason,
						});
					}
				});

			const ProvideTextDocumentContent = (UriComponents: any) =>
				Effect.gen(function* () {
					const Uri = UriToAPI(UriComponents);
					const Scheme = Uri.scheme;
					const Providers = yield* Ref.get(ContentProvidersRef);
					const Provider = Option.fromNullable(Providers.get(Scheme));
					if (
						Option.isNone(Provider) ||
						!Provider.value.provideTextDocumentContent
					) {
						return Option.none<string>();
					}
					const Token = new CancellationTokenSource().token;
					const Content = yield* Effect.promise(() =>
						Promise.resolve(
							Provider.value.provideTextDocumentContent(
								Uri,
								Token,
							) as ProviderResult<string>,
						),
					);
					return Option.fromNullable(Content);
				}).pipe(
					Effect.catchAll((Error) =>
						Effect.logError(Error).pipe(
							Effect.as(Option.none<string>()),
						),
					),
					Effect.map(Option.getOrElse(() => null)),
				);

			IPC.RegisterInvokeHandler("$acceptModelAdded", ([Data]) =>
				Effect.runPromise(AcceptModelAdded(Data)),
			);
			IPC.RegisterInvokeHandler("$acceptModelRemoved", ([Uri]) =>
				Effect.runPromise(AcceptModelRemoved(Uri)),
			);
			IPC.RegisterInvokeHandler("$acceptModelChanged", ([Uri, Changes]) =>
				Effect.runPromise(AcceptModelChanged(Uri, Changes)),
			);
			IPC.RegisterInvokeHandler(
				"$provideTextDocumentContent",
				([UriComponents]) =>
					Effect.runPromise(
						ProvideTextDocumentContent(UriComponents),
					),
			);

			return {
				get TextDocuments() {
					const documentMap = Effect.runSync(Ref.get(DocumentMapRef));
					return Array.from(documentMap.values()).map(
						(data) => data.document,
					);
				},
				OnDidOpenTextDocument,
				OnDidCloseTextDocument,
				OnDidChangeTextDocument,
				OnDidSaveTextDocument,
				GetDocument: (Uri: Uri) =>
					Ref.get(DocumentMapRef).pipe(
						Effect.map((Map) =>
							Option.fromNullable(Map.get(Uri.toString())),
						),
						Effect.map(Option.map((data) => data.document)),
					),
				RegisterTextDocumentContentProvider: (
					Scheme: string,
					Provider: TextDocumentContentProvider,
				) => {
					Effect.runFork(
						IPC.SendNotification(
							"$registerTextDocumentContentProvider",
							[Scheme],
						),
					);
					Effect.runSync(
						Ref.update(ContentProvidersRef, (Map) =>
							Map.set(Scheme, Provider),
						),
					);
					return new Disposable(() => {
						const Unregister = Ref.update(
							ContentProvidersRef,
							(Map) => (Map.delete(Scheme), Map),
						).pipe(
							Effect.andThen(
								IPC.SendNotification(
									"$unregisterTextDocumentContentProvider",
									[Scheme],
								),
							),
						);
						Effect.runFork(Unregister);
					});
				},
			};
		}),
	},
) {}
