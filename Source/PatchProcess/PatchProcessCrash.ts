/**
 * @module PatchProcessCrash (PatchProcess)
 * @description An Effect that patches the Electron-specific `process.crash` function
 * to prevent extensions from terminating the host process.
 */

import { Effect } from "effect";

import { ProcessPatch } from "./ProcessPatch/mod.js";

/**
 * An Effect that replaces the `process.crash()` function if it exists.
 *
 * This patch is a critical reliability measure. In an Electron environment,
 * extensions could potentially call `process.crash()` to terminate the host.
 * This patched function intercepts the call, logs a detailed warning with a
 * stack trace of the caller, and prevents the actual crash from occurring,
 * allowing the Cocoon process to remain stable.
 *
 * It depends on the `ProcessPatch` service to safely access the original
 * native `crash` function.
 */
export const PatchProcessCrash = Effect.gen(function* (_) {
	const { NativeCrash } = yield* _(ProcessPatch.Tag);

	if (NativeCrash) {
		// Overwrite the global `process.crash` method.
		(process as any).crash = (): void => {
			// We create a new Error here just to capture the current stack trace.
			// This helps identify which code path attempted to call `crash()`.
			const PreventionStack = new Error(
				"Stack trace for prevented process.crash()",
			).stack;

			// The log must be run synchronously because `process.crash` is a sync function.
			Effect.runSync(
				Effect.logWarning(
					`A call to 'process.crash()' was intercepted and PREVENTED by host policy.`,
					`Call stack for prevented crash:\n${PreventionStack ?? "(Stack trace unavailable)"}`,
				),
			);
		};

		yield* _(Effect.logTrace("Successfully patched 'process.crash'."));
	} else {
		yield* _(
			Effect.logTrace(
				"'process.crash()' not found in this environment, skipping patch.",
			),
		);
	}
});
