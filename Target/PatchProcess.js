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
export * from "./PatchProcess/BlockNativesModule.js";
import * as ProcessError from "./PatchProcess/Error/ExitPreventedError.js";
export * from "./PatchProcess/HandleException.js";
export * from "./PatchProcess/PatchProcessCrash.js";
export * from "./PatchProcess/PatchProcessExit.js";
export * from "./PatchProcess/PipeLogging.js";
import * as ProcessPatch from "./PatchProcess/ProcessPatch.js";
export * from "./PatchProcess/SetElectronRunAsNode.js";
export * from "./PatchProcess/SetStackTraceLimit.js";
export * from "./PatchProcess/SetupEnvironment.js";
export * from "./PatchProcess/TerminateOnParentExit.js";
const RunProcessPatch = Effect.all(
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
    TerminateOnParentExit
  ],
  { discard: true, concurrency: "unbounded" }
  // Run independent patches in parallel.
).pipe(
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
  ProcessError,
  ProcessPatch,
  RunProcessPatch
};
//# sourceMappingURL=PatchProcess.js.map
