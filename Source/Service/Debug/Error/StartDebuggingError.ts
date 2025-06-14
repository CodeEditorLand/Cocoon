/**
 * @module StartDebuggingError (Debug/Error)
 * @description Defines a custom error for failures when starting a debug session.
 */

import { Data } from "effect";

/**
 * An error indicating that a `startDebugging` call failed.
 */
export default class extends Data.TaggedError("StartDebuggingError")<{
	readonly cause: unknown;
}> {
	constructor(Properties: { readonly cause: unknown }) {
		super(Properties);
		this.message = `Failed to start debugging session.`;
	}
	public override readonly message: string;
}
