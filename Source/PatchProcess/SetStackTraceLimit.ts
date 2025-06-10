/**
 * @module SetStackTraceLimit (PatchProcess)
 * @description An Effect that increases the stack trace limit for more detailed debugging.
 */

import { Effect } from "effect";

import { ProcessPatchError } from "./Error/mod.js";

/**
 * An Effect that increases `Error.stackTraceLimit` to 100.
 *
 * This is a standard practice in environments like VS Code's extension host.
 * A higher limit provides more detailed stack traces when errors are thrown,
 * which can be invaluable for debugging complex call chains within extensions.
 *
 * @returns An `Effect` that resolves when the limit is set, or fails with a
 *   `ProcessPatchError`.
 */
export const SetStackTraceLimit = Effect.try({
	try: () => {
		Error.stackTraceLimit = 100;
	},
	catch: (cause) =>
		new ProcessPatchError({
			context: "SetStackTraceLimit",
			cause,
		}),
}).pipe(Effect.tap(() => Effect.logTrace("Error.stackTraceLimit set to 100.")));
