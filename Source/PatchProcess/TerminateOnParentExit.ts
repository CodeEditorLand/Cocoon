/**
 * @module TerminateOnParentExit (PatchProcess)
 * @description Defines a background "watchdog" Effect that monitors the parent
 * process and terminates this process if the parent exits unexpectedly.
 */

import { Effect, Schedule } from "effect";

class ProcessPatchError extends Error {
	readonly _tag = "ProcessPatchError";
	constructor(
		readonly context: string,
		override readonly cause?: unknown,
	) {
		super(`Failed to patch Node.js process: ${context}`);
	}
}

/**
 * An Effect that, when forked as a daemon, periodically checks for the existence
 * of the parent process (identified by the `VSCODE_PARENT_PID` environment variable).
 */
const WatchdogLoop = Effect.gen(function* () {
	const ParentPID = Number(process.env["VSCODE_PARENT_PID"]);
	if (isNaN(ParentPID) || ParentPID <= 0) {
		yield* Effect.logWarning(
			"VSCODE_PARENT_PID is invalid, cannot monitor parent process.",
		);
		return;
	}

	yield* Effect.logDebug(`Monitoring parent process with PID: ${ParentPID}`);

	const CheckParent = Effect.try({
		try: () => {
			process.kill(ParentPID, 0);
		},
		catch: (cause) =>
			new ProcessPatchError("ParentProcessNotFound", {
				cause,
			}),
	});

	yield* CheckParent.pipe(
		Effect.repeat({ schedule: Schedule.spaced("5 seconds") }),
	);
}).pipe(
	Effect.catchTag("ProcessPatchError", () =>
		Effect.gen(function* () {
			yield* Effect.logInfo(
				"Parent process has exited. Terminating Cocoon process.",
			);
			yield* Effect.sleep("50ms");
			return yield* Effect.sync(() => process.exit(0));
		}),
	),
);

/**
 * The main export. It conditionally forks the watchdog loop as a background daemon
 * only if the required environment variable is present.
 */
export const TerminateOnParentExit = Effect.if(
	!!process.env["VSCODE_PARENT_PID"],
	{
		onTrue: Effect.forkDaemon(WatchdogLoop).pipe(Effect.asVoid),
		onFalse: Effect.void,
	},
);
