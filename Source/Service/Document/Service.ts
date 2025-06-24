/*
 * File: Cocoon/Source/Service/Document/Service.ts
 * Role: Defines the Document service interface and provides its default "live" implementation.
 * Responsibilities:
 *   - Acts as the source of truth for the state of all open text documents.
 *   - Provide the `Effect.Service` class and its default Layer for dependency injection.
 */

import { Effect, Option, Ref } from "effect";
import type { IModelChangedEvent } from "vs/editor/common/model/mirrorTextModel.js";
import { MainThreadDocumentsShape } from "vs/workbench/api/common/extHost.protocol.js";
import { ExtHostDocumentData } from "vs/workbench/api/common/extHostDocumentData.js";
import {
	CancellationTokenSource,
	Disposable,
	type Event,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentProvider,
	type Uri,
} from "vscode";

import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC as IPCService } from "../IPC/Service.js";

export class Document extends Effect.Service<Document>()("Service/Document", {
	effect: Effect.gen(function* (Generator) {
		const IPC = yield* Generator(IPCService);
		const DocumentMapRef = yield* Generator(
			Ref.make(new Map<string, ExtHostDocumentData>()),
		);
		const ContentProvidersRef = yield* Generator(
			Ref.make(new Map<string, TextDocumentContentProvider>()),
		);
		const MainThreadDocumentsProxy =
			IPC.CreateProxy<MainThreadDocumentsShape>(
				"$rpc:mainThreadDocuments",
			);

		const OnDidOpenTextDocumentStream = CreateEventStream<TextDocument>();
		const OnDidCloseTextDocumentStream = CreateEventStream<TextDocument>();
		const OnDidChangeTextDocumentStream =
			CreateEventStream<TextDocumentChangeEvent>();
		const OnDidSaveTextDocumentStream = CreateEventStream<TextDocument>();

		const AcceptModelAddedEffect = (Data: any) =>
			Effect.gen(function* (Generator) {
				const RevivedURI = URIConverter.ToAPI(Data.uri);
				const DocumentData = new ExtHostDocumentData(
					MainThreadDocumentsProxy,
					RevivedURI,
					Data.lines,
					Data.eol,
					Data.versionId,
					Data.languageId,
					Data.isDirty,
					Data.encoding,
				);
				yield* Generator(
					Ref.update(DocumentMapRef, (Map) =>
						Map.set(
							DocumentData.document.uri.toString(),
							DocumentData,
						),
					),
				);
				yield* Generator(
					OnDidOpenTextDocumentStream.Fire(DocumentData.document),
				);
			});

		const AcceptModelRemovedEffect = (UriDTO: any) =>
			Effect.gen(function* (Generator) {
				const URIString = URIConverter.ToAPI(UriDTO).toString();
				const DocumentData = (yield* Generator(
					Ref.get(DocumentMapRef),
				)).get(URIString);
				if (DocumentData) {
					yield* Generator(
						Ref.update(
							DocumentMapRef,
							(Map) => (Map.delete(URIString), Map),
						),
					);
					yield* Generator(
						OnDidCloseTextDocumentStream.Fire(
							DocumentData.document,
						),
					);
				}
			});

		const AcceptModelChangedEffect = (UriDTO: any, ChangeEventDTO: any) =>
			Effect.gen(function* (Generator) {
				const URIString = URIConverter.ToAPI(UriDTO).toString();
				const DocumentData = (yield* Generator(
					Ref.get(DocumentMapRef),
				)).get(URIString);
				if (DocumentData) {
					const ModelChangedEvent: IModelChangedEvent = {
						changes: ChangeEventDTO.changes,
						eol: ChangeEventDTO.eol,
						versionId: ChangeEventDTO.versionId,
						isUndoing: false,
						isRedoing: false,
					};
					DocumentData.onEvents(ModelChangedEvent);
					yield* Generator(
						OnDidChangeTextDocumentStream.Fire({
							document: DocumentData.document,
							contentChanges: ChangeEventDTO.changes.map(
								(Change: any) => ({
									range: RangeConverter.ToAPI(Change.range),
									rangeOffset: Change.rangeOffset,
									rangeLength: Change.rangeLength,
									text: Change.text,
								}),
							),
							reason: ChangeEventDTO.reason,
						}),
					);
				}
			});

		const ProvideTextDocumentContentEffect = (UriComponents: any) =>
			Effect.gen(function* (Generator) {
				const Uri = URIConverter.ToAPI(UriComponents);
				const Scheme = Uri.scheme;
				const Providers = yield* Generator(
					Ref.get(ContentProvidersRef),
				);
				const Provider = Option.fromNullable(Providers.get(Scheme));
				if (
					Option.isNone(Provider) ||
					!Provider.value.provideTextDocumentContent
				) {
					return Option.none<string>();
				}
				const Token = new CancellationTokenSource().token;
				const Content = yield* Generator(
					Effect.tryPromise({
						try: () =>
							Provider.value.provideTextDocumentContent!(
								Uri,
								Token,
							),
						catch: (UnknownError) =>
							new Error(
								`Content provider for scheme "${Scheme}" threw an error: ${UnknownError}`,
							),
					}),
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
			Effect.runPromise(AcceptModelAddedEffect(Data)),
		);
		IPC.RegisterInvokeHandler("$acceptModelRemoved", ([Uri]) =>
			Effect.runPromise(AcceptModelRemovedEffect(Uri)),
		);
		IPC.RegisterInvokeHandler("$acceptModelChanged", ([Uri, Changes]) =>
			Effect.runPromise(AcceptModelChangedEffect(Uri, Changes)),
		);
		IPC.RegisterInvokeHandler(
			"$provideTextDocumentContent",
			([UriComponents]) =>
				Effect.runPromise(
					ProvideTextDocumentContentEffect(UriComponents),
				),
		);

		const ServiceImplementation = {
			get TextDocuments() {
				const Map = Effect.runSync(Ref.get(DocumentMapRef));
				return Array.from(Map.values()).map((data) => data.document);
			},
			OnDidOpenTextDocument: OnDidOpenTextDocumentStream.event,
			OnDidCloseTextDocument: OnDidCloseTextDocumentStream.event,
			OnDidChangeTextDocument: OnDidChangeTextDocumentStream.event,
			OnDidSaveTextDocument: OnDidSaveTextDocumentStream.event,
			GetDocument: (URI: Uri) =>
				Ref.get(DocumentMapRef).pipe(
					Effect.map((Map) =>
						Option.fromNullable(Map.get(URI.toString())),
					),
					Effect.map(Option.map((data) => data.document)),
				),
			RegisterTextDocumentContentProvider: (
				Scheme: string,
				Provider: TextDocumentContentProvider,
			): Disposable => {
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
					const UnregisterEffect = Ref.update(
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
					Effect.runFork(UnregisterEffect);
				});
			},
		};

		return ServiceImplementation;
	}),
}) {}
