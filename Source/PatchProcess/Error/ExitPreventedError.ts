/*
 * File: Cocoon/Source/PatchProcess/Error/ExitPreventedError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:20 UTC
 * Dependency: effect
 * Export: extends
 */

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
export default class extends Data.TaggedError("ExitPreventedError")<{
	/** A descriptive message explaining that the exit was blocked. */
	readonly message: string;
	/** The exit code that the extension attempted to use. */
	readonly AttemptedCode?: number;
}> {}
