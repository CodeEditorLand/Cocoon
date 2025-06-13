/**
 * @module GetActiveTextEditor
 * @description An Effect that retrieves the active VS Code text editor by
 * delegating to the Window service.
 */

import { Effect, Option } from "effect";
import type * as vscode from "vscode";

import { Window } from "../../Service/Window.js";

/**
 * An Effect that safely retrieves the active text editor.
 * @returns An `Effect` that resolves to an `Option<vscode.TextEditor>`, which
 * will be `None` if no editor is active, and `Some` otherwise.
 */
export const GetActiveTextEditor = Effect.gen(function* (_) {
	const WindowService = yield* _(Window.Tag);
	return Option.fromNullable(WindowService.activeTextEditor);
});
