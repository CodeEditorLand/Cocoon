import { Effect } from "effect";
import { BlockNativesModule } from "./BlockNativesModule.js";
import { HandleExceptions } from "./HandleExceptions.js";
import { PatchProcessCrash } from "./PatchProcessCrash.js";
import { PatchProcessExit } from "./PatchProcessExit.js";
import { PipeLoggingToParent } from "./PipeLogging.js";
import { SetElectronRunAsNode } from "./SetElectronRunAsNode.js";
import { SetStackTraceLimit } from "./SetStackTraceLimit.js";
import { SetupEnvironment } from "./SetupEnvironment.js";
import { TerminateOnParentExit } from "./TerminateOnParentExit.js";
export * from "./BlockNativesModule.js";
import * as ProcessError from "./Error/mod.js";
export * from "./HandleExceptions.js";
export * from "./PatchProcessCrash.js";
export * from "./PatchProcessExit.js";
export * from "./PipeLogging.js";
import * as ProcessPatch from "./ProcessPatch/mod.js";
export * from "./SetElectronRunAsNode.js";
export * from "./SetStackTraceLimit.js";
export * from "./SetupEnvironment.js";
export * from "./TerminateOnParentExit.js";
const RunProcessPatches = Effect.all(
  [
    // These patches have no dependencies and can run immediately.
    SetStackTraceLimit,
    SetupEnvironment,
    SetElectronRunAsNode,
    BlockNativesModule,
    // These patches may depend on services like IpcProvider.
    PipeLoggingToParent,
    HandleExceptions,
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
  RunProcessPatches
};
//# sourceMappingURL=mod.js.map
