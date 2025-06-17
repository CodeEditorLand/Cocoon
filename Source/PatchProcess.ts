/*
 * File: Cocoon/Source/PatchProcess.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 11:22:56 UTC
 * Dependency: ./PatchProcess/BlockNativesModule.js, ./PatchProcess/HandleException.js, ./PatchProcess/Live.js, ./PatchProcess/PatchProcessCrash.js, ./PatchProcess/PatchProcessExit.js, ./PatchProcess/PipeLogging.js, ./PatchProcess/SetElectronRunAsNode.js, ./PatchProcess/SetStackTraceLimit.js, ./PatchProcess/SetupEnvironment.js, ./PatchProcess/TerminateOnParentExit.js, effect
 */

import { Effect } from "effect";

import BlockNativesModule from "./PatchProcess/BlockNativesModule.js";
import HandleException from "./PatchProcess/HandleException.js";
import ProcessPatchLive from "./PatchProcess/Live.js";
import PatchProcessCrash from "./PatchProcess/PatchProcessCrash.js";
import PatchProcessExit from "./PatchProcess/PatchProcessExit.js";
import PipeLogging from "./PatchProcess/PipeLogging.js";
import SetElectronRunAsNode from "./PatchProcess/SetElectronRunAsNode.js";
import SetStackTraceLimit from "./PatchProcess/SetStackTraceLimit.js";
import SetupEnvironment from "./PatchProcess/SetupEnvironment.js";
import TerminateOnParentExit from "./PatchProcess/TerminateOnParentExit.js";

/**
 * The main orchestrator `Effect` that composes all individual process-level patches.
 *
 * This should be one of the very first `Effect`s run at application startup. It
 * runs all patches concurrently where possible and ensures that the Node.js
 * environment is stable, secure, and properly configured before any extension
 * code is loaded.
 */
export default Effect.gen(function* () {
	// Effects that require the ProcessPatch service must be provided with its layer.
	const PatchesWithDeps = Effect.all([PatchProcessCrash, PatchProcessExit], {
		discard: true,
		concurrency: "unbounded",
	}).pipe(
		// The policy here prevents extensions from exiting the host process.
		Effect.provide(ProcessPatchLive(() => false)),
	);

	// Effects without special dependencies can be run directly.
	const PatchesWithoutDeps = Effect.all(
		[
			SetStackTraceLimit,
			SetupEnvironment,
			SetElectronRunAsNode,
			BlockNativesModule,
			PipeLogging,
			HandleException,
			TerminateOnParentExit,
		],
		{ discard: true, concurrency: "unbounded" },
	);

	yield* Effect.all([PatchesWithoutDeps, PatchesWithDeps], {
		discard: true,
		concurrency: "unbounded",
	});
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
