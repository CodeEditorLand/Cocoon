/**
 * @module HandleException (PatchProcess)
 * @description An Effect that sets up global handlers for uncaught exceptions and
 * unhandled promise rejections, reporting them to the Mountain host process.
 */

import { Effect } from "effect";

import IPCService from "../Service/IPC/Service.js";

/**
 * An Effect that, when executed, attaches listeners to the Node.js `process`
 * object to catch any errors that are not handled within the application's
 * normal `Effect` workflow or `try/catch` blocks.
 *
 * This serves as a final safety net to ensure that errors originating from
 * extensions or other third-party code are captured and logged, rather than
 * crashing the Cocoon process silently.
 *
 * It respects the `VSCODE_HANDLES_UNCAUGHT_ERRORS` environment variable, which
 * allows for disabling this behavior if a more advanced RPC-based error
 * handling mechanism is active.
 */
const HandleException = Effect.gen(function* () {
	// VS Code's RPCProtocol can have its own comprehensive error handling.
	// If this flag is set, we defer to that system.
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		return yield* Effect.logTrace(
			"Skipping global exception handler setup; will be handled by RPC protocol.",
		);
	}

	const IPC = yield* IPCService;

	/**
	 * Creates an Effect to log an error to the parent (Mountain) process.
	 * @param Type A string indicating the type of error (e.g., 'uncaughtException').
	 * @param CaughtError The error or reason object caught by the handler.
	 */
	const LogError = (Type: string, CaughtError: any) => {
		const Message =
			CaughtError instanceof Error
				? CaughtError.stack || CaughtError.message
				: String(CaughtError);

		const Payload = {
			type: "__$error",
			severity: "error",
			arguments: `[${Type}] ${Message}`,
		};

		return IPC.SendNotification("$log", [Payload]).pipe(
			Effect.catchAll((ErrorValue) =>
				// Fallback to console if IPC fails
				Effect.sync(() =>
					console.error(
						`[HandleException] Failed to send error to host: ${ErrorValue}`,
						Payload,
					),
				),
			),
		);
	};

	// Attach the listeners to the global process object.
	process.on("uncaughtException", (Error) => {
		Effect.runFork(LogError("uncaughtException", Error));
	});

	process.on("unhandledRejection", (Reason) => {
		Effect.runFork(LogError("unhandledRejection", Reason));
	});

	yield* Effect.logTrace("Global exception handlers installed.");
});

export default HandleException;
