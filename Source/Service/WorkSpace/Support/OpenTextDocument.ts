/*
 * File: Cocoon/Source/Service/WorkSpace/Support/OpenTextDocument.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:07 UTC
 * Dependency: ../../../TypeConverter/Main/URI.js, ../../Document/Service.js, ../../IPC/Service.js, effect, vscode
 */

/**
 * @module OpenTextDocument (WorkSpace/Support)
 * @description An Effect for the `workspace.openTextDocument` API.
 */

import { Effect, Option } from "effect";
import { Uri, type TextDocument } from "vscode";

import URIConverter from "../../../TypeConverter/Main/URI.js";
import type DocumentService from "../../Document/Service.js";
import type IPCService from "../../IPC/Service.js";

/**
 * An Effect that handles the logic for opening a text document.
 * @param IPC The IPC service for communication.
 * @param Document The Document service to check for existing documents.
 * @param options The URI or options for the document to open.
 * @returns An `Effect` that resolves to the opened `TextDocument`.
 */
export default (
	IPC: IPCService["Type"],
	Document: DocumentService["Type"],
	options?: { language?: string; content?: string } | Uri,
): Effect.Effect<TextDocument, Error> =>
	Effect.gen(function* (G) {
		if (options instanceof Uri) {
			const Existing = yield* G(Document.GetDocument(options));

			if (Option.isSome(Existing)) {
				return Existing.value;
			}

			const UriDTO = URIConverter.FromAPI(options);

			yield* G(IPC.SendNotification("$openTextDocument", [UriDTO]));

			// TODO: A robust implementation would need to wait for the '$acceptModelAdded'
			// event for this specific URI before proceeding. This requires a more complex
			// event-driven flow, potentially using a Deferred or PubSub.
			return yield* G(
				Effect.fail(
					new Error(
						"Async document opening flow not fully implemented.",
					),
				),
			);
		} else {
			const ResultDTO = yield* G(
				IPC.SendRequest<any>("$openTextDocument", [options]),
			);

			const uri = URIConverter.ToAPI(ResultDTO.uri);

			const Doc = yield* G(Document.GetDocument(uri));

			return yield* G(
				Option.match(Doc, {
					onSome: (doc) => Effect.succeed(doc),
					onNone: () =>
						Effect.fail(
							new Error(
								"Failed to find newly created untitled document.",
							),
						),
				}),
			);
		}
	});
