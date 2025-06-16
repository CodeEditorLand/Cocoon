/*
 * File: Cocoon/Source/Service/WorkSpace/Support/OpenTextDocument.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:44 UTC
 * Dependency: ../../../TypeConverter/Main.js, ../../Document/Service.js, ../../IPC/Service.js, effect, vscode
 */

/**
 * @module OpenTextDocument (WorkSpace/Support)
 * @description An Effect for the `workspace.openTextDocument` API.
 */

import { Effect, Option } from "effect";
import { Uri, type TextDocument } from "vscode";

import * as TypeConverter from "../../../TypeConverter/Main.js";
import type DocumentService from "../../Document/Service.js";
import type IPCService from "../../IPC/Service.js";

export default function (
	IPC: IPCService["Type"],
	Document: DocumentService["Type"],
	options?: { language?: string; content?: string } | Uri,
): Effect.Effect<TextDocument, Error> {
	return Effect.gen(function* () {
		if (options instanceof Uri) {
			const Existing = yield* Document.GetDocument(options);
			if (Option.isSome(Existing)) {
				return Existing.value;
			}
			const UriDTO = TypeConverter.URI.FromAPI(options);
			yield* IPC.SendNotification("$openTextDocument", [UriDTO]);
			// A real implementation would need to wait for the document to be created.
			// This part of the logic needs a more robust way to await the '$acceptModelAdded' event.
			return yield* Effect.fail(
				new Error("Async document opening flow not fully implemented."),
			);
		} else {
			const ResultDTO = yield* IPC.SendRequest<any>("$openTextDocument", [
				options,
			]);
			const uri = TypeConverter.URI.ToAPI(ResultDTO.uri);
			const Doc = yield* Document.GetDocument(uri);
			return yield* Option.match(Doc, {
				onSome: (doc) => Effect.succeed(doc),
				onNone: () =>
					Effect.fail(
						new Error(
							"Failed to find newly created untitled document.",
						),
					),
			});
		}
	});
}
