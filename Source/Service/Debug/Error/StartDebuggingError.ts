/*
 * File: Cocoon/Source/Service/Debug/Error/StartDebuggingError.ts
 *
 * This file defines a custom error for failures that occur when attempting
 * to start a debugging session.
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
