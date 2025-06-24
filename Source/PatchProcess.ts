/**
 * @module PatchProcess
 * @description This module defines the `PatchProcess` service and the main
 * orchestrator `Effect` that composes and applies all individual process-level
 * patches at application startup. It ensures the Node.js environment is stable,
 * secure, and properly configured before any extension code is loaded.
 */

import { Effect } from "effect";
import * as Module from "node:module";
import { Data } from "effect";
import { InitData } from "./InitData.js";
import { IPC } from "./IPC.js";
import { ExitPreventedProblem } from "./PatchProcess/ExitPreventedProblem.js";

// --- Service Definition ---

/**
 * @interface PatchProcess
 * @description The contract for the service that provides access to native process
 * functions and configuration for other process-patching Effects.
 */
export interface PatchProcess {
	readonly NativeExit: (code?: number) => never;
	readonly NativeCrash: (() => void) | undefined;
	readonly AllowExit: () => boolean;
}

/**
 * @class PatchProcess
 * @description The `Effect.Service` for the `PatchProcess` service.
 * This service is a crucial part of the sandboxing mechanism. It captures the
 * original, native `process` functions before they can be overwritten, and it
 * holds the configuration that determines whether termination is allowed.
 */
export class PatchProcessService extends Effect.Service<PatchProcessService>()(
	"Service/PatchProcess",
	{
		effect: Effect.gen(function* () {
			// This logic was originally in `Live.ts`.
			// It's effectful due to its dependency on `Config`.
			const AllowExit = yield* Effect.config(
				Effect.boolean("AllowExit"),
			).pipe(
				Effect.catchAll((Error) =>
					Effect.log(
						"Failed to load PatchProcess config, using defaults.",
						{ Error, LogLevel: "Warning" },
					).pipe(
						Effect.as(false), // Default to not allowing exit on error.
					),
				),
			);
			return {
				NativeExit: process.exit.bind(process),
				NativeCrash:
					typeof process.crash === "function"
						? process.crash.bind(process)
						: undefined,
				AllowExit: () => AllowExit,
			};
		}),
	},
) {}

// --- Individual Patch Effects ---

/**
 * @description An `Effect` that sets the `ELECTRON_RUN_AS_NODE` environment variable.
 */
const SetElectronRunAsNode = Effect.sync(() => {
	process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable."),
	),
);

/**
 * @description An `Effect` that increases the stack trace limit for better debugging.
 */
const SetStackTraceLimit = Effect.sync(() => {
	Error.stackTraceLimit = 100;
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Increased `Error.stackTraceLimit` to 100."),
	),
);

/**
 * @description An `Effect` that patches `process.crash()` to prevent extensions from
 * terminating the host process.
 */
const PatchProcessCrash = Effect.gen(function* () {
	const Service = yield* PatchProcess;
	if (Service.NativeCrash) {
		process.crash = (): void => {
			const PreventionStack = new Error(
				"Stack trace for prevented process.crash()",
			).stack;
			Effect.runSync(
				Effect.logWarning(
					`A call to 'process.crash()' was intercepted and PREVENTED by host policy.`,
					`Call stack for prevented crash:\n${PreventionStack ?? "(Stack trace unavailable)"}`,
				),
			);
		};
		yield* Effect.logTrace("Successfully patched 'process.crash'.");
	} else {
		yield* Effect.logTrace(
			"'process.crash()' not found in this environment, skipping patch.",
		);
	}
});

/**
 * @description An `Effect` that replaces `process.exit` with a controlled version.
 */
const PatchProcessExit = Effect.gen(function* () {
	const Service = yield* PatchProcess;
	process.exit = (Code?: number): never => {
		if (Service.AllowExit()) {
			Effect.runSync(
				Effect.logInfo(
					`'process.exit(${Code ?? ""})' was called and ALLOWED by host policy. Terminating.`,
				),
			);
			return Service.NativeExit(Code);
		}
		const ErrorMessage = `'process.exit(${Code ?? ""})' was called but PREVENTED by host policy.`;
		const PreventionError = new ExitPreventedProblem({
			message: ErrorMessage,
			AttemptedCode: Code,
		});
		Effect.runSync(
			Effect.logWarning(
				"Blocked call to process.exit by host policy.",
				PreventionError,
			),
		);
		throw PreventionError;
	};
	yield* Effect.logTrace("Successfully patched 'process.exit'.");
});

/**
 * @description A tagged error for failures during the patching of the Node.js module loader.
 */
class ModulePatchProblem extends Data.TaggedError("ModulePatchProblem")<{
	readonly Context: string;
	readonly Cause?: unknown;
}> {
	public override readonly message: string;
	constructor(Properties: {
		readonly Context: string;
		readonly Cause?: unknown;
	}) {
		super(Properties);
		this.message = `Failed to patch Node.js module loader: ${this.Context}`;
	}
}

/**
 * @description An `Effect` that monkey-patches `Module._load` to block the deprecated 'natives' module.
 */
