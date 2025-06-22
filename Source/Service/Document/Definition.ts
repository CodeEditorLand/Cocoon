/*
 * File: Cocoon/Source/Service/Document/Definition.ts
 * Role: The live implementation of the Document service.
 * Responsibilities:
 *   1. Manages the lifecycle of text documents (add, remove, change).
 *   2. Provides the public `vscode.workspace` API related to documents.
 *   3. Manages registration and invocation of `TextDocumentContentProvider`s.
 *   4. Acts as the extension host-side counterpart to `MainThreadDocuments` in Mountain.
 */

import { Effect, Option, Ref } from "effect";
import type { IModelChangedEvent } from "vs/editor/common/model/mirrorTextModel.js";
import { MainThreadDocumentsShape } from "vs/workbench/api/common/extHost.protocol.js";
import { ExtHostDocumentData } from "vs/workbench/api/common/extHostDocumentData.js";
import {
	CancellationTokenSource,
	Disposable,
	type TextDocument,
	type TextDocumentChangeEvent,
	type TextDocumentContentProvider,
	type Uri,
} from "vscode";

import RangeConverter from "../../TypeConverter/Main/Range.js";
import URIConverter from "../../TypeConverter/Main/URI.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Document service.
 */
export default Effect.gen(function* (G) {
	// --- Service Dependencies ---
	const IPC = yield* G(IPCService);

	const DocumentMapRef = yield* G(
		Ref.make(new Map<string, ExtHostDocumentData>()),
	);

	const ContentProvidersRef = yield* G(
		Ref.make(new Map<string, TextDocumentContentProvider>()),
	);

	const MainThreadDocumentsProxy = IPC.CreateProxy<MainThreadDocumentsShape>(
		"$rpc:mainThreadDocuments",
	);

	// --- Event Emitters for the Public API ---
	const OnDidOpenTextDocumentStream = CreateEventStream<TextDocument>();

	const OnDidCloseTextDocumentStream = CreateEventStream<TextDocument>();

	const OnDidChangeTextDocumentStream =
		CreateEventStream<TextDocumentChangeEvent>();

	const OnDidSaveTextDocumentStream = CreateEventStream<TextDocument>();

	// --- RPC Handlers (for updates FROM Mountain) ---

	const AcceptModelAddedEffect = (Data: any) =>
		Effect.gen(function* (G) {
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

			yield* G(
				Ref.update(DocumentMapRef, (Map) =>
					Map.set(DocumentData.document.uri.toString(), DocumentData),
				),
			);

			yield* G(OnDidOpenTextDocumentStream.Fire(DocumentData.document));
		});

	const AcceptModelRemovedEffect = (UriDTO: any) =>
		Effect.gen(function* (G) {
			const URIString = URIConverter.ToAPI(UriDTO).toString();

			const DocumentData = (yield* G(Ref.get(DocumentMapRef))).get(
				URIString,
			);

			if (DocumentData) {
				yield* G(
					Ref.update(
						DocumentMapRef,

						(Map) => (Map.delete(URIString), Map),
					),
				);

				yield* G(
					OnDidCloseTextDocumentStream.Fire(DocumentData.document),
				);
			}
		});

	const AcceptModelChangedEffect = (UriDTO: any, ChangeEventDTO: any) =>
		Effect.gen(function* (G) {
			const URIString = URIConverter.ToAPI(UriDTO).toString();

			const DocumentData = (yield* G(Ref.get(DocumentMapRef))).get(
				URIString,
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

				yield* G(
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
		Effect.gen(function* (G) {
			const Uri = URIConverter.ToAPI(UriComponents);

			const Scheme = Uri.scheme;

			const Providers = yield* G(Ref.get(ContentProvidersRef));

			const Provider = Option.fromNullable(Providers.get(Scheme));

			if (
				Option.isNone(Provider) ||
				!Provider.value.provideTextDocumentContent
			) {
				return Option.none<string>();
			}

			// The provideTextDocumentContent method returns a ProviderResult<string>, which is Thenable<string | undefined | null> | string | undefined | null.
			// We need to handle this. Effect.tryPromise is perfect.
			const Token = new CancellationTokenSource().token;

			const Content = yield* G(
				Effect.tryPromise({
					try: () =>
						Provider.value.provideTextDocumentContent!(Uri, Token),

					catch: (UnknownError) =>
						new Error(
							`Content provider for scheme "${Scheme}" threw an error: ${UnknownError}`,
						),
				}),
			);

			return Option.fromNullable(Content);
		}).pipe(
			Effect.catchAll((Error) =>
				Effect.logError(Error).pipe(Effect.as(Option.none<string>())),
			),

			// Convert Option<string> to string | null
			Effect.map(Option.getOrElse(() => null)),
		);

	// --- Register Handlers ---
	yield* G(
		Effect.sync(() => {
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
		}),
	);

	// --- Service Implementation ---
	const DocumentImplementation: Service["Type"] = {
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
			// Register with the host so it knows it can request content for this scheme.
			Effect.runFork(
				IPC.SendNotification("$registerTextDocumentContentProvider", [
					Scheme,
				]),
			);

			// Store locally for invocation.
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

	return DocumentImplementation;
});
