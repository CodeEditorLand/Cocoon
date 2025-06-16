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
import type { IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc.js";
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
	// The map should store instances of ExtHostDocumentData.
	const DocumentMap = yield* Ref.make(new Map<string, ExtHostDocumentData>());

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
			// Step 1: Revive the DTOs into VS Code API objects.
			const RevivedURI = TypeConverter.URI.ToAPI(Data.uri);

			// Step 2: Instantiate the correct class, ExtHostDocumentData.
			const DocumentData = new ExtHostDocumentData(
				IPC.CreateProtocolAdapter() as IMessagePassingProtocol,
				RevivedURI,
				Data.lines,
				Data.eol,
				Data.versionId,
				Data.languageId,
				Data.isDirty,
				false, // isReadonly
			);

			// Step 3: Update the central document map.
			yield* Ref.update(DocumentMap, (Map) =>
				Map.set(DocumentData.document.uri.toString(), DocumentData),
			);
			// Step 4: Fire the public event with the public-facing `.document` property.
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
				// The ExtHostDocumentData class has a method to apply changes from the host.
				DocumentData.$acceptModelChanged(UriDTO, ChangeEventDTO);
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
	// Register these handlers with the dispatcher for incoming messages from Mountain.
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
		// `TextDocuments` must be a synchronous getter to match the vscode API.
		get TextDocuments() {
			const Map = Effect.runSync(Ref.get(DocumentMap));
			// Return the public `.document` part.
			return Array.from(Map.values()).map((data) => data.document);
		},

		onDidOpenTextDocument: OnDidOpenTextDocument.event,
		onDidCloseTextDocument: OnDidCloseTextDocument.event,
		onDidChangeTextDocument: OnDidChangeTextDocument.event,
		onDidSaveTextDocument: OnDidSaveTextDocument.event,

		GetDocument: (URI: Uri) =>
			Ref.get(DocumentMap).pipe(
				// Get the ExtHostDocumentData object...
				Effect.map((Map) =>
					Option.fromNullable(Map.get(URI.toString())),
				),
				// ...and extract its public `.document` property, wrapping in Option.
				Effect.map(Option.map((data) => data.document)),
			),
	};

	return DocumentImplementation;
});