const BlockNativesModule = Effect.try({
	try: () => {
		if (typeof (Module as any)._load === "function") {
			const OriginalLoad = (Module as any)._load;
			(Module as any)._load = function (
				Request: string,
				Parent: any,
				IsMain: boolean,
			): any {
				if (Request === "natives") {
					const ErrorMessage =
						"Attempt to load deprecated 'natives' module blocked. This module is not available in the Cocoon runtime.";
					console.warn(`[Cocoon PatchProcess] ${ErrorMessage}`);
					throw new Error(ErrorMessage);
				}
				return OriginalLoad.call(this, Request, Parent, IsMain);
			};
		} else {
			console.warn(
				"[Cocoon PatchProcess] Module._load not found. Skipping 'natives' block patch.",
			);
		}
	},
	catch: (Cause) =>
		new ModulePatchProblem({
			Context: "Failed during 'natives' block setup.",
			Cause,
		}),
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Module._load patched to block 'natives' module."),
	),
);

const SafeToString = (Arguments: ArrayLike<unknown>): string => {
	const Slices: string[] = [];
	for (let i = 0; i < Arguments.length; i++) {
		const Argument = Arguments[i];
		Slices.push(
			typeof Argument === "object"
				? JSON.stringify(Argument, null, 2)
				: String(Argument),
		);
	}
	return Slices.join(" ");
};

/**
 * @description An `Effect` that intercepts `console.*` calls and pipes them as
 * structured log messages to the parent (Mountain) process via IPC.
 */
const PipeLogging = Effect.gen(function* () {
	if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
		return yield* Effect.logTrace(
			"Console log piping is disabled by environment variable.",
		);
	}
	const IPCService = yield* IPC;
	const ForwardConsoleCall = (
		Severity: "log" | "warn" | "error",
		Arguments: ArrayLike<unknown>,
	) => {
		const Payload = {
			type: "__$console",
			severity: Severity,
			arguments: SafeToString(Arguments),
		};
		return IPCService.SendNotification("$log", [Payload]);
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
	yield* Effect.logTrace(
		"Global console object patched to pipe logs to host.",
	);
});

/**
 * @description An `Effect` that attaches global exception handlers to the Node.js `process`.
 */
const HandleException = Effect.gen(function* () {
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		return yield* Effect.logTrace(
			"Skipping global exception handler setup; will be handled by RPC protocol.",
		);
	}
	const IPCService = yield* IPC;
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
	yield* Effect.logTrace("Global exception handlers installed.");
});

/**
 * @description An `Effect` that configures the process environment based on `InitData`.
 */
const SetupEnvironment = Effect.gen(function* () {
	const InitDataService = yield* InitData;
	if (InitDataService.environment.useHostProxy) {
		yield* Effect.logInfo(
			"Host proxy is enabled. Assuming proxy environment variables are inherited.",
		);
	}
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Proxy environment variables configured."),
	),
);

/**
 * @description An `Effect` that ensures the Cocoon process terminates if its parent process exits.
 */
const TerminateOnParentExit = Effect.gen(function* () {
	const ParentPidString = process.env["VSCODE_PID"];
	if (!ParentPidString) {
		return yield* Effect.logTrace(
			"No `VSCODE_PID` found, skipping parent exit monitoring.",
		);
	}
	const ParentPid = Number.parseInt(ParentPidString, 10);
	if (Number.isNaN(ParentPid)) {
		return yield* Effect.logWarning(
			`Invalid VSCODE_PID '${ParentPidString}', cannot monitor parent process.`,
		);
	}
	yield* Effect.logTrace(`Monitoring parent process ${ParentPid} for exit.`);
	const MonitoringLoop = Effect.gen(function* () {
		while (true) {
			try {
				process.kill(ParentPid, 0);
			} catch (Error) {
				yield* Effect.logInfo(
					`Parent process ${ParentPid} is no longer running. Exiting Cocoon gracefully.`,
				);
				process.exit(0);
			}
			yield* Effect.sleep("5 seconds");
		}
	}).pipe(Effect.forkDaemon);
	yield* MonitoringLoop;
});

/**
 * @description The main orchestrator `Effect` for applying all core process patches.
 * It runs all patches concurrently where possible. This `Effect` should be one of the
 * very first to run at application startup.
 */
export const RunPatchProcess = Effect.gen(function* () {
	const AllPatches = [
		PatchProcessCrash,
		PatchProcessExit,
		SetStackTraceLimit,
		SetupEnvironment,
		SetElectronRunAsNode,
		BlockNativesModule,
		PipeLogging,
		HandleException,
		TerminateOnParentExit,
	];
	yield* Effect.all(AllPatches, { discard: true, concurrency: "unbounded" });
}).pipe(
	Effect.tap(() =>
		Effect.logDebug("All core process patches have been applied."),
	),
	Effect.catchAll((Error) =>
		Effect.logFatal(
			"A critical error occurred during the bootstrap process patching. The environment may be unstable.",
			Error,
		),
	),
	Effect.provide(PatchProcess.Default),
);
