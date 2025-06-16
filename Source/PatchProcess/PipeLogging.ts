/*
 * File: Cocoon/Source/PatchProcess/PipeLogging.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:20 UTC
 * Dependency: ../Service/IPC/Service.js, effect
 */

/**
 * @module PipeLogging (PatchProcess)
 * @description An Effect that intercepts `console.*` calls and pipes them as
 * structured log messages to the parent (Mountain) process via IPC.
 */

import { Effect } from "effect";

import IPCService from "../Service/IPC/Service.js";

/**
 * A robust JSON stringifier that handles circular references and special types
 * to prevent crashes during logging.
 * Based on the implementation in VS Code's `bootstrap-fork.ts`.
 * @param Arguments The array of arguments passed to a console method.
 */
const SafeToString = (Arguments: ArrayLike<unknown>): string => {
	const Slices: string[] = [];
	for (let i = 0; i < Arguments.length; i++) {
		const Argument = Arguments[i];
		if (typeof Argument === "object") {
			try {
				Slices.push(JSON.stringify(Argument));
			} catch (e) {
				Slices.push(`[Unserializable Object: ${e}]`);
			}
		} else {
			Slices.push(String(Argument));
		}
	}
	return Slices.join(" ");
};

/**
 * An Effect that, when executed, monkey-patches the global `console` object.
 *
 * Each call to `console.log`, `warn`, or `error` is intercepted, formatted into
 * a structured payload, and sent to the Mountain host via an IPC notification.
 * This allows the main application to display logs from the extension host, which
 * is essential for debugging both Cocoon itself and the extensions it runs.
 *
 * This patch is conditionally applied based on the `VSCODE_PIPE_LOGGING`
 * environment variable.
 */
const PipeLogging = Effect.gen(function* () {
	if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
		return yield* Effect.logTrace(
			"Console log piping is disabled by environment variable.",
		);
	}

	const IPC = yield* IPCService;

	/**
	 * Creates an Effect that sends a formatted log message to the host.
	 * @param Severity The severity level of the log message.
	 * @param Arguments The arguments originally passed to the console function.
	 */
	const ForwardConsoleCall = (
		Severity: "log" | "warn" | "error",
		Arguments: ArrayLike<unknown>,
	) => {
		const Payload = {
			type: "__$console",
			severity: Severity,
			arguments: SafeToString(Arguments),
		};
		return IPC.SendNotification("$log", [Payload]);
	};

	// Keep a reference to the original functions.
	const OriginalConsole = {
		log: console.log,
		warn: console.warn,
		error: console.error,
	};

	// Overwrite the global console methods.
	console.log = (...args: any[]) => {
		OriginalConsole.log.apply(console, args); // Also log to the actual sidecar console.
		Effect.runFork(ForwardConsoleCall("log", args));
	};
	console.warn = (...args: any[]) => {
		OriginalConsole.warn.apply(console, args);
		Effect.runFork(ForwardConsoleCall("warn", args));
	};
	console.error = (...args: any[]) => {
		OriginalConsole.error.apply(console, args);
		Effect.runFork(ForwardConsoleCall("error", args));
	};

	yield* Effect.logTrace(
		"Global console object patched to pipe logs to host.",
	);
});

export default PipeLogging;
