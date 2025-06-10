/**
 * @module ExitPreventedError (PatchProcess/Error)
 * @description Defines a custom, structured error that is thrown when an extension's
 * attempt to call `process.exit` is intercepted and blocked by the host's policy.
 */

import { Data } from "effect";

/**
 * A structured, tagged error representing a blocked process termination attempt.
 *
 * This error is thrown synchronously by the patched `process.exit` function
 * to halt the execution of the misbehaving extension code.
 */
export class ExitPreventedError extends Data.TaggedError("ExitPreventedError")<{
	/** A descriptive message explaining that the exit was blocked. */
	readonly message: string;
	/** The exit code that the extension attempted to use. */
	readonly attemptedCode?: number;
}> {}
