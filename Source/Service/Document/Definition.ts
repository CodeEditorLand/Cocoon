/*
 * File: Cocoon/Source/Service/Document/Definition.ts
 * Responsibility: The live implementation of the Document service.
 * Modified: 2025-06-17 10:52:55 UTC
 */

/**
 * @module Definition (Document)
 * @description The live implementation of the Document service.
 */

import { Effect, Option, Ref } from "effect";
import type { IModelChangedEvent } from "vs/editor/common/model/mirrorTextModel.js";
import { MainThreadDocumentsShape } from "vs/workbench/api/common/extHost.protocol.js";
import { ExtHostDocumentData } from "vs/workbench/api/common/extHostDocumentData.js";
import type { TextDocument, TextDocumentChangeEvent, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
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
			const RevivedURI = TypeConverter.URI.ToAPI(Data.uri);
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
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
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
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
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
								range: TypeConverter.Range.ToAPI(Change.range),
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
		}),
	);

	// --- Service Implementation ---
	const DocumentImplementation: Service["Type"] = {
		get TextDocuments() {
			const Map = Effect.runSync(Ref.get(DocumentMapRef));
			return Array.from(Map.values()).map((data) => data.document);
		},
		onDidOpenTextDocument: OnDidOpenTextDocumentStream.event,
		onDidCloseTextDocument: OnDidCloseTextDocumentStream.event,
		onDidChangeTextDocument: OnDidChangeTextDocumentStream.event,
		onDidSaveTextDocument: OnDidSaveTextDocumentStream.event,
		GetDocument: (URI: Uri) =>
			Ref.get(DocumentMapRef).pipe(
				Effect.map((Map) =>
					Option.fromNullable(Map.get(URI.toString())),
				),
				Effect.map(Option.map((data) => data.document)),
			),
	};

	return DocumentImplementation;
});
