/**
 * @module Definition (Document)
 * @description The live implementation of the Document service.
 */

import { Context, Effect, Hub, Ref } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { TextDocument as VscTextDocument } from "vs/workbench/api/common/extHostDocuments.js";
import type { TextDocument, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter/Main.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import type DocumentEvent from "./Type.js";

export default Effect.gen(function* (_) {
	const IPC = yield* _(IPCService);
	const DocumentMap = yield* _(Ref.make(new Map<string, VscTextDocument>()));
	const EventHub = yield* _(Hub.unbounded<DocumentEvent>());

	// --- Event Emitters for the Public API ---
	const onDidOpenTextDocument = new Emitter<TextDocument>();
	const onDidCloseTextDocument = new Emitter<TextDocument>();
	const onDidChangeTextDocument = new Emitter<any>(); // TextDocumentChangeEvent
	const onDidSaveTextDocument = new Emitter<TextDocument>();

	// --- RPC Handlers (for updates FROM Mountain) ---

	const AcceptModelAdded = (Data: any) =>
		Effect.gen(function* (_) {
			const RevivedURI = TypeConverter.URI.ToAPI(Data.uri);
			const document = new VscTextDocument(
				IPC.CreateProtocolAdapter(),
				RevivedURI,
				Data.lines,
				Data.eol,
				Data.versionId,
				Data.languageId,
				Data.isDirty,
			);
			yield* _(
				Ref.update(DocumentMap, (map) =>
					map.set(document.uri.toString(), document),
				),
			);
			onDidOpenTextDocument.fire(document);
		});

	const AcceptModelRemoved = (UriDTO: any) =>
		Effect.gen(function* (_) {
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
			const Document = (yield* _(Ref.get(DocumentMap))).get(URIString);
			if (Document) {
				yield* _(
					Ref.update(
						DocumentMap,
						(map) => (map.delete(URIString), map),
					),
				);
				onDidCloseTextDocument.fire(Document);
			}
		});

	const AcceptModelChanged = (UriDTO: any, ChangeEventDTO: any) =>
		Effect.gen(function* (_) {
			const URIString = TypeConverter.URI.ToAPI(UriDTO).toString();
			const Document = (yield* _(Ref.get(DocumentMap))).get(URIString);
			if (Document) {
				// The VscTextDocument class has a method to apply changes.
				Document.$acceptEvents(ChangeEventDTO);
				onDidChangeTextDocument.fire({
					document: Document,
					contentChanges: ChangeEventDTO.changes.map(
						(change: any) => ({
							range: TypeConverter.Range.ToAPI(change.range),
							rangeOffset: change.rangeOffset,
							rangeLength: change.rangeLength,
							text: change.text,
						}),
					),
					reason: ChangeEventDTO.reason,
				});
			}
		});

	// Register these handlers with the dispatcher
	IPC.RegisterInvokeHandler("$acceptModelAdded", ([data]) =>
		Effect.runPromise(AcceptModelAdded(data)),
	);
	IPC.RegisterInvokeHandler("$acceptModelRemoved", ([uri]) =>
		Effect.runPromise(AcceptModelRemoved(uri)),
	);
	IPC.RegisterInvokeHandler("$acceptModelChanged", ([uri, changes]) =>
		Effect.runPromise(AcceptModelChanged(uri, changes)),
	);

	const ServiceImplementation: Context.Tag.Service<any> = {
		get TextDocuments() {
			// This is a synchronous getter for API compatibility. It's safe for Ref.
			return Array.from(
				Ref.get(DocumentMap).pipe(Effect.runSync).values(),
			);
		},

		onDidOpenTextDocument: onDidOpenTextDocument.event,
		onDidCloseTextDocument: onDidCloseTextDocument.event,
		onDidChangeTextDocument: onDidChangeTextDocument.event,
		onDidSaveTextDocument: onDidSaveTextDocument.event,

		GetDocument: (URI: Uri) =>
			Ref.get(DocumentMap).pipe(
				Effect.map((map) => map.get(URI.toString())),
			),
	};

	return ServiceImplementation;
});
