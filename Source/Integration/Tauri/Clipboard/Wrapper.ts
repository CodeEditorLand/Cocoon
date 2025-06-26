/**
 * @module Wrapper
 * @description Defines Effect-based wrappers for Tauri's clipboard plugin.
 */

import { Effect } from "effect";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { IntegrationClipboardProblem } from "./Problem.js";

/**
 * An Effect that wraps the Tauri `clipboard.writeText` command.
 */
export const WriteText = (
	text: string,
): Effect.Effect<void, IntegrationClipboardProblem> =>
	Effect.tryPromise({
		try: () => writeText(text),
		catch: (Cause) => new IntegrationClipboardProblem({ Cause }),
	});

/**
 * An Effect that wraps the Tauri `clipboard.readText` command.
 */
export const ReadText: Effect.Effect<string, IntegrationClipboardProblem> =
	Effect.tryPromise({
		try: () => readText(),
		catch: (Cause) => new IntegrationClipboardProblem({ Cause }),
	});
