/*
 * File: Cocoon/Source/PatchProcess/PatchProcessExit.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:36 UTC
 * Dependency: ./Error/ExitPreventedError.js, ./Service.js, effect
 */

/**
 * @module PatchProcessExit (PatchProcess)
 * @description An Effect that patches the global `process.exit` function, allowing
 * the host to control whether the process is allowed to terminate.
 */

import { Effect } from "effect";

import ExitPreventedError from "./Error/ExitPreventedError.js";
import ProcessPatchService from "./Service.js";

/**
 * An Effect that replaces the global `process.exit` function with a controlled version.
 */
const PatchProcessExitEffect = Effect.gen(function* (G) {
	const ProcessPatch = yield* G(ProcessPatchService);

	process.exit = (Code?: number): never => {
		if (ProcessPatch.AllowExit()) {
			Effect.runSync(
				Effect.logInfo(
					`'process.exit(${
						Code ?? ""
					})' was called and ALLOWED by host policy. Terminating.`,
				),
			);
			return ProcessPatch.NativeExit(Code);
		}

		const ErrorMessage = `'process.exit(${
			Code ?? ""
		})' was called but PREVENTED by host policy.`;
		const PreventionError = new ExitPreventedError({
			message: ErrorMessage,
			AttemptedCode: Code,
		});

		Effect.runSync(
			Effect.logWarning(
				"Blocked call to process.exit by host policy.",
				PreventionError,
			),
		);

		throw PreventionError;
	};

	yield* G(Effect.logTrace("Successfully patched 'process.exit'."));
});

export default PatchProcessExitEffect;
