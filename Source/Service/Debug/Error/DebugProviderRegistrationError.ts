/*
 * File: Cocoon/Source/Service/Debug/Error/DebugProviderRegistrationError.ts
 *
 * This file defines a custom error for failures that occur during the registration
 * of a debug provider.
 */

import { Data } from "effect";

/**
 * An error indicating that a debug provider (e.g., configuration provider or
 * adapter factory) failed to register.
 */
export class DebugProviderRegistrationError extends Data.TaggedError(
	"DebugProviderRegistrationError",
)<{
	readonly DebugType: string;
	readonly cause?: unknown;
}> {
	constructor(properties: {
		readonly DebugType: string;
		readonly cause?: unknown;
	}) {
		super(properties);
		this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
	}
	public override readonly message: string;
}

export default DebugProviderRegistrationError;
