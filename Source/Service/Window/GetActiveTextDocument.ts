/*
 * File: Cocoon/Source/Service/Window/GetActiveTextDocument.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:46 UTC
 * Dependency: ./Service.js, effect, vscode
 */

/**
 * @module GetActiveTextDocument
 * @description An Effect-based utility for safely retrieving the active text document.
 * This is an internal helper, not a service.
 */

import { Effect, Option } from "effect";
import type { TextDocument } from "vscode";

import WindowService from "./Service.js";

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
const GetActiveTextDocument: Effect.Effect<
	Option.Option<TextDocument>,
	never,
	WindowService
> = Effect.gen(function* () {
	const Window = yield* WindowService;
	return Option.fromNullable(Window.activeTextEditor?.document);
});

export default GetActiveTextDocument;
