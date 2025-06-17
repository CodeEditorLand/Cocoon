/*
 * File: Cocoon/Source/Service/Debug/Error/StartDebuggingError.ts
 * Responsibility: Defines a custom error type for failures when initiating debug sessions in the Cocoon sidecar, used to handle VS Code extension debugging in Land's MVP Path A implementation.
 * Modified: 2025-06-17 10:32:41 UTC
 * Dependency: effect
 * Export: StartDebuggingError
 */

import { Data } from "effect";

/**
 * An error indicating that a `startDebugging` call failed.
 */
export class StartDebuggingError extends Data.TaggedError(
	"StartDebuggingError",
)<{
	readonly cause: unknown;
}> {
	constructor(properties: { readonly cause: unknown }) {
		super(properties);
		this.message = `Failed to start debugging session.`;
	}
	public override readonly message: string;
}

export default StartDebuggingError;
