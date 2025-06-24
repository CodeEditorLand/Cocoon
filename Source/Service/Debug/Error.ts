/*
 * File: Cocoon/Source/Service/Debug/Error.ts
 * Role: Defines domain-specific, tagged errors for the Debug service.
 * Responsibilities:
 *   - Declare structured error types for failures related to debugging, such as
 *     provider registration or session startup.
 */

import { Data } from "effect";

/**
 * An error indicating that a `startDebugging` call failed.
 */
export class StartDebuggingProblem extends Data.TaggedError(
	"StartDebuggingProblem",
)<{
	readonly Cause: unknown;
}> {
	constructor(Properties: { readonly Cause: unknown }) {
		super(Properties);
		this.message = `Failed to start debugging session.`;
	}
	public override readonly message: string;
}

/**
 * An error indicating that a debug provider (e.g., configuration provider or
 * adapter factory) failed to register with the host.
 */
export class DebugProviderRegistrationProblem extends Data.TaggedError(
	"DebugProviderRegistrationProblem",
)<{
	readonly DebugType: string;
	readonly Cause?: unknown;
}> {
	constructor(Properties: {
		readonly DebugType: string;
		readonly Cause?: unknown;
	}) {
		super(Properties);
		this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
	}
	public override readonly message: string;
}
