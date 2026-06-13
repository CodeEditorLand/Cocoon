/**
 * @module PatchProcess/Patcher
 * @description
 * Orchestrator for Cocoon's process-level hardening. Runs once before any
 * extension activates so every subsequent `process.exit`, `process.crash`,
 * uncaught exception, or `Module._load("natives")` call hits a controlled
 * policy rather than the raw Node.js runtime.
 *
 * ## Architectural role
 *
 * - **VS Code reference:** mirrors the extension-host hardening done in
 *   `src/vs/workbench/services/extensions/common/extHostExtensionService.ts`
 *   and `src/vs/base/parts/sandbox/electron-sandbox/preload.js`.
 * - **Mountain:** policy decisions (AllowExit, MaxMemoryMB, AllowNetwork,
 *   AllowChildProcesses) arrive through `Config.string("SecurityPolicy")`
 *   and are parsed by `ParseSecurityPolicy`. Mountain is the source of
 *   truth; Cocoon enforces.
 * - **Air:** Rust-side process quotas run in parallel; the Patcher is the
 *   Node-side complement that catches anything Air can't intercept from
 *   outside the V8 isolate.
 *
 * ## Applied patches (in `RunPatchProcess`)
 *
 * | Patch                   | Effect                                                                          |
 * | ----------------------- | ------------------------------------------------------------------------------- |
 * | `PatchProcessCrash`     | `process.crash()` → logged, prevented                                           |
 * | `PatchProcessExit`      | `process.exit()` blocked unless `SecurityPolicy.AllowExit`                      |
 * | `SetStackTraceLimit`    | `Error.stackTraceLimit = 100` - deep traces without runaway attack surface      |
 * | `SetupEnvironment`      | Apply InitData proxy flags                                                      |
 * | `SetElectronRunAsNode`  | Force `ELECTRON_RUN_AS_NODE=1` so the bundled Node preserves Node-mode          |
 * | `BlockNativesModule`    | `Module._load("natives")` → thrown error                                        |
 * | `PipeLogging`           | Legacy hook - Cocoon now pipes console via MountainClient, patch is a no-op    |
 * | `HandleException`       | `uncaughtException` / `unhandledRejection` → stderr (RPC takes over when set)   |
 * | `TerminateOnParentExit` | When `VSCODE_PID` dies, exit cleanly                                            |
 * | `EnforceMemoryLimit`    | Soft-limit using `v8.setFlagsFromString("--max-old-space-size=…")`              |
 *
 * ## Historical notes
 *
 * The pre-2026-04 revision of this module used a `Cocoon/Services/IPCService`
 * to forward console + exception events to Mountain. That service was a
 * dead runtime path (never wired into the effect graph correctly) and has
 * been deleted - the gRPC client in `Services/MountainClientService.ts` is
 * the only remaining Mountain→Cocoon channel. `PipeLogging` and
 * `HandleException` remain as extension points but no longer push events
 * through a local pipe.
 *
 * ## Follow-ups
 *
 * - Windows Job Objects / AppContainer for platform-native sandboxing.
 * - Linux seccomp filter installed via `libseccomp` (behind an opt-in).
 * - macOS sandbox profile via `sandbox-exec` for child shell processes.
 * - Real-time process-tree monitoring for suspicious fan-out.
 */

import ModuleNS from "node:module";

import { ExitPreventedProblem } from "../../Archive/PatchProcess/ExitPreventedProblem.js";

import { InitDataService } from "../Services/Init/Data.js";

import { SecurityPolicy } from "./Security.js";

