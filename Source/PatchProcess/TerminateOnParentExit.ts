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
		readonly cause?: unknown,
	) {
		super(`Failed to patch Node.js process: ${context}`);
	}
}

/**
 * An Effect that, when forked as a daemon, periodically checks for the existence
 * of the parent process (identified by the `VSCODE_PARENT_PID` environment variable).
 *
 * If the parent process can no longer be found, this Effect will terminate the
 * current (Cocoon) process. This is a critical cleanup mechanism to prevent
 * orphaned sidecar processes if the main Mountain application crashes or is
 * force-quit.
 *
 * The check is performed by sending signal 0 to the parent PID, a standard
 * POSIX method for checking process existence without affecting the process.
 */
const WatchdogLoop = Effect.gen(function* (_) {
	const ParentPID = Number(process.env["VSCODE_PARENT_PID"]);
	if (isNaN(ParentPID) || ParentPID <= 0) {
		yield* _(
			Effect.logWarn(
				"VSCODE_PARENT_PID is invalid, cannot monitor parent process.",
			),
		);
		return; // End the effect gracefully if PID is invalid.
	}

	yield* _(
		Effect.logDebug(`Monitoring parent process with PID: ${ParentPID}`),
	);

	const CheckParent = Effect.try({
		try: () => {
			// On POSIX systems, sending signal 0 to a PID checks for its existence
			// without sending an actual signal. It throws if the process is not found.
			process.kill(ParentPID, 0);
		},
		catch: (cause) =>
			new ProcessPatchError("ParentProcessNotFound", {
				cause,
			}),
	});

	// Run the check repeatedly with a fixed delay.
	yield* _(
		CheckParent.pipe(
			Effect.repeat({ schedule: Schedule.spaced("5 seconds") }),
		),
	);
}).pipe(
	// If CheckParent ever fails (i.e., the parent is gone), this will be triggered.
	Effect.catchTag("ProcessPatchError", () =>
		Effect.gen(function* (_) {
			yield* _(
				Effect.logInfo(
					"Parent process has exited. Terminating Cocoon process.",
				),
			);
			// A small delay to ensure the log has a chance to be flushed.
			yield* _(Effect.sleep("50ms"));
			// Use a synchronous effect to exit.
			return yield* _(Effect.sync(() => process.exit(0)));
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
		onTrue: Effect.forkDaemon(WatchdogLoop),
		onFalse: Effect.unit,
	},
);
