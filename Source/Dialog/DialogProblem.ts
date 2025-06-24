/**
 * @module DialogProblem
 * @description Defines a custom, tagged error for failures that occur
 * during a dialog operation (e.g., showOpenDialog).
 */

import { Data } from "effect";

/**
 * @class DialogProblem
 * @description An error indicating that a dialog operation failed. This is a generic
 * wrapper for IPC or other underlying errors, providing context for debugging.
 */
export class DialogProblem extends Data.TaggedError("DialogProblem")<{
	readonly Cause: unknown;
	readonly context: string;
}> {
	public override readonly message: string;
	constructor(Properties: {
		readonly Cause: unknown;
		readonly context: string;
	}) {
		super(Properties);
		this.message = `Dialog operation failed: ${this.context}`;
	}
}
