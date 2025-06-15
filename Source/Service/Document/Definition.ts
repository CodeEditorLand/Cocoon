/**
 * @module Definition (Document)
 * @description The live implementation of the Document service.
 */

import { Effect, Ref } from "effect";
import { TextDocument as VscTextDocument } from "vs/workbench/api/common/extHostDocuments.js";
import type { TextDocument, TextDocumentChangeEvent, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import type Service from "./Service.js";

/**
 * An Effect that builds the live implementation of the Document service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;
	const DocumentMap = yield* Ref.make(new Map<string, VscTextDocument>());

	// --- Event Emitters for the Public API ---
	const OnDidOpenTextDocument = CreateEventStream<TextDocument>();
	const OnDidCloseTextDocument = CreateEventStream<TextDocument>();
	const OnDidChangeTextDocument =
		CreateEventStream<TextDocumentChangeEvent>();
	const OnDidSaveTextDocument = CreateEventStream<TextDocument>();

	// --- RPC Handlers (for updates FROM Mountain) ---

	const AcceptModelAdded = (Data: any) =>
		Effect.gen(function* () {
			const RevivedURI = TypeConverter.URI.ToAPI(Data.uri);
			const Document = new VscTextDocument(
				IPC.CreateProtocolAdapter(),
				RevivedURI,
				Data.lines,
				Data.eol,
				Data.versionId,
				Data.languageId,
				Data.isDirty,
			);
			yield* Ref.update(DocumentMap, (Map) =>
				Map.set(Document.uri.toString(), Document),
			);
			yield* OnDidOpenTextDocument.Fire(Document);
		});

	const AcceptModelRemoved = (UriDTO: any) =>
		Effect.gen(function* () {
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
			const Document = (yield* Ref.get(DocumentMap)).get(URIString);
			if (Document) {
				yield* Ref.update(
					DocumentMap,
					(Map) => (Map.delete(URIString), Map),
				);
				yield* OnDidCloseTextDocument.Fire(Document);
			}
		});

	const AcceptModelChanged = (UriDTO: any, ChangeEventDTO: any) =>
		Effect.gen(function* () {
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
			const Document = (yield* Ref.get(DocumentMap)).get(URIString);
			if (Document) {
				// The VscTextDocument class has a method to apply changes.
				Document.$acceptEvents(ChangeEventDTO);
				yield* OnDidChangeTextDocument.Fire({
					document: Document,
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

	// Register these handlers with the dispatcher
	IPC.RegisterInvokeHandler("$acceptModelAdded", ([Data]) =>
		Effect.runPromise(AcceptModelAdded(Data)),
	);
	IPC.RegisterInvokeHandler("$acceptModelRemoved", ([Uri]) =>
		Effect.runPromise(AcceptModelRemoved(Uri)),
	);
	IPC.RegisterInvokeHandler("$acceptModelChanged", ([Uri, Changes]) =>
		Effect.runPromise(AcceptModelChanged(Uri, Changes)),
	);

	const DocumentImplementation: Service = {
		get TextDocuments() {
			// This is a synchronous getter for API compatibility. It's safe for Ref.
			return Array.from(Effect.runSync(Ref.get(DocumentMap)).values());
		},

		onDidOpenTextDocument: OnDidOpenTextDocument.event,
		onDidCloseTextDocument: OnDidCloseTextDocument.event,
		onDidChangeTextDocument: OnDidChangeTextDocument.event,
		onDidSaveTextDocument: OnDidSaveTextDocument.event,

		GetDocument: (URI: Uri) =>
			Ref.get(DocumentMap).pipe(
				Effect.map((Map) => Map.get(URI.toString())),
			),
	};

	return DocumentImplementation;
});
