/**
 * @module OpenTextDocument (WorkSpace/Support)
 * @description An Effect for the `workspace.openTextDocument` API.
 */

import { Effect } from "effect";
import { Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import type { Document } from "../../Document/Service.js";
import type { IPC } from "../../IPC.js";

export function OpenTextDocument(
	IPCService: IPC.Interface,
	DocumentService: Document.Interface,
	options?: { language?: string; content?: string } | Uri,
) {
	return Effect.gen(function* (_) {
		if (options instanceof Uri) {
			// Check if document is already open
			const existing = yield* _(DocumentService.GetDocument(options));
			if (existing) {
				return existing;
			}
			// Request host to open the document
			const uriDTO = TypeConverter.URIConverter.FromAPI(options);
			yield* _(
				IPCService.SendNotification("$openTextDocument", [uriDTO]),
			);
			// Now we must wait for the document to be created via the
			// $acceptModelAdded event. This requires a more complex async
			// mechanism, like a barrier or a promise resolver map.
			// This is a simplified placeholder.
			return yield* _(
				Effect.fail(
					new Error(
						"Async document opening flow not fully implemented.",
					),
				),
			);
		} else {
			// Open an untitled document with optional content/language
			const resultDTO = yield* _(
				IPCService.SendRequest<any>("$openTextDocument", [options]),
			);
			const uri = TypeConverter.URIConverter.ToAPI(resultDTO.uri);
			const doc = yield* _(DocumentService.GetDocument(uri));
			if (!doc) {
				return yield* _(
					Effect.fail(
						new Error(
							"Failed to find newly created untitled document.",
						),
					),
				);
			}
			return doc;
		}
	});
}
