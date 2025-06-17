/*
 * File: Cocoon/Source/Command/ProcessUserData/GetActiveTextEditor.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:46 UTC
 * Dependency: ../../Service/WorkSpace/Service.js, effect
 */

/**
 * @module GetActiveTextEditor
 * @description An Effect that retrieves the active VS Code text editor by
 * delegating to the WorkSpace service.
 */

import { Effect, Option } from "effect";

import WorkSpaceService from "../../Service/WorkSpace/Service.js"; // FIX: Changed from WindowService to WorkSpaceService

/**
 * An Effect that safely retrieves the active text editor.
 * @returns An `Effect` that resolves to an `Option<vscode.TextEditor>`, which
 * will be `None` if no editor is active, and `Some` otherwise.
 */
export default Effect.gen(function* () {
	const WorkSpace = yield* WorkSpaceService; // FIX: Use WorkSpaceService
	return Option.fromNullable(WorkSpace.activeTextEditor);
});
