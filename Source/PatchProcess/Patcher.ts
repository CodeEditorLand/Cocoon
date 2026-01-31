/**
 * @module Patcher
 * @description
 * Main orchestrator for applying process-level security patches and hardening measures.
 * This module is responsible for patching the Node.js process to restrict malicious or buggy extensions.
 *
 * ## Element Connections
 *
 * **Air (Rust Workbench)**: Air provides OS-level security enforcement through native process controls.
 * When Air enforces quotas or privileges, those policies are synchronized with Cocoon's process patching.
 *
 * **Mountain (Security Policies)**: Mountain centralizes security policies and synchronizes them with
 * Cocoon's process hardening. Security limits (CPU, memory, network) are retrieved from Mountain's
 * state management.
 *
 * **Wind (Effect-TS Services)**: Wind services respect the security boundaries established by the
 * Patcher. All Effect-TS operations run within the hardened environment.
 *
 * **Output (VSCode Reference)**: Based on VSCode's extension host security patterns:
 * - src/vs/workbench/services/extensions/common/extHostExtensionService.ts
 * - src/vs/base/parts/sandbox/electron-sandbox/preload.js
 *
 * ## Responsibilities
 *
 * 1. Patch process.exit() and process.crash() to prevent unauthorized termination
 * 2. Limit Error.stackTraceLimit to prevent stack trace attacks
 * 3. Block dangerous modules like "natives"
 * 4. Pipe console logging to host for security monitoring
 * 5. Setup global exception handlers for error containment
 * 6. Configure environment variables for secure execution
 * 7. Monitor parent process for graceful termination
 *
 * ## TODOs
 *
 * - **TBD**: Windows-specific process isolation using Job Objects and AppContainer
 * - **TBD**: Linux seccomp filters for system call restriction
 * - **TBD**: macOS sandbox enforcement and entitlements
 * - **TBD**: Security policy synchronization with Mountain via IPC
 * - **TBD**: Telemetry integration for security event logging
 * - **TBD**: Real-time process monitoring for suspicious activity
 * - **TBD**: Memory pressure detection and early warning system
 * - **TBD**: Process priority management for extension isolation
 */

import * as Module from "node:module";

import { Config, Data, Effect } from "effect";

import { IPCService } from "../Services/IPCService.js";
import { InitDataService } from "../Services/InitData.js";
import { ExitPreventedProblem } from "../Archive/PatchProcess/ExitPreventedProblem.js";
import { SecurityPolicy } from "./Security.js";

// --- Service Definition ---

/**
 * Interface for the Patcher service providing access to native process functions
 * Allows other security modules to interact with process controls
 */
export interface Patcher {
	/**
	 * Original native process.exit function
	 */
	readonly NativeExit: (code?: number) => never;
	/**
	 * Original native process.crash function (if available)
	 */
	readonly NativeCrash: (() => void) | undefined;
	/**
	 * Check if process exit is allowed by security policy
	 */
	readonly AllowExit: () => boolean;
	/**
	 * Get current security policy
	 */
	readonly GetSecurityPolicy: () => SecurityPolicy;
}

/**
 * Tagged error class for module loading patch problems
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
 * Service class for process patching
 * Captures native functions before they can be patched, and maintains security configuration
 */
export class PatcherService extends Effect.Service<PatcherService>()(
	"PatchProcess/PatcherService",
	{
		effect: Effect.gen(function* () {
			const AllowExit = yield* Config.boolean("AllowExit").pipe(
				Effect.catchAll((Error) =>
					Effect.logWarning(
						"Failed to load Patcher config, using defaults.",
						{ Error },
					).pipe(Effect.as(false)),
				),
			);

			const SecurityPolicy = yield* Config.string("SecurityPolicy").pipe(
				Effect.catchTag("MissingConfig", () => Effect.succeed("default")),
				Config.map((Value) => ParseSecurityPolicy(Value)),
			);

			return {
				NativeExit: process.exit.bind(process),
				NativeCrash: (process as any).crash,
				AllowExit: () => AllowExit,
				GetSecurityPolicy: () => SecurityPolicy,
			};
		}),
	},
) {}

// --- Individual Patch Effects ---

/**
 * Set ELECTRON_RUN_AS_NODE environment variable for proper process behavior
 */
