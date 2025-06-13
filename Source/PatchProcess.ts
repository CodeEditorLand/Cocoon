/**
 * @module PatchProcess
 * @description Provides low-level patches and setup for the Node.js process,
 * ensuring it behaves correctly as an extension host. This logic is
 * synthesized from VS Code's `bootstrap-node.ts` and `bootstrap-fork.ts`.
 *
 * The main export is `RunProcessPatch`, an `Effect` that composes all individual
 * patches into a single, runnable workflow for application startup.
 */

import { Effect } from "effect";

import { BlockNativesModule } from "./PatchProcess/BlockNativesModule.js";
import { HandleException } from "./PatchProcess/HandleException.js";
import { PatchProcessCrash } from "./PatchProcess/PatchProcessCrash.js";
import { PatchProcessExit } from "./PatchProcess/PatchProcessExit.js";
import { PipeLogging } from "./PatchProcess/PipeLogging.js";
import { SetElectronRunAsNode } from "./PatchProcess/SetElectronRunAsNode.js";
import { SetStackTraceLimit } from "./PatchProcess/SetStackTraceLimit.js";
import { SetupEnvironment } from "./PatchProcess/SetupEnvironment.js";
import { TerminateOnParentExit } from "./PatchProcess/TerminateOnParentExit.js";

// --- Re-export individual patches for granular use or testing if needed ---
export * from "./PatchProcess/BlockNativesModule.js";
export * as ProcessError from "./PatchProcess/Error/ExitPreventedError.js"; // Simplified re-export
export * from "./PatchProcess/HandleException.js";
export * from "./PatchProcess/PatchProcessCrash.js";
export * from "./PatchProcess/PatchProcessExit.js";
export * from "./PatchProcess/PipeLogging.js";
export * as ProcessPatch from "./PatchProcess/ProcessPatch.js";
export * from "./PatchProcess/SetElectronRunAsNode.js";
export * from "./PatchProcess/SetStackTraceLimit.js";
export * from "./PatchProcess/SetupEnvironment.js";
export * from "./PatchProcess/TerminateOnParentExit.js";

/**
 * The main orchestrator `Effect` that composes all individual process-level
 * patches.
 *
 * This should be one of the very first `Effect`s run at application startup. It
 * runs all patches concurrently where possible and ensures that the Node.js
 * environment is stable, secure, and properly configured before any extension
 * code is loaded.
 */
export const RunProcessPatch = Effect.all(
	[
		// These patches have no dependencies and can run immediately.
		SetStackTraceLimit,
		SetupEnvironment,
		SetElectronRunAsNode,
		BlockNativesModule,

		// These patches may depend on services like IPC.
		PipeLogging,
		HandleException,

		// These patches depend on the ProcessPatch service.
		PatchProcessCrash,
		PatchProcessExit,

		// This should run last as it starts a background monitoring loop.
		TerminateOnParentExit,
	],
	{ discard: true, concurrency: "unbounded" }, // Run independent patches in parallel.
).pipe(
	Effect.tap(() =>
		Effect.logDebug("All core process patches have been applied."),
	),
	Effect.catchAll((Error) =>
		Effect.logFatal(
			"A critical error occurred during the bootstrap process patching. The environment may be unstable.",
			Error,
		),
	),
);
