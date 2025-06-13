/**
 * @module Error (ProcessUserData)
 * @description Defines custom, tagged errors for the ProcessUserData command workflow.
 */

import { Data } from "effect";

export class ActiveEditorNotFoundError extends Data.TaggedError(
	"ActiveEditorNotFoundError",
)<{}> {
	override message = "No active text editor found. Please open a file to process.";
}

export class ProcessingServiceError extends Data.TaggedError(
	"ProcessingServiceError",
)<{
	readonly cause: unknown;
}> {
	override get message() {
		const causeMessage =
			this.cause instanceof Error
				? this.cause.message
				: String(this.cause);
		return `Failed to connect to the processing service: ${causeMessage}`;
	}
}
