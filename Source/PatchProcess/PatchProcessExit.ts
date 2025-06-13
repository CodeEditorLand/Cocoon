/**
 * @module PatchProcessExit (PatchProcess)
 * @description An Effect that patches the global `process.exit` function, allowing
 * the host to control whether the process is allowed to terminate.
 */

import { Effect } from "effect";

import { ExitPreventedError } from "./Error.js";
import { ProcessPatch } from "./ProcessPatch.js";

/**
 * An Effect that replaces the global `process.exit` function with a controlled version.
 *
 * This is a critical security and reliability patch. The new function consults an
 * `AllowExit` predicate provided by the host environment via the `ProcessPatch`
 * service.
 *
 * - If exiting is allowed, the original native exit function is called.
 * - If exiting is disallowed, a detailed warning is logged and a synchronous
 *   `ExitPreventedError` is thrown to halt the caller's execution path.
 */
export const PatchProcessExit = Effect.gen(function* (_) {
	// Depend on the ProcessPatch service to get the native function and the policy.
	const { NativeExit, AllowExit } = yield* _(ProcessPatch.Tag);

	// Overwrite the global `process.exit` method.
	process.exit = (Code?: number): never => {
		// Consult the host's policy.
		if (AllowExit()) {
			// The host has permitted the exit. Log it and terminate.
			Effect.runSync(
				Effect.logInfo(
					`'process.exit(${Code ?? ""})' was called and ALLOWED by host policy. Terminating.`,
				),
			);
			return NativeExit(Code);
		}

		// The host has blocked the exit.
		const ErrorMessage = `'process.exit(${Code ?? ""})' was called but PREVENTED by host policy.`;
		const PreventionError = new ExitPreventedError({
			message: ErrorMessage,
			attemptedCode: Code,
		});

		// We must throw synchronously here to immediately halt the execution path
		// of the code that called `process.exit`. Logging is secondary to this throw.
		Effect.runSync(
			Effect.logWarning(
				"Blocked call to process.exit by host policy.",
				PreventionError,
			),
		);

		throw PreventionError;
	};

	yield* _(Effect.logTrace("Successfully patched 'process.exit'."));
});