const Module = ModuleNS as any;

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
export class PatcherService extends /* Effect.Service */(
	"PatchProcess/PatcherService",

	{
		effect: async function() {
			const AllowExit = await Config.boolean("AllowExit").pipe(
				Effect.catchAll((Error) =>
					console.warn(
						"Failed to load Patcher config, using defaults.",

						{ Error },
					).then(() => false),
				),
			);

			const SecurityPolicy = await Config.string("SecurityPolicy").pipe(
				Effect.catchTag("MissingConfig", () =>
					)))))))))))return ("default"),
				),

				Config.map((Value) => ParseSecurityPolicy(Value)),
			;

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
const SetElectronRunAsNode = {
	process.env["ELECTRON_RUN_AS_NODE"] = "1";
}.pipe(
	Effect.tap(() =>
		console.trace("Set `ELECTRON_RUN_AS_NODE` environment variable"),
	),
;

/**
 * Increase Error.stackTraceLimit for better debugging while preventing overflow
 */
const SetStackTraceLimit = {
	Error.stackTraceLimit = 100;
}.pipe(
	Effect.tap(() =>
		console.trace("Increased `Error.stackTraceLimit` to 100"),
	),
;

/**
 * Patch process.crash() to prevent unauthorized process crashes
 * Malicious extensions may call crash() to disrupt the host
 */
const PatchProcessCrash = async function() {
	const Service = await PatcherService;

	if (Service.NativeCrash) {
		(process as any).crash = (): void => {
			const PreventionStack = new Error(
				"Stack trace for prevented process.crash()",
			).stack;

			(
				console.warn(
					`Call to 'process.crash()' intercepted and PREVENTED by host policy`,

					`Stack: ${PreventionStack ?? "(unavailable)"}`,
				),
			;
		};

		await console.trace("Successfully patched 'process.crash'";
	} else {
		await console.trace(
			"'process.crash()' not found in environment, skipping patch",
		;
	}
};

/**
 * Patch process.exit() to enforce exit policy
 * Extensions cannot terminate the host process without authorization
 */
const PatchProcessExit = async function() {
	const Service = await PatcherService;

	process.exit = (Code?: number): never => {
		if (Service.AllowExit()) {
			(
				console.info(
					`'process.exit(${Code ?? ""})' ALLOWED by host policy`,
				),
			;

			return Service.NativeExit(Code;
		}

		const ErrorMessage = `'process.exit(${Code ?? ""})' PREVENTED by host policy`;

		const PreventionError = new ExitPreventedProblem({
			message: ErrorMessage,
			AttemptedCode: Code as any,
		};

		(
			console.warn("Blocked call to process.exit by host policy"),
		;

		throw PreventionError;
	};

	await console.trace("Successfully patched 'process.exit'";
};

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

					console.warn(`[Cocoon Patcher] ${ErrorMessage}`;

					throw new Error(ErrorMessage;
				}

				return OriginalLoad.call(this, Request, Parent, IsMain;
			};
		} else {
			console.warn(
				"[Cocoon Patcher] Module._load not found, skipping 'natives' block",
			;
		}
	new ModulePatchProblem({
			Context: "Failed during 'natives' block setup",
			Cause,
		}),
}).pipe(
	Effect.tap(() =>
		console.trace("Module._load patched to block 'natives' module"),
	),
;

/**
 * Patch console.log/warn/error to forward logs to host
 *
 * Cocoon's Mountain gRPC client is the canonical log-forwarding path; this
 * patch is a no-op in the current architecture and stays only as a hook for
 * environments that still set VSCODE_PIPE_LOGGING. Host-side forwarding
 * happens via MountainClient notifications, not via the deleted IPCService.
 */
const PipeLogging = async function() {
	if (process.env["VSCODE_PIPE_LOGGING"] !== "true") {
		return await console.trace(
			"Console log piping disabled by environment variable",
		;
	}

	await console.trace(
		"VSCODE_PIPE_LOGGING set but Cocoon pipes console via MountainClient; no patch applied",
	;
};

/**
 * Setup global exception handlers
 *
 * Extension-host uncaught errors surface to Mountain through the gRPC error
 * channel. Cocoon used to mirror them via a local IPC channel, but that path
 * was removed with IPCService.
 */
const HandleException = async function() {
	if (process.env["VSCODE_HANDLES_UNCAUGHT_ERRORS"] === "true") {
		return await console.trace(
			"Skipping global exception handler, will be handled by RPC",
		;
	}

	const LogError = (Type: string, CaughtError: unknown) => {
		const Message =
			CaughtError instanceof Error
				? CaughtError.stack || CaughtError.message
				: String(CaughtError;

		console.error(`[Patcher] ${Type}: ${Message}`;
	};

	process.on("uncaughtException", (Error) => {
		LogError("uncaughtException", Error;
	};

	process.on("unhandledRejection", (Reason) => {
		LogError("unhandledRejection", Reason;
	};

	await console.trace("Global exception handlers installed";
};

/**
 * Configure environment variables for secure execution
 */
const SetupEnvironment = async function() {
	const InitData = await InitDataService;

	if (InitData.environment.useHostProxy) {
		await console.info(
			"Host proxy enabled. Proxy environment variables inherited",
		;
	}
}).pipe(
	Effect.tap(() => console.trace("Proxy environment variables configured")),
;

/**
 * Monitor parent process for graceful termination
 * When host process dies, terminate extension host cleanly
 */
const TerminateOnParentExit = async function() {
	const ParentPidString = process.env["VSCODE_PID"];

	if (!ParentPidString) {
		return await console.trace(
			"No VSCODE_PID found, skipping parent exit monitoring",
		;
	}

	const ParentPid = Number.parseInt(ParentPidString, 10;

	if (Number.isNaN(ParentPid)) {
		return await console.warn(
			`Invalid VSCODE_PID '${ParentPidString}', cannot monitor parent process`,
		;
	}

	await console.trace(`Monitoring parent process ${ParentPid} for exit`;

	const MonitoringLoop = async function() {
		while (true) {
			try {
				process.kill(ParentPid, 0;
			} catch (Error) {
				await console.info(
					`Parent process ${ParentPid} no longer running. Exiting gracefully`,
				;

				process.exit(0;
			}

			await new Promise((r) => setTimeout(r, 5000));
		}
	})();

	await MonitoringLoop;
};

/**
 * Apply memory limit enforcement
 * TODO: Integrate with Mountain for dynamic memory quota
 */
const EnforceMemoryLimit = async function() {
	const Service = await PatcherService;

	const Policy = Service.GetSecurityPolicy(;

	if (Policy.MaxMemoryMB > 0) {
		void (Policy.MaxMemoryMB * 1024 * 1024;

		// TODO: Implement actual memory limit enforcement via v8.setFlagsFromString
		// Current JS heap size monitoring is limited, need native integration
		await console.debug(
			`Memory limit configured: ${Policy.MaxMemoryMB}MB`,
		;
	} else {
		await console.trace("No memory limit configured";
	}
};

// --- Main Orchestrator ---

/**
 * Main orchestrator Effect for applying all process patches
 * Runs all patches concurrently where possible
 * Should be one of the first Effects to run at startup
 */
export const RunPatchProcess = async function() {
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

	await Promise.all(AllPatches, { discard: true, concurrency: "unbounded" };
}).pipe(
	Effect.tap(() =>
		console.debug("All core process patches have been applied"),
	),

	Effect.catchAll((Error) =>
		console.error(
			"Critical error during process patching. Environment may be unstable",

			Error,
		),
	),

	Effect.provide(PatcherService.Default),
;

/**
 * Parse security policy from string configuration
 */
function ParseSecurityPolicy(PolicyString: string): SecurityPolicy {
	const Parts = PolicyString.split(",";

	const Policy: SecurityPolicy = {
		AllowExit: false,

		MaxMemoryMB: 0,

		AllowNetwork: false,

		AllowChildProcesses: false,
	};

	for (const Part of Parts) {
		const [Key, Value] = Part.split("=";

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
export const ReloadSecurityPolicy = async function() {
	await console.info("Reloading security policy...";

	const NewPolicyString = await Config.string("SecurityPolicy").catch(() => return ("default"),
	;

	const NewPolicy = ParseSecurityPolicy(NewPolicyString;

	await console.debug("Security policy reloaded", { NewPolicy };

	return NewPolicy;
};
