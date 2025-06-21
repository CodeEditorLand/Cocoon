/**
 * @module PipeLogging (PatchProcess)
 * @description An Effect that intercepts `console.*` calls and pipes them as
 * structured log messages to the parent (Mountain) process via IPC.
 */

import { Effect } from "effect";

import IPCService from "../Service/IPC/Service.js";

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
 * An Effect that monkey-patches the global `console` object.
 */
const PipeLoggingEffect = Effect.gen(function* (G) {
	if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
		return yield* G(
			Effect.logTrace(
				"Console log piping is disabled by environment variable.",
			),
		);
	}

	const IPC = yield* G(IPCService);

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

	const OriginalConsole = {
		log: console.log,
		warn: console.warn,
		error: console.error,
	};

	console.log = (...args: any[]) => {
		OriginalConsole.log.apply(console, args);
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

	yield* G(
		Effect.logTrace("Global console object patched to pipe logs to host."),
	);
});

export default PipeLoggingEffect;
