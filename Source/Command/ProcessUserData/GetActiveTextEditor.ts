

/**
 * @module GetActiveTextEditor
 * @description An Effect that retrieves the active VS Code text editor by
 * delegating to the Window service.
 */

import { Effect, Option } from "effect";

import WindowService from "../../Service/Window/Service.js";

/**
 * An Effect that safely retrieves the active text editor.
 * @returns An `Effect` that resolves to an `Option<vscode.TextEditor>`, which
 * will be `None` if no editor is active, and `Some` otherwise.
 */
export default Effect.gen(function* () {
	const Window = yield* WindowService;
	return Option.fromNullable(Window.activeTextEditor);
});
