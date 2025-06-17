/*
 * File: Cocoon/Source/Service/Debug/Error/DebugProviderRegistrationError.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:31 UTC
 * Dependency: effect
 * Export: DebugProviderRegistrationError
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
