/*
 * File: Cocoon/Source/Service/Clipboard/Definition.ts
 *
 * This file contains the live implementation of the Clipboard service. It proxies
 * all clipboard operations to the Mountain host via IPC.
 */

import { Effect } from "effect";
import type { Clipboard } from "vscode";

import IPCService from "../IPC/Service.js";

/**
 * An Effect that builds the live implementation of the Clipboard service.
 */
export default Effect.gen(function* (G) {
	const IPC = yield* G(IPCService);

	/**
	 * An `Effect` that reads text from the host's clipboard.
	 */
	const ReadTextEffect = IPC.SendRequest<string>(
		"$clipboardReadText",
		[],
	).pipe(
		// Ensure we always return a string
		Effect.map((Result) => Result ?? ""),
		// On failure, return an empty string
		Effect.catchAll(() => Effect.succeed("")),
	);

	/**
	 * An `Effect` that writes text to the host's clipboard.
	 * @param Text The string to write.
	 */
	const WriteTextEffect = (Text: string) =>
		IPC.SendNotification("$clipboardWriteText", [Text]).pipe(
			// Ignore errors for fire-and-forget
			Effect.catchAll(() => Effect.void),
		);

	const ClipboardImplementation: Clipboard = {
		/**
		 * Reads text from the clipboard. This builds and runs the ReadTextEffect,
		 * returning a Promise to conform to the vscode API.
		 */
		readText: () => Effect.runPromise(ReadTextEffect),

		/**
		 * Writes text to the clipboard. This builds and runs the WriteTextEffect,
		 * returning a Promise to conform to the vscode API.
		 */
		writeText: (Text: string) => Effect.runPromise(WriteTextEffect(Text)),
	};

	return ClipboardImplementation;
});
