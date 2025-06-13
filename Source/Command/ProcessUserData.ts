/**
 * @module ProcessUserData (Command)
 * @description The main module for the 'ProcessUserData' command.
 *
 * This orchestrates the entire workflow of getting text from the active
 * editor, sending it to a backend service for processing, and then
 * displaying the result to the user.
 */

import { Effect, pipe } from "effect";

import {
	ShowErrorMessage,
	ShowInformationMessage,
} from "../../Service/Window.js";
import { ActiveEditorNotFoundError } from "./ProcessUserData/Error.js";
import { GetActiveTextEditor } from "./ProcessUserData/GetActiveTextEditor.js";
import { GetDocumentText } from "./ProcessUserData/GetDocumentText.js";
import { InvokeProcessingService } from "./ProcessUserData/InvokeProcessingService.js";

/**
 * An `Effect` that encapsulates the entire workflow for processing user data
 * from the active text editor, demonstrating declarative, type-safe error
 * handling.
 */
export const ProcessUserData = pipe(
	Effect.gen(function* (_) {
		// Safely get the active editor, which may not exist.
		const MaybeEditor = yield* _(GetActiveTextEditor);

		// Convert the Option into an Effect that fails with our specific error if empty.
		const Editor = yield* _(
			MaybeEditor,
			Effect.mapError(() => new ActiveEditorNotFoundError()),
		);

		// If the above succeeds, the workflow proceeds.
		const TextContent = yield* _(GetDocumentText(Editor.document));
		const ProcessingResult = yield* _(InvokeProcessingService(TextContent));
		yield* _(
			ShowInformationMessage(
				`Processing complete: ${ProcessingResult.ID}`,
			),
		);
	}),
	// Declaratively handle all known, tagged failure cases for this workflow.
	Effect.catchTags({
		ActiveEditorNotFoundError: (Error) => ShowErrorMessage(Error.message),
		ProcessingServiceError: (Error) => ShowErrorMessage(Error.message),
	}),
	// Catch any other unexpected error that might have occurred, safely handling
	// the error type.
	Effect.catchAll((Error) =>
		ShowErrorMessage(
			`An unexpected error occurred: ${Error instanceof globalThis.Error ? Error.message : String(Error)}`,
		),
	),
);
