/**
 * @module Definition (Clipboard)
 * @description The live implementation of the Clipboard service.
 */

import { Effect } from "effect";
import type { Clipboard } from "vscode";

import { IpcProvider } from "../Ipc.js";

/**
 * An Effect that builds the live implementation of the Clipboard service.
 */
export const Definition = Effect.gen(function* (_) {
	const Ipc = yield* _(IpcProvider.Tag);

	/**
	 * An Effect that reads text from the host's clipboard.
	 */
	const ReadTextEffect = Ipc.SendRequest<string>(
		"env_clipboardReadText",
		{},
	).pipe(
		Effect.map((result) => result || ""), // Ensure we always return a string
		Effect.catchAll(() => Effect.succeed("")), // On failure, return an empty string
	);

	/**
	 * An Effect that writes text to the host's clipboard.
	 * @param Text - The string to write.
	 */
	const WriteTextEffect = (Text: string) =>
		Ipc.SendNotification("env_clipboardWriteText", { Text }).pipe(
			Effect.catchAll(() => Effect.unit), // Ignore errors for fire-and-forget
		);

	const ServiceImplementation: Clipboard = {
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

	return ServiceImplementation;
});
