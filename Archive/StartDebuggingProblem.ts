/**
 * @module StartDebuggingProblem
 * @description Defines a custom, tagged error for failures that occur when
 * attempting to start a debugging session.
 */

import { Data } from "effect";

/**
 * @class StartDebuggingProblem
 * @description An error indicating that a `startDebugging` call failed. This
 * could be due to an invalid configuration, a failure to launch the debug
 * adapter, or an IPC communication issue.
 */
export class StartDebuggingProblem extends Data.TaggedError(
	"StartDebuggingProblem",
)<{
	readonly Cause: unknown;
}> {
	public override readonly message: string;

	constructor(Properties: { readonly Cause: unknown }) {
		super(Properties);

		this.message = `Failed to start debugging session.`;
	}
}
