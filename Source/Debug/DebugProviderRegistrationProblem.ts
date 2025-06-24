/**
 * @module DebugProviderRegistrationProblem
 * @description Defines a custom, tagged error for failures that occur during
 * the registration of a debug provider.
 */

import { Data } from "effect";

/**
 * @class DebugProviderRegistrationProblem
 * @description An error indicating that a debug provider (e.g., a configuration
 * provider or debug adapter factory) failed to register with the host process.
 */
export class DebugProviderRegistrationProblem extends Data.TaggedError(
	"DebugProviderRegistrationProblem",
)<{
	readonly DebugType: string;
	readonly Cause?: unknown;
}> {
	public override readonly message: string;
	constructor(Properties: {
		readonly DebugType: string;
		readonly Cause?: unknown;
	}) {
		super(Properties);
		this.message = `Failed to register debug provider for type '${this.DebugType}'.`;
	}
}
