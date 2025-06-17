/*
 * File: Cocoon/Source/PatchProcess/Error/ExitPreventedError.ts
 * Responsibility: Defines a structured error type thrown when the Cocoon sidecar intercepts and blocks a VS Code extension's attempt to terminate the Node.js process, enforcing host control over extension lifecycle management.
 * Modified: 2025-06-17 21:19:35 UTC
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
