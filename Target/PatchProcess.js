import { Effect } from "effect";
import BlockNativesModule from "./PatchProcess/BlockNativesModule.js";
import HandleException from "./PatchProcess/HandleException.js";
import PatchProcessCrash from "./PatchProcess/PatchProcessCrash.js";
import PatchProcessExit from "./PatchProcess/PatchProcessExit.js";
import PipeLogging from "./PatchProcess/PipeLogging.js";
import { Live as ProcessPatchLive } from "./PatchProcess/ProcessPatch.js";
import SetElectronRunAsNode from "./PatchProcess/SetElectronRunAsNode.js";
import SetStackTraceLimit from "./PatchProcess/SetStackTraceLimit.js";
import SetupEnvironment from "./PatchProcess/SetupEnvironment.js";
import TerminateOnParentExit from "./PatchProcess/TerminateOnParentExit.js";
var PatchProcess_default = Effect.gen(function* () {
  const PatchesWithDeps = Effect.all([PatchProcessCrash, PatchProcessExit], {
    discard: true,
    concurrency: "unbounded"
  }).pipe(
    // The policy here prevents extensions from exiting the host process.
    Effect.provide(ProcessPatchLive(() => false))
  );
  const PatchesWithoutDeps = Effect.all(
    [
      SetStackTraceLimit,
      SetupEnvironment,
      SetElectronRunAsNode,
      BlockNativesModule,
      PipeLogging,
      HandleException,
      TerminateOnParentExit
    ],
    { discard: true, concurrency: "unbounded" }
  );
  yield* Effect.all([PatchesWithoutDeps, PatchesWithDeps], {
    discard: true,
    concurrency: "unbounded"
  });
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
