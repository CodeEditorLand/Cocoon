/**
 * @module Definition (Clipboard)
 * @description The live implementation of the Clipboard service. It proxies
 * all clipboard operations to the Mountain host via IPC.
 */

import { Effect } from "effect";
import type { Clipboard } from "vscode";

import { IPC } from "../IPC.js";

/**
 * An Effect that builds the live implementation of the Clipboard service.
 */
export const Definition = Effect.gen(function* (_) {
	const IPCService = yield* _(IPC.Tag);

	/**
	 * An Effect that reads text from the host's clipboard.
	 */
	const ReadText = IPCService.SendRequest<string>(
		"$clipboardReadText",
		[],
	).pipe(
		Effect.map((result) => result ?? ""), // Ensure we always return a string
		Effect.catchAll(() => Effect.succeed("")), // On failure, return an empty string
	);

	/**
	 * An Effect that writes text to the host's clipboard.
	 * @param Text The string to write.
	 */
	const WriteText = (Text: string) =>
		IPCService.SendNotification("$clipboardWriteText", [Text]).pipe(
			Effect.catchAll(() => Effect.unit), // Ignore errors for fire-and-forget
		);

	const ServiceImplementation: Clipboard = {
		/**
		 * Reads text from the clipboard. This builds and runs the ReadText Effect,
		 * returning a Promise to conform to the vscode API.
		 */
		readText: () => Effect.runPromise(ReadText),

		/**
		 * Writes text to the clipboard. This builds and runs the WriteText Effect,
		 * returning a Promise to conform to the vscode API.
		 */
		writeText: (Text: string) => Effect.runPromise(WriteText(Text)),
	};

	return ServiceImplementation;
});
