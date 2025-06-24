/*
 * File: Cocoon/Source/PatchProcess/HandleException.ts
 * Role: Sets up global handlers for uncaught exceptions and unhandled promise rejections.
 * Responsibilities:
 *   - Attaches listeners to `process.on('uncaughtException', ...)` and
 *     `process.on('unhandledRejection', ...)` to act as a final safety net.
 *   - Reports any captured errors to the Mountain host process via IPC for logging.
 */

import { Effect } from "effect";
import { IPC } from "../Service/IPC/Service.js";

/**
 * An `Effect` that attaches global exception handlers to the Node.js `process`.
 * It depends on the `IPC` service to forward captured errors to the host.
 */
export const HandleException = Effect.gen(function* (Generator) {
	// VS Code can optionally manage this itself through its RPC protocol.
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		return yield* Generator(
			Effect.logTrace(
				"Skipping global exception handler setup; will be handled by RPC protocol.",
			),
		);
	}

	const IPCService = yield* Generator(IPC);

	const LogError = (Type: string, CaughtError: unknown) => {
		const Message =
			CaughtError instanceof Error
				? CaughtError.stack || CaughtError.message
				: String(CaughtError);

		const Payload = {
			type: "__$error",
			severity: "error",
			arguments: `[${Type}] ${Message}`,
		};

		return IPCService.SendNotification("$log", [Payload]).pipe(
			Effect.catchAll((ErrorValue) =>
				// If we can't even send the error to the host, log to stderr as a last resort.
				Effect.sync(() =>
					console.error(
						`[HandleException] FATAL: Failed to send error to host: ${ErrorValue}`,
						Payload,
					),
				),
			),
		);
	};

	process.on("uncaughtException", (Error) => {
		Effect.runFork(LogError("uncaughtException", Error));
	});

	process.on("unhandledRejection", (Reason) => {
		Effect.runFork(LogError("unhandledRejection", Reason));
	});

	yield* Generator(Effect.logTrace("Global exception handlers installed."));
});
