/**
 * @module TerminateOnParentExit
 * @description An Effect that ensures the Cocoon process terminates gracefully
 * if its parent process (the main VS Code window or Mountain host) exits
 * unexpectedly.
 */
import { Effect } from "effect";

/**
 * An Effect that checks for the parent process ID (`VSCODE_PID`) passed via
 * environment variables. If found, it polls at a regular interval to see
 * if the parent process is still alive. If the parent process is gone, it
 * triggers a clean exit of the Cocoon process.
 *
 * This acts as a "dead man's switch" to prevent orphaned extension host
 * processes. It is forked into the background and runs for the entire
 * lifecycle of the application.
 */
const TerminateOnParentExit = Effect.gen(function* () {
	const ParentPIDString = process.env["VSCODE_PID"];
	if (!ParentPIDString) {
		return yield* Effect.logTrace(
			"No `VSCODE_PID` found, skipping parent exit monitoring.",
		);
	}

	const ParentPID = Number.parseInt(ParentPIDString, 10);
	if (Number.isNaN(ParentPID)) {
		return yield* Effect.logWarning(
			`Invalid VSCODE_PID '${ParentPIDString}', cannot monitor parent process.`,
		);
	}

	yield* Effect.logTrace(`Monitoring parent process ${ParentPID} for exit.`);

	// This loop runs forever in a forked fiber.
	const MonitoringLoop = Effect.gen(function* () {
		while (true) {
			try {
				// `process.kill` with signal 0 is a standard way to check if a process exists.
				// It doesn't actually send a signal. It will throw if the PID is not found.
				process.kill(ParentPID, 0);
			} catch (Error) {
				// If `kill` throws, the parent process is gone.
				yield* Effect.logInfo(
					`Parent process ${ParentPID} is no longer running. Exiting Cocoon gracefully.`,
				);
				process.exit(0);
			}
			// Wait for 5 seconds before checking again.
			yield* Effect.sleep("5 seconds");
		}
	}).pipe(Effect.forkDaemon); // Fork as a daemon so it doesn't block shutdown.

	yield* MonitoringLoop;
});

export default TerminateOnParentExit;
