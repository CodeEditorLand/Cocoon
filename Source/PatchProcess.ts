

import { Effect, Layer } from "effect";

import BlockNativesModuleEffect from "./PatchProcess/BlockNativesModule.js";
import HandleExceptionEffect from "./PatchProcess/HandleException.js";
import ProcessPatchLive from "./PatchProcess/Live.js";
import PatchProcessCrashEffect from "./PatchProcess/PatchProcessCrash.js";
import PatchProcessExitEffect from "./PatchProcess/PatchProcessExit.js";
import PipeLoggingEffect from "./PatchProcess/PipeLogging.js";
import SetElectronRunAsNodeEffect from "./PatchProcess/SetElectronRunAsNode.js";
import SetStackTraceLimitEffect from "./PatchProcess/SetStackTraceLimit.js";
import SetupEnvironmentEffect from "./PatchProcess/SetupEnvironment.js";
import TerminateOnParentExitEffect from "./PatchProcess/TerminateOnParentExit.js";

/**
 * A layer that provides the necessary services for the patching process.
 * This includes the ProcessPatchService itself, which other patches depend on.
 */
const PatchLayer = Layer.mergeAll(ProcessPatchLive);

/**
 * The main orchestrator `Effect` that composes all individual process-level patches.
 *
 * This should be one of the very first `Effect`s run at application startup. It
 * runs all patches concurrently where possible and ensures that the Node.js
 * environment is stable, secure, and properly configured before any extension
 * code is loaded.
 */
export default Effect.gen(function* (G) {
	// All patches are now simple effects that declare their own dependencies.
	// The runtime will provide the necessary services via layers.
	const AllPatches = [
		PatchProcessCrashEffect,
		PatchProcessExitEffect,
		SetStackTraceLimitEffect,
		SetupEnvironmentEffect,
		SetElectronRunAsNodeEffect,
		BlockNativesModuleEffect,
		PipeLoggingEffect,
		HandleExceptionEffect,
		TerminateOnParentExitEffect,
	];

	// Run all patches concurrently, providing them with their required services.
	yield* G(
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
