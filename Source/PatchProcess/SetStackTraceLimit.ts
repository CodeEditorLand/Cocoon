/*
 * File: Cocoon/Source/PatchProcess/SetStackTraceLimit.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:53:04 UTC
 * Dependency: effect
 */

/**
 * @module SetStackTraceLimit
 * @description An Effect that increases the stack trace limit for better
 * debugging of complex, asynchronous operations.
 */
import { Effect } from "effect";

/**
 * An Effect that sets `Error.stackTraceLimit` to 100.
 *
 * The default stack trace limit in V8/Node.js is often too low (e.g., 10)
 * to be useful for debugging deep, recursive, or highly-composed Effect
 * workflows. This synchronous side effect increases the limit to provide more
 * detailed stack traces when errors occur.
 *
 * This should be run once at the very beginning of the application's lifecycle.
 */
const SetStackTraceLimit = Effect.sync(() => {
	Error.stackTraceLimit = 100;
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Increased `Error.stackTraceLimit` to 100."),
	),
);

export default SetStackTraceLimit;
