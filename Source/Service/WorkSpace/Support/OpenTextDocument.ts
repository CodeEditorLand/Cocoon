/**
 * @module OpenTextDocument (WorkSpace/Support)
 * @description An Effect for the `workspace.openTextDocument` API.
 */

import { Effect } from "effect";
import { Uri, type TextDocument } from "vscode";

import * as TypeConverter from "../../../TypeConverter/Main.js";
import type DocumentService from "../../Document/Service.js";
import type IPCService from "../../IPC/Service.js";

export default function (
	IPC: IPCService,
	Document: DocumentService,
	options?: { language?: string; content?: string } | Uri,
): Effect.Effect<TextDocument, Error> {
	return Effect.gen(function* () {
		if (options instanceof Uri) {
			const existing = yield* Document.GetDocument(options);
			if (existing) {
				return existing;
			}
			const uriDTO = TypeConverter.URI.FromAPI(options);
			yield* IPC.SendNotification("$openTextDocument", [uriDTO]);
			// A real implementation would need to wait for the document to be created.
			return yield* Effect.fail(
				new Error("Async document opening flow not fully implemented."),
			);
		} else {
			const resultDTO = yield* IPC.SendRequest<any>("$openTextDocument", [
				options,
			]);
			const uri = TypeConverter.URI.ToAPI(resultDTO.uri);
			const doc = yield* Document.GetDocument(uri);
			if (!doc) {
				return yield* Effect.fail(
					new Error(
						"Failed to find newly created untitled document.",
					),
				);
			}
			return doc;
		}
	});
}
