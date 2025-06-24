/*
 * File: Cocoon/Source/Service/Window/GetActiveTextDocument.ts
 * Role: A utility Effect for safely retrieving the active text document.
 * Responsibilities:
 *   - Provide a declarative and type-safe way to get the active document by
 *     using the `Workspace` service, which manages editor state.
 */

import { Effect, Option } from "effect";
import { Workspace } from "../WorkSpace/Service.js";

/**
 * An `Effect` that safely retrieves the `TextDocument` of the currently active editor.
 *
 * This utility uses the `Workspace` service, which is the source of truth for the
 * active editor state. It wraps the potentially `undefined` result of
.activeTextEditor` in an `Option`, forcing callers to explicitly
 * handle the case where no editor is active, thereby preventing runtime errors.
 *
 * @returns An `Effect` that synchronously resolves to an `Option<vscode.TextDocument>`.
 *   - `Some<TextDocument>` if an editor is active.
 *   - `None` if no editor is active.
 */
const GetActiveTextDocument = Effect.gen(function* (Generator) {
	const WorkspaceService = yield* Generator(Workspace);
	return Option.fromNullable(WorkspaceService.activeTextEditor?.document);
});

export default GetActiveTextDocument;
