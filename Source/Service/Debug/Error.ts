/**
 * @module Error (Debug)
 * @description Defines custom, tagged errors for the Debug service.
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
	override get message() {
		return `Failed to register debug provider for type '${this.DebugType}'.`;
	}
}

/**
 * An error indicating that a `startDebugging` call failed.
 */
export class StartDebuggingError extends Data.TaggedError(
	"StartDebuggingError",
)<{
	readonly cause: unknown;
}> {
	override get message() {
		return `Failed to start debugging session.`;
	}
}
