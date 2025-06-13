/**
 * @module Definition (Document)
 * @description The live implementation of the Document service.
 */

import { Effect, Hub, Ref, Stream } from "effect";
import { Emitter } from "vs/base/common/event.js";
import { TextDocument as VscTextDocument } from "vs/workbench/api/common/extHostDocuments.js";
import type { TextDocument, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IPC } from "../IPC.js";
import type { Interface } from "./Service.js";
import type { DocumentEvent } from "./Type.js";

export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);
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
			const revivedURI = TypeConverter.URIConverter.ToAPI(Data.uri);
			const document = new VscTextDocument(
				IPCService.CreateProtocolAdapter(),
				revivedURI,
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
			const URIString =
				TypeConverter.URIConverter.ToAPI(UriDTO).toString();
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
			const URIString =
				TypeConverter.URIConverter.ToAPI(UriDTO).toString();
			const Document = (yield* _(Ref.get(DocumentMap))).get(URIString);
			if (Document) {
				// The VscTextDocument class has a method to apply changes.
				Document.$acceptEvents(ChangeEventDTO);
				onDidChangeTextDocument.fire({
					document: Document,
					contentChanges: ChangeEventDTO.changes.map(
						(change: any) => ({
							range: TypeConverter.RangeConverter.ToAPI(
								change.range,
							),
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
	IPCService.RegisterInvokeHandler("$acceptModelAdded", ([data]) =>
		Effect.runPromise(AcceptModelAdded(data)),
	);
	IPCService.RegisterInvokeHandler("$acceptModelRemoved", ([uri]) =>
		Effect.runPromise(AcceptModelRemoved(uri)),
	);
	IPCService.RegisterInvokeHandler("$acceptModelChanged", ([uri, changes]) =>
		Effect.runPromise(AcceptModelChanged(uri, changes)),
	);

	const ServiceImplementation: Interface = {
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
