var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Schedule } from "effect";
import { ProcessPatchError } from "./Error/mod.js";
const WatchdogLoop = Effect.gen(function* (_) {
  const ParentPid = Number(process.env["VSCODE_PARENT_PID"]);
  if (isNaN(ParentPid) || ParentPid <= 0) {
    yield* _(
      Effect.logWarn(
        "VSCODE_PARENT_PID is invalid, cannot monitor parent process."
      )
    );
    return;
  }
  yield* _(
    Effect.logDebug(`Monitoring parent process with PID: ${ParentPid}`)
  );
  const CheckParent = Effect.try({
    try: /* @__PURE__ */ __name(() => {
      process.kill(ParentPid, 0);
    }, "try"),
    catch: /* @__PURE__ */ __name((cause) => new ProcessPatchError({
      context: "ParentProcessNotFound",
      cause
    }), "catch")
  });
  yield* _(
    CheckParent.pipe(
      Effect.repeat({ schedule: Schedule.spaced("5 seconds") })
    )
  );
}).pipe(
  // If CheckParent ever fails (i.e., the parent is gone), this will be triggered.
  Effect.catchTag(
    "ProcessPatchError",
    () => Effect.gen(function* (_) {
      yield* _(
        Effect.logInfo(
          "Parent process has exited. Terminating Cocoon process."
        )
      );
      yield* _(Effect.sleep("50ms"));
      return yield* _(Effect.sync(() => process.exit(0)));
    })
  )
);
const TerminateOnParentExit = Effect.if(
  !!process.env["VSCODE_PARENT_PID"],
  {
    onTrue: Effect.forkDaemon(WatchdogLoop),
    onFalse: Effect.unit
  }
);
export {
  TerminateOnParentExit
};
//# sourceMappingURL=TerminateOnParentExit.js.map
