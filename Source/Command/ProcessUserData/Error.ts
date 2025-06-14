/**
 * @module Error (ProcessUserData)
 * @description Defines custom, tagged errors for the ProcessUserData command workflow.
 */

import { Data } from "effect";

/**
 * An error indicating that no text editor is currently active, preventing the
 * command from proceeding.
 */
export class ActiveEditorNotFoundError extends Data.TaggedError(
	"ActiveEditorNotFoundError",
)<{}> {
	constructor(Properties?: {}) {
		super(Properties ?? {});
		this.message =
			"No active text editor found. Please open a file to process.";
	}
	public override readonly message: string;
}

/**
 * An error indicating a failure to communicate with or receive a valid
 * response from the backend processing service.
 */
export class ProcessingServiceError extends Data.TaggedError(
	"ProcessingServiceError",
)<{
	readonly cause: unknown;
}> {
	constructor(Properties: { readonly cause: unknown }) {
		super(Properties);
		const CauseMessage =
			this.cause instanceof Error
				? this.cause.message
				: String(this.cause);
		this.message = `Failed to connect to the processing service: ${CauseMessage}`;
	}
	public override readonly message: string;
}
