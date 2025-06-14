/**
 * @module OpenTextDocument (WorkSpace/Support)
 * @description An Effect for the `workspace.openTextDocument` API.
 */

import { Effect } from "effect";
import { Uri } from "vscode";

import * as TypeConverter from "../../../TypeConverter.js";
import type { Document as DocumentServiceType } from "../../Document/Service.js";
import type { IPC as IPCType } from "../../IPC.js";

export function OpenTextDocument(
	IPCService: IPCType.Interface,
	DocumentService: DocumentServiceType.Interface,
	options?: { language?: string; content?: string } | Uri,
) {
	return Effect.gen(function* () {
		if (options instanceof Uri) {
			const existing = yield* DocumentService.GetDocument(options);
			if (existing) {
				return existing;
			}
			const uriDTO = TypeConverter.URIConverter.fromAPI(options);
			yield* IPCService.SendNotification("$openTextDocument", [uriDTO]);
			// A real implementation would need to wait for the document to be created.
			return yield* Effect.fail(
				new Error("Async document opening flow not fully implemented."),
			);
		} else {
			const resultDTO = yield* IPCService.SendRequest<any>(
				"$openTextDocument",
				[options],
			);
			const uri = TypeConverter.URIConverter.toAPI(resultDTO.uri);
			const doc = yield* DocumentService.GetDocument(uri);
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