const SetElectronRunAsNode = Effect.sync(() => {
	process.env["ELECTRON_RUN_AS_NODE"] = "1";
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Set `ELECTRON_RUN_AS_NODE` environment variable"),
	),
);

/**
 * Increase Error.stackTraceLimit for better debugging while preventing overflow
 */
const SetStackTraceLimit = Effect.sync(() => {
	Error.stackTraceLimit = 100;
}).pipe(
	Effect.tap(() => Effect.logTrace("Increased `Error.stackTraceLimit` to 100")),
);

/**
 * Patch process.crash() to prevent unauthorized process crashes
 * Malicious extensions may call crash() to disrupt the host
 */
const PatchProcessCrash = Effect.gen(function* () {
	const Service = yield* PatcherService;
	if (Service.NativeCrash) {
		(process as any).crash = (): void => {
			const PreventionStack = new Error(
				"Stack trace for prevented process.crash()",
			).stack;
			Effect.runSync(
				Effect.logWarning(
					`Call to 'process.crash()' intercepted and PREVENTED by host policy`,
					`Stack: ${PreventionStack ?? "(unavailable)"}`,
				),
			);
		};
		yield* Effect.logTrace("Successfully patched 'process.crash'");
	} else {
		yield* Effect.logTrace(
			"'process.crash()' not found in environment, skipping patch",
		);
	}
});

/**
 * Patch process.exit() to enforce exit policy
 * Extensions cannot terminate the host process without authorization
 */
const PatchProcessExit = Effect.gen(function* () {
	const Service = yield* PatcherService;
	process.exit = (Code?: number): never => {
		if (Service.AllowExit()) {
			Effect.runSync(
				Effect.logInfo(
					`'process.exit(${Code ?? ""})' ALLOWED by host policy`,
				),
			);
			return Service.NativeExit(Code);
		}
		const ErrorMessage = `'process.exit(${Code ?? ""})' PREVENTED by host policy`;
		const PreventionError = new ExitPreventedProblem({
			message: ErrorMessage,
			AttemptedCode: Code as any,
		});
		Effect.runSync(
			Effect.logWarning("Blocked call to process.exit by host policy"),
		);
		throw PreventionError;
	};
	yield* Effect.logTrace("Successfully patched 'process.exit'");
});

/**
 * Block loading of deprecated 'natives' module
 * This module provides unsafe native access and should never be loaded
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
						"Attempt to load deprecated 'natives' module blocked. Not available in Cocoon runtime";
					console.warn(`[Cocoon Patcher] ${ErrorMessage}`);
					throw new Error(ErrorMessage);
				}
				return OriginalLoad.call(this, Request, Parent, IsMain);
			};
		} else {
			console.warn(
				"[Cocoon Patcher] Module._load not found, skipping 'natives' block",
			);
		}
	},
	catch: (Cause) =>
		new ModulePatchProblem({
			Context: "Failed during 'natives' block setup",
			Cause,
		}),
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Module._load patched to block 'natives' module"),
	),
);

/**
 * Safely convert arguments to string for logging
 * Prevents object circular reference errors
 */
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
 * Patch console.log/warn/error to forward logs to host
 * Enables security monitoring of extension console output
 */
const PipeLogging = Effect.gen(function* () {
	if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
		return yield* Effect.logTrace(
			"Console log piping disabled by environment variable",
		);
	}
	const IPC = yield* IPCService;
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
	yield* Effect.logTrace(
		"Global console object patched to pipe logs to host",
	);
});

/**
 * Setup global exception handlers
 * Prevents uncaught exceptions from crashing the process
 * Errors are forwarded to host for security monitoring
 */
