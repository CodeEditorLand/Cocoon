/**
 * @module DebugProviderRegistrationError (Debug/Error)
 * @description Defines a custom error for debug provider registration failures.
 */

import { Data } from "effect";

/**
 * An error indicating that a debug provider (e.g., configuration provider or
 * adapter factory) failed to register.
 */
export default class extends Data.TaggedError(
	"DebugProviderRegistrationError",
)<{
	readonly DebugType: string;
	readonly cause?: unknown;
}> {
	constructor(Properties: {
		readonly DebugType: string;
		readonly cause?: unknown;
	}) {
		super(Properties);
		this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
	}
	public override readonly message: string;
}
