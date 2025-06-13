/**
 * @module GetActiveTextDocument
 * @description An Effect-based utility for safely retrieving the active text document.
 * This is an internal helper, not a service.
 */

import { Effect, Option } from "effect";
import type * as vscode from "vscode";

import { Window } from "./Service.js";

/**
 * An Effect that safely retrieves the `TextDocument` of the currently active editor.
 *
 * This Effect wraps the potentially `undefined` result of `vscode.window.activeTextEditor`
 * in an `Option`. This forces callers to explicitly handle the case where no editor
 * is active, preventing runtime errors.
 *
 * @returns An `Effect` that synchronously resolves to an `Option<vscode.TextDocument>`.
 *   - `Some<TextDocument>` if an editor is active.
 *   - `None` if no editor is active.
 */
export const GetActiveTextDocument = Effect.gen(function* (_) {
	const WindowService = yield* _(Window.Tag);
	return Option.fromNullable(WindowService.activeTextEditor?.document);
});
