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
const PatchLayer = Layer.mergeAll(ProcessPatchLive);
var PatchProcess_default = Effect.gen(function* (G) {
  const AllPatches = [
    PatchProcessCrashEffect,
    PatchProcessExitEffect,
    SetStackTraceLimitEffect,
    SetupEnvironmentEffect,
    SetElectronRunAsNodeEffect,
    BlockNativesModuleEffect,
    PipeLoggingEffect,
    HandleExceptionEffect,
    TerminateOnParentExitEffect
  ];
  yield* G(
    Effect.all(AllPatches, {
      discard: true,
      concurrency: "unbounded"
    }).pipe(Effect.provide(PatchLayer))
  );
}).pipe(
  Effect.tap(
    () => Effect.logDebug("All core process patches have been applied.")
  ),
  Effect.catchAll(
    (Error) => Effect.logFatal(
      "A critical error occurred during the bootstrap process patching. The environment may be unstable.",
      Error
    )
  )
);
export {
  PatchProcess_default as default
};
//# sourceMappingURL=PatchProcess.js.map
