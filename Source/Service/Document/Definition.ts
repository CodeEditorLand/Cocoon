/**
 * @module Definition (Documents)
 * @description The live implementation of the Document service.
 */

import { Effect, Hub, Ref, Stream } from "effect";
import type { TextDocument, Uri } from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { IPCProvider } from "../IPC.js";
import type { Interface } from "./Service.js";
import type { DocumentEvent } from "./Type.js";

export const Definition = Effect.gen(function* (_) {
	const IPC = yield* _(IPCProvider.Tag);
	const DocumentMap = yield* _(Ref.make(new Map<string, TextDocument>()));
	const EventHub = yield* _(Hub.unbounded<DocumentEvent>());

	// --- RPC Handlers (for updates FROM Mountain) ---

	const AcceptModelAdded = (Data: any) =>
		Effect.gen(function* (_) {
			const Doc = TypeConverter.TextDocument.fromDTO(Data);
			yield* _(
				Ref.update(DocumentMap, (map) =>
					map.set(Doc.uri.toString(), Doc),
				),
			);
			yield* _(Hub.publish(EventHub, { _tag: "Open", Document: Doc }));
		});

	const AcceptModelRemoved = (UriDTO: any) =>
		Effect.gen(function* (_) {
			const Uri = TypeConverter.Uri.fromDTO(UriDTO);
			const Doc = (yield* _(Ref.get(DocumentMap))).get(Uri.toString());
			if (Doc) {
				yield* _(
					Ref.update(
						DocumentMap,
						(map) => (map.delete(Uri.toString()), map),
					),
				);
				yield* _(
					Hub.publish(EventHub, { _tag: "Close", Document: Doc }),
				);
			}
		});

	const AcceptModelChanged = (UriDTO: any, ChangeEventDTO: any) =>
		Effect.gen(function* (_) {
			const Uri = TypeConverter.Uri.fromDTO(UriDTO);
			const Doc = (yield* _(Ref.get(DocumentMap))).get(Uri.toString());
			if (Doc) {
				// A real implementation would update the document content here.
				const ChangeEvent =
					TypeConverter.TextDocumentChangeEvent.fromDTO(
						Doc,
						ChangeEventDTO,
					);
				yield* _(
					Hub.publish(EventHub, {
						_tag: "Change",
						Event: ChangeEvent,
					}),
				);
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

	const ServiceImplementation: Interface = {
		get TextDocuments() {
			// This is a synchronous getter for API compatibility. It's safe for Ref.
			return Array.from(
				Ref.get(DocumentMap).pipe(Effect.runSync).values(),
			);
		},

		OnDidOpenTextDocument: Stream.fromHub(EventHub).pipe(
			Stream.filter(
				(e): e is Extract<DocumentEvent, { _tag: "Open" }> =>
					e._tag === "Open",
			),
			Stream.map((e) => e.Document),
		),
		OnDidCloseTextDocument: Stream.fromHub(EventHub).pipe(
			Stream.filter(
				(e): e is Extract<DocumentEvent, { _tag: "Close" }> =>
					e._tag === "Close",
			),
			Stream.map((e) => e.Document),
		),
		OnDidChangeTextDocument: Stream.fromHub(EventHub).pipe(
			Stream.filter(
				(e): e is Extract<DocumentEvent, { _tag: "Change" }> =>
					e._tag === "Change",
			),
			Stream.map((e) => e.Event),
		),
		OnDidSaveTextDocument: Stream.fromHub(EventHub).pipe(
			Stream.filter(
				(e): e is Extract<DocumentEvent, { _tag: "Save" }> =>
					e._tag === "Save",
			),
			Stream.map((e) => e.Document),
		),

		GetDocument: (Uri: Uri) =>
			Ref.get(DocumentMap).pipe(
				Effect.map((map) => map.get(Uri.toString())),
			),
	};

	return ServiceImplementation;
});
