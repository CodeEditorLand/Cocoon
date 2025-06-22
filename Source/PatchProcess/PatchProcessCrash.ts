/*
 * File: Cocoon/Source/PatchProcess/PatchProcessCrash.ts
 *
 * This file contains an Effect that patches the Electron-specific `process.crash`
 * function to prevent extensions from terminating the host process.
 */

import { Effect } from "effect";

import ProcessPatchService from "./Service.js";

/**
 * An Effect that replaces the `process.crash()` function if it exists.
 * It depends on the `ProcessPatch` service to safely access the original function.
 */
const PatchProcessCrashEffect = Effect.gen(function* (G) {
	const ProcessPatch = yield* G(ProcessPatchService);

	if (ProcessPatch.NativeCrash) {
		process.crash = (): void => {
			const PreventionStack = new Error(
				"Stack trace for prevented process.crash()",
			).stack;

			Effect.runSync(
				Effect.logWarning(
					`A call to 'process.crash()' was intercepted and PREVENTED by host policy.`,
					`Call stack for prevented crash:\n${
						PreventionStack ?? "(Stack trace unavailable)"
					}`,
				),
			);
		};

		yield* G(Effect.logTrace("Successfully patched 'process.crash'."));
	} else {
		yield* G(
			Effect.logTrace(
				"'process.crash()' not found in this environment, skipping patch.",
			),
		);
	}
});

export default PatchProcessCrashEffect;
