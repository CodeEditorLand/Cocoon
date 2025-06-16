/*
 * File: Cocoon/Source/Service/Document/Definition.ts
 * Responsibility:
 * Modified: 2025-06-16 14:00:34 UTC
 * Dependency: ../../TypeConverter/Main.js, ../../Utility/CreateEventStream.js, ../IPC/Service.js, ./Service.js, effect, vs/base/parts/ipc/common/ipc.js, vs/workbench/api/common/extHostDocumentData.js, vscode
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
 * @export
 * @default
 */
export default Effect.gen(function* () {
	// --- Service Dependencies ---
	const IPC = yield* IPCService;
	const DocumentMap = yield* Ref.make(new Map<string, ExtHostDocumentData>());

	const MainThreadDocumentsProxy = IPC.CreateProxy<MainThreadDocumentsShape>(
		"$rpc:mainThreadDocuments",
	);

	// --- Event Emitters for the Public API ---
	const OnDidOpenTextDocument = CreateEventStream<TextDocument>();
	const OnDidCloseTextDocument = CreateEventStream<TextDocument>();
	const OnDidChangeTextDocument =
		CreateEventStream<TextDocumentChangeEvent>();
	const OnDidSaveTextDocument = CreateEventStream<TextDocument>();

	// --- RPC Handlers (for updates FROM Mountain) ---

	/**
	 * An Effect that handles the addition of a new model from the host.
	 */
	const AcceptModelAdded = (Data: any) =>
		Effect.gen(function* () {
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

			yield* Ref.update(DocumentMap, (Map) =>
				Map.set(DocumentData.document.uri.toString(), DocumentData),
			);
			yield* OnDidOpenTextDocument.Fire(DocumentData.document);
		});

	/**
	 * An Effect that handles the removal of a model from the host.
	 */
	const AcceptModelRemoved = (UriDTO: any) =>
		Effect.gen(function* () {
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
			const DocumentData = (yield* Ref.get(DocumentMap)).get(URIString);
			if (DocumentData) {
				yield* Ref.update(
					DocumentMap,
					(Map) => (Map.delete(URIString), Map),
				);
				yield* OnDidCloseTextDocument.Fire(DocumentData.document);
			}
		});

	/**
	 * An Effect that handles content changes to an existing model.
	 */
	const AcceptModelChanged = (UriDTO: any, ChangeEventDTO: any) =>
		Effect.gen(function* () {
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
			const DocumentData = (yield* Ref.get(DocumentMap)).get(URIString);
			if (DocumentData) {
				// The `onEvents` method expects a single event object conforming to `IModelChangedEvent`.
				const modelChangedEvent: IModelChangedEvent = {
					changes: ChangeEventDTO.changes,
					eol: ChangeEventDTO.eol,
					versionId: ChangeEventDTO.versionId,
					isUndoing: false, // Assume false if not provided
					isRedoing: false, // Assume false if not provided
				};
				DocumentData.onEvents(modelChangedEvent);

				yield* OnDidChangeTextDocument.Fire({
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
				});
			}
		});

	// --- Register Handlers ---
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler("$acceptModelAdded", ([Data]) =>
			Effect.runPromise(AcceptModelAdded(Data)),
		),
	);
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler("$acceptModelRemoved", ([Uri]) =>
			Effect.runPromise(AcceptModelRemoved(Uri)),
		),
	);
	yield* Effect.sync(() =>
		IPC.RegisterInvokeHandler("$acceptModelChanged", ([Uri, Changes]) =>
			Effect.runPromise(AcceptModelChanged(Uri, Changes)),
		),
	);

	// --- Service Implementation ---
	const DocumentImplementation: Service["Type"] = {
		get TextDocuments() {
			const Map = Effect.runSync(Ref.get(DocumentMap));
			return Array.from(Map.values()).map((data) => data.document);
		},
		onDidOpenTextDocument: OnDidOpenTextDocument.event,
		onDidCloseTextDocument: OnDidCloseTextDocument.event,
		onDidChangeTextDocument: OnDidChangeTextDocument.event,
		onDidSaveTextDocument: OnDidSaveTextDocument.event,
		GetDocument: (URI: Uri) =>
			Ref.get(DocumentMap).pipe(
				Effect.map((Map) =>
					Option.fromNullable(Map.get(URI.toString())),
				),
				Effect.map(Option.map((data) => data.document)),
			),
	};

	return DocumentImplementation;
});
