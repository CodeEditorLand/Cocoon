import { Effect } from "effect";
const TerminateOnParentExit = Effect.gen(function* () {
  const ParentPIDString = process.env["VSCODE_PID"];
  if (!ParentPIDString) {
    return yield* Effect.logTrace(
      "No `VSCODE_PID` found, skipping parent exit monitoring."
    );
  }
  const ParentPID = Number.parseInt(ParentPIDString, 10);
  if (Number.isNaN(ParentPID)) {
    return yield* Effect.logWarning(
      `Invalid VSCODE_PID '${ParentPIDString}', cannot monitor parent process.`
    );
  }
  yield* Effect.logTrace(`Monitoring parent process ${ParentPID} for exit.`);
  const MonitoringLoop = Effect.gen(function* () {
    while (true) {
      try {
        process.kill(ParentPID, 0);
      } catch (Error) {
        yield* Effect.logInfo(
          `Parent process ${ParentPID} is no longer running. Exiting Cocoon gracefully.`
        );
        process.exit(0);
      }
      yield* Effect.sleep("5 seconds");
    }
  }).pipe(Effect.forkDaemon);
  yield* MonitoringLoop;
});
var TerminateOnParentExit_default = TerminateOnParentExit;
export {
  TerminateOnParentExit_default as default
};
//# sourceMappingURL=TerminateOnParentExit.js.map
