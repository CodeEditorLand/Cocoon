/*
 * File: Cocoon/Source/Command/ProcessUserData/Error.ts
 * Responsibility: Defines custom tagged errors for the ProcessUserData command workflow in the Cocoon sidecar, providing structured error handling for editor availability and backend service communication failures through the Vine IPC layer.
 * Modified: 2025-06-17 21:19:46 UTC
 * Dependency: effect
 * Export: ActiveEditorNotFoundError, ProcessingServiceError
 */

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
	public override readonly message: string;
	constructor() {
		super();
		this.message =
			"No active text editor found. Please open a file to process.";
	}
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
	public override readonly message: string;
	constructor(Properties: { readonly cause: unknown }) {
		super(Properties);
		const CauseMessage =
			this.cause instanceof Error
				? this.cause.message
				: String(this.cause);
		this.message = `Failed to connect to the processing service: ${CauseMessage}`;
	}
}
