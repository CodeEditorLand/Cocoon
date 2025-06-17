/*
 * File: Cocoon/Source/Command/ProcessUserData/GetActiveTextEditor.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/Window/Service.js, effect, vscode
 */

/**
 * @module GetActiveTextEditor
 * @description An Effect that retrieves the active VS Code text editor by
 * delegating to the Window service.
 */

import { Effect, Option } from "effect";
import type { TextEditor } from "vscode";

import WindowService from "../../Service/Window/Service.js";

/**
 * An Effect that safely retrieves the active text editor.
 * @returns An `Effect` that resolves to an `Option<vscode.TextEditor>`, which
 * will be `None` if no editor is active, and `Some` otherwise.
 */
const GetActiveTextEditor: Effect.Effect<
	Option.Option<TextEditor>,
	never,
	WindowService
> = Effect.gen(function* () {
	const Window = yield* WindowService;
	return Option.fromNullable(Window.activeTextEditor);
});

export default GetActiveTextEditor;
