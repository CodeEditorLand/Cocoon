/**
 * @module GetActiveTextEditor
 * @description An Effect that retrieves the active VS Code text editor.
 */

import { Effect, Option } from "effect";
import * as VSCode from "vscode";

/**
 * An Effect that safely retrieves the active text editor.
 * @returns An `Effect` that resolves to an `Option<VSCode.TextEditor>`, which
 * will be `None` if no editor is active, and `Some` otherwise.
 */
export const GetActiveTextEditor = Effect.sync(() =>
	Option.fromNullable(VSCode.window.activeTextEditor),
);
