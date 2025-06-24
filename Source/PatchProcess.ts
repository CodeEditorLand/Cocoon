/*
 * File: Cocoon/Source/PatchProcess.ts
 * Role: Main Orchestrator for Process-Level Patches
 * Responsibilities:
 *   - This file defines the main orchestrator `Effect` that composes and applies
 *     all individual process-level patches at application startup.
 *   - It ensures the Node.js environment is stable, secure, and properly
 *     configured before any extension code is loaded.
 */

import { Effect, Layer } from "effect";

import { BlockNativesModule } from "./PatchProcess/BlockNativesModule.js";
import { HandleException } from "./PatchProcess/HandleException.js";
import { Live as ProcessPatchLive } from "./PatchProcess/Live.js";
import { PatchProcessCrash } from "./PatchProcess/PatchProcessCrash.js";
import { PatchProcessExit } from "./PatchProcess/PatchProcessExit.js";
import { PipeLogging } from "./PatchProcess/PipeLogging.js";
import { SetElectronRunAsNode } from "./PatchProcess/SetElectronRunAsNode.js";
import { SetStackTraceLimit } from "./PatchProcess/SetStackTraceLimit.js";
import { SetupEnvironment } from "./PatchProcess/SetupEnvironment.js";
import { TerminateOnParentExit } from "./PatchProcess/TerminateOnParentExit.js";

/**
 * A `Layer` that provides the necessary services for the patching process.
 * This includes the `ProcessPatch` service itself, which other patches depend on.
 */
const PatchLayer = Layer.mergeAll(ProcessPatchLive);

/**
 * The main orchestrator `Effect` for applying all core process patches.
 *
 * It runs all patches concurrently where possible, providing them with their
 * required services via the `PatchLayer`. This `Effect` should be one of the
 * very first to run at application startup.
 */
export const RunProcessPatch = Effect.gen(function* (Generator) {
	// A list of all patch effects to be applied.
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

	// Run all patches concurrently, providing them with their required services.
	yield* Generator(
		Effect.all(AllPatches, {
			discard: true,
			concurrency: "unbounded",
		}).pipe(Effect.provide(PatchLayer)),
	);
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
);
