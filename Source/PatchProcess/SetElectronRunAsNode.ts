/**
 * @module SetElectronRunAsNode (PatchProcess)
 * @description An Effect that sets the `ELECTRON_RUN_AS_NODE` environment variable
 * for compatibility with certain native Node.js modules.
 */

import { Effect } from "effect";

class ProcessPatchError extends Error {
	readonly _tag = "ProcessPatchError";
	constructor(
		readonly context: string,
		readonly cause?: unknown,
	) {
		super(`Failed to patch Node.js process: ${context}`);
	}
}

/**
 * An Effect that sets the `ELECTRON_RUN_AS_NODE` environment variable to '1'.
 *
 * This is a compatibility measure. Some native Node.js modules check for this
 * environment variable to determine if they are running within an Electron
 * process that has Node.js integration enabled. Setting this flag can help
 * ensure these modules behave correctly within the Cocoon runtime.
 *
 * @returns An `Effect` that resolves when the variable is set, or fails with a
 *   `ProcessPatchError`.
 */
export const SetElectronRunAsNode = Effect.try({
	try: () => {
		process.env["ELECTRON_RUN_AS_NODE"] = "1";
	},
	catch: (cause) =>
		new ProcessPatchError("SetElectronRunAsNode", {
			cause,
		}),
}).pipe(
	Effect.tap(() =>
		Effect.logTrace(
			"Set environment variable 'ELECTRON_RUN_AS_NODE' to '1'.",
		),
	),
);
