/**
 * @module PipeLoggingToParent (PatchProcess)
 * @description An Effect that intercepts `console.*` calls and pipes them as
 * structured log messages to the parent (Mountain) process via IPC.
 */

import { Effect } from "effect";

import { IPCProvider } from "../Service/IPC.js";

/**
 * A robust JSON stringifier that handles circular references and special types
 * to prevent crashes during logging.
 * Based on the implementation in VS Code's `bootstrap-fork.ts`.
 * @param Args - The array of arguments passed to a console method.
 */
const SafeToString = (Args: ArrayLike<unknown>): string => {
	const Slices: string[] = [];
	for (let i = 0; i < Args.length; i++) {
		const Arg = Args[i];
		if (typeof Arg === "object") {
			try {
				Slices.push(JSON.stringify(Arg));
			} catch (e) {
				Slices.push(`[Unserializable Object: ${e}]`);
			}
		} else {
			Slices.push(String(Arg));
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
export const PipeLoggingToParent = Effect.gen(function* (_) {
	if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
		yield* _(
			Effect.logTrace(
				"Console log piping is disabled by environment variable.",
			),
		);
		return;
	}

	const IPC = yield* _(IPCProvider.Tag);

	/**
	 * Creates an Effect that sends a formatted log message to the host.
	 * @param Severity - The severity level of the log message.
	 * @param Args - The arguments originally passed to the console function.
	 */
	const ForwardConsoleCallEffect = (
		Severity: "log" | "warn" | "error",
		Args: ArrayLike<unknown>,
	) => {
		const Payload = {
			type: "__$console",
			severity: Severity,
			arguments: SafeToString(Args),
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
		Effect.runFork(ForwardConsoleCallEffect("log", args));
	};
	console.warn = (...args: any[]) => {
		OriginalConsole.warn.apply(console, args);
		Effect.runFork(ForwardConsoleCallEffect("warn", args));
	};
	console.error = (...args: any[]) => {
		OriginalConsole.error.apply(console, args);
		Effect.runFork(ForwardConsoleCallEffect("error", args));
	};

	yield* _(
		Effect.logTrace("Global console object patched to pipe logs to host."),
	);
});
