/*
 * File: Cocoon/Source/Service/Clipboard/Definition.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:16 UTC
 * Dependency: ../IPC/Service.js, effect, vscode
 */

/**
 * @module Definition (Clipboard)
 * @description The live implementation of the Clipboard service. It proxies
 * all clipboard operations to the Mountain host via IPC.
 */

import { Effect } from "effect";
import type { Clipboard } from "vscode";

import IPCService from "../IPC/Service.js";

/**
 * An Effect that builds the live implementation of the Clipboard service.
 */
export default Effect.gen(function* () {
	const IPC = yield* IPCService;

	/**
	 * An Effect that reads text from the host's clipboard.
	 */
	const ReadText = IPC.SendRequest<string>("$clipboardReadText", []).pipe(
		Effect.map((Result) => Result ?? ""), // Ensure we always return a string
		Effect.catchAll(() => Effect.succeed("")), // On failure, return an empty string
	);

	/**
	 * An Effect that writes text to the host's clipboard.
	 * @param Text The string to write.
	 */
	const WriteText = (Text: string) =>
		IPC.SendNotification("$clipboardWriteText", [Text]).pipe(
			Effect.catchAll(() => Effect.void), // Ignore errors for fire-and-forget
		);

	const ClipboardImplementation: Clipboard = {
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

	return ClipboardImplementation;
});
