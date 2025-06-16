/*
 * File: Cocoon/Source/Command/ProcessUserData.ts
 * Responsibility:
 * Modified: 2025-06-16 14:55:29 UTC
 * Dependency: ../Service/Window/ShowInformationMessage.js, ./ProcessUserData/GetActiveTextEditor.js, ./ProcessUserData/GetDocumentText.js, ./ProcessUserData/InvokeProcessingService.js, effect
 */

/**
 * @module ProcessUserData (Command)
 * @description The main module for the 'ProcessUserData' command.
 *
 * This orchestrates the entire workflow of getting text from the active
 * editor, sending it to a backend service for processing, and then
 * displaying the result to the user.
 */

import { Effect } from "effect";

import ShowInformationMessage from "../Service/Window/ShowInformationMessage.js";
import { ActiveEditorNotFoundError } from "./ProcessUserData/Error.js";
import GetActiveTextEditor from "./ProcessUserData/GetActiveTextEditor.js";
import GetDocumentText from "./ProcessUserData/GetDocumentText.js";
import InvokeProcessingService from "./ProcessUserData/InvokeProcessingService.js";

/**
 * An `Effect` that encapsulates the entire workflow for processing user data
 * from the active text editor, demonstrating declarative, type-safe error
 * handling.
 */
export default Effect.gen(function* () {
	// Safely get the active editor, which may not exist.
	const MaybeEditor = yield* GetActiveTextEditor;

	// Convert the Option into an Effect that fails with our specific error if empty.
	const Editor = yield* Effect.mapError(
		MaybeEditor,
		() => new ActiveEditorNotFoundError(),
	);

	// If the above succeeds, the workflow proceeds.
	const TextContent = yield* GetDocumentText(Editor.document);
	const ProcessingResult = yield* InvokeProcessingService(TextContent);
	yield* ShowInformationMessage(
		`Processing complete: ${ProcessingResult.ID}`,
	);
}).pipe(
	// Declaratively handle all known, tagged failure cases for this workflow.
	Effect.catchTags({
		ActiveEditorNotFoundError: (Error) =>
			ShowInformationMessage(Error.message),
		ProcessingServiceError: (Error) =>
			ShowInformationMessage(Error.message),
	}),
	// Catch any other unexpected error that might have occurred, safely handling
	// the error type.
	Effect.catchAll((Error) =>
		ShowInformationMessage(
			`An unexpected error occurred: ${
				Error instanceof globalThis.Error
					? Error.message
					: String(Error)
			}`,
		),
	),
);