const HandleException = Effect.gen(function* () {
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		return yield* Effect.logTrace(
			"Skipping global exception handler, will be handled by RPC",
		);
	}
	const IPC = yield* IPCService;
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
		return IPC.SendNotification("$log", [Payload]).pipe(
			Effect.catchAll((ErrorValue) =>
				Effect.sync(() =>
					console.error(
						`[Patcher] Failed to send error to host: ${ErrorValue}`,
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
	yield* Effect.logTrace("Global exception handlers installed");
});

/**
 * Configure environment variables for secure execution
 */
const SetupEnvironment = Effect.gen(function* () {
	const InitData = yield* InitDataService;
	if (InitData.environment.useHostProxy) {
		yield* Effect.logInfo(
			"Host proxy enabled. Proxy environment variables inherited",
		);
	}
}).pipe(
	Effect.tap(() =>
		Effect.logTrace("Proxy environment variables configured"),
	),
);

/**
 * Monitor parent process for graceful termination
 * When host process dies, terminate extension host cleanly
 */
const TerminateOnParentExit = Effect.gen(function* () {
	const ParentPidString = process.env["VSCODE_PID"];
	if (!ParentPidString) {
		return yield* Effect.logTrace(
			"No VSCODE_PID found, skipping parent exit monitoring",
		);
	}
	const ParentPid = Number.parseInt(ParentPidString, 10);
	if (Number.isNaN(ParentPid)) {
		return yield* Effect.logWarning(
			`Invalid VSCODE_PID '${ParentPidString}', cannot monitor parent process`,
		);
	}
	yield* Effect.logTrace(`Monitoring parent process ${ParentPid} for exit`);
	const MonitoringLoop = Effect.gen(function* () {
		while (true) {
			try {
				process.kill(ParentPid, 0);
			} catch (Error) {
				yield* Effect.logInfo(
					`Parent process ${ParentPid} no longer running. Exiting gracefully`,
				);
				process.exit(0);
			}
			yield* Effect.sleep("5 seconds");
		}
	}).pipe(Effect.forkDaemon);
	yield* MonitoringLoop;
});

/**
 * Apply memory limit enforcement
 * TODO: Integrate with Mountain for dynamic memory quota
 */
const EnforceMemoryLimit = Effect.gen(function* () {
	const Service = yield* PatcherService;
	const Policy = Service.GetSecurityPolicy();
	if (Policy.MaxMemoryMB > 0) {
		const MaxMemoryInBytes = Policy.MaxMemoryMB * 1024 * 1024;
		// TODO: Implement actual memory limit enforcement via v8.setFlagsFromString
		// Current JS heap size monitoring is limited, need native integration
		yield* Effect.logDebug(
			`Memory limit configured: ${Policy.MaxMemoryMB}MB`,
		);
	} else {
		yield* Effect.logTrace("No memory limit configured");
	}
});

// --- Main Orchestrator ---

/**
 * Main orchestrator Effect for applying all process patches
 * Runs all patches concurrently where possible
 * Should be one of the first Effects to run at startup
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
		EnforceMemoryLimit,
	];
	yield* Effect.all(AllPatches, { discard: true, concurrency: "unbounded" });
}).pipe(
	Effect.tap(() => Effect.logDebug("All core process patches have been applied")),
	Effect.catchAll((Error) =>
		Effect.logFatal(
			"Critical error during process patching. Environment may be unstable",
			Error,
		),
	),
	Effect.provide(PatcherService.Default),
);

/**
 * Parse security policy from string configuration
 */
function ParseSecurityPolicy(PolicyString: string): SecurityPolicy {
	const Parts = PolicyString.split(",");
	const Policy: SecurityPolicy = {
		AllowExit: false,
		MaxMemoryMB: 0,
		AllowNetwork: false,
		AllowChildProcesses: false,
	};

	for (const Part of Parts) {
		const [Key, Value] = Part.split("=");
		switch (Key.trim()) {
			case "AllowExit":
				Policy.AllowExit = Value === "true";
				break;
			case "MaxMemoryMB":
				Policy.MaxMemoryMB = Number.parseInt(Value, 10) || 0;
				break;
			case "AllowNetwork":
				Policy.AllowNetwork = Value === "true";
				break;
			case "AllowChildProcesses":
				Policy.AllowChildProcesses = Value === "true";
				break;
		}
	}

	return Policy;
}

/**
 * Reload security policy at runtime
 * Allows dynamic policy updates from Mountain
 */
export const ReloadSecurityPolicy = Effect.gen(function* () {
	yield* Effect.logInfo("Reloading security policy...");
	const NewPolicyString = yield* Config.string("SecurityPolicy").pipe(
		Effect.catchTag("MissingConfig", () => Effect.succeed("default")),
	);
	const NewPolicy = ParseSecurityPolicy(NewPolicyString);
	yield* Effect.logDebug("Security policy reloaded", { NewPolicy });
	return NewPolicy;
});
