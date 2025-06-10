/**
 * @module Error (ProcessUserData)
 * @description Defines custom, tagged errors for the ProcessUserData command workflow.
 */

import { Data } from "effect";

export class ActiveEditorNotFoundError extends Data.TaggedError(
	"ActiveEditorNotFoundError",
)<{}> {
	message = "No active text editor found. Please open a file to process.";
}

export class ProcessingServiceError extends Data.TaggedError(
	"ProcessingServiceError",
)<{
	readonly cause: unknown;
}> {
	get message() {
		return `Failed to connect to the processing service: ${this.cause}`;
	}
}
