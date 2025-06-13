/**
 * @module GetActiveTextDocument
 * @description An Effect-based utility for safely retrieving the active text document.
 */

import { Effect, Option } from "effect";
import * as VSCode from "vscode";

/**
 * An Effect that safely retrieves the `TextDocument` of the currently active editor.
 *
 * This Effect wraps the potentially `undefined` result of `vscode.window.activeTextEditor`
 * in an `Option`. This forces callers to explicitly handle the case where no editor
 * is active, preventing runtime errors.
 *
 * @returns An `Effect` that synchronously resolves to an `Option<VSCode.TextDocument>`.
 *   - `Some<TextDocument>` if an editor is active.
 *   - `None` if no editor is active.
 */
export const GetActiveTextDocument = Effect.sync(() =>
	Option.fromNullable(VSCode.window.activeTextEditor?.document),
);
