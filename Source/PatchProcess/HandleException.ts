/*
 * File: Cocoon/Source/PatchProcess/HandleException.ts
 *
 * This file contains an Effect that sets up global handlers for uncaught exceptions
 * and unhandled promise rejections, reporting them to the Mountain host process.
 */

import { Effect } from "effect";

import IPCService from "../Service/IPC/Service.js";

/**
 * An Effect that attaches listeners to the Node.js `process` object.
 * This serves as a final safety net to ensure that errors are captured and logged.
 */
const HandleExceptionEffect = Effect.gen(function* (G) {
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		return yield* G(
			Effect.logTrace(
				"Skipping global exception handler setup; will be handled by RPC protocol.",
			),
		);
	}

	const IPC = yield* G(IPCService);

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
				Effect.sync(() =>
					console.error(
						`[HandleException] Failed to send error to host: ${ErrorValue}`,
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

	yield* G(Effect.logTrace("Global exception handlers installed."));
});

export default HandleExceptionEffect;
