/*
 * File: Cocoon/Source/Service/Debug/Error/DebugProviderRegistrationError.ts
 * Responsibility: Defines a custom error for debug provider registration failures.
 *
 * Last-Modified: 2025-06-18
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
