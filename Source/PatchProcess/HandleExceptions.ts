/**
 * @module HandleExceptions (PatchProcess)
 * @description An Effect that sets up global handlers for uncaught exceptions and
 * unhandled promise rejections, reporting them to the Mountain host process.
 */

import { Effect } from "effect";

import { IPCProvider } from "../Service/IPC.js";

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
export const HandleExceptions = Effect.gen(function* (_) {
	// VS Code's RPCProtocol can have its own comprehensive error handling.
	// If this flag is set, we defer to that system.
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		yield* _(
			Effect.logTrace(
				"Skipping global exception handler setup; will be handled by RPC protocol.",
			),
		);
		return;
	}

	const IPC = yield* _(IPCProvider.Tag);

	/**
	 * Creates an Effect to log an error to the parent (Mountain) process.
	 * @param Type - A string indicating the type of error (e.g., 'uncaughtException').
	 * @param ErrorValue - The error or reason object caught by the handler.
	 */
	const LogErrorEffect = (Type: string, ErrorValue: any) => {
		const Message =
			ErrorValue instanceof Error
				? ErrorValue.stack || ErrorValue.message
				: String(ErrorValue);

		const LogPayload = {
			type: "__$error",
			severity: "error",
			arguments: `[${Type}] ${Message}`,
		};

		return IPC.SendNotification("$log", [LogPayload]).pipe(
			Effect.catchAll((error) =>
				// Fallback to console if IPC fails
				Effect.sync(() =>
					console.error(
						`[HandleExceptions] Failed to send error to host: ${error}`,
						LogPayload,
					),
				),
			),
		);
	};

	// Attach the listeners to the global process object.
	process.on("uncaughtException", (err) => {
		Effect.runFork(LogErrorEffect("uncaughtException", err));
	});

	process.on("unhandledRejection", (reason) => {
		Effect.runFork(LogErrorEffect("unhandledRejection", reason));
	});

	yield* _(Effect.logTrace("Global exception handlers installed."));
});
