var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Window/Progress.ts
import { Effect } from "effect";
var WithProgress = /* @__PURE__ */ __name((MountainClient, Logger, Options, Task) => Effect.gen(function* () {
  const ProgressId = `progress-${crypto.randomUUID()}`;
  yield* Logger.Info(
    `[WindowService] Starting progress: ${Options.location} (${ProgressId})`
  );
  const CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: /* @__PURE__ */ __name((_Listener) => ({
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "onCancellationRequested")
  };
  const ProgressReporter = {
    report(Value) {
      MountainClient.sendNotification("progress.update", {
        id: ProgressId,
        message: Value.message,
        increment: Value.increment
      }).catch(() => {
      });
    }
  };
  yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => MountainClient.sendNotification("progress.start", {
      id: ProgressId,
      location: Options.location,
      title: Options.title,
      cancellable: Options.cancellable ?? false
    }), "try"),
    catch: /* @__PURE__ */ __name(() => new Error("Failed to start progress"), "catch")
  });
  const Result = yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => Task(ProgressReporter, CancellationToken), "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Progress task failed: ${Error_.message}`
      );
    }, "catch")
  });
  yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => MountainClient.sendNotification("progress.complete", {
      id: ProgressId
    }), "try"),
    catch: /* @__PURE__ */ __name(() => new Error("Failed to complete progress"), "catch")
  });
  return Result;
}), "WithProgress");
export {
  WithProgress
};
//# sourceMappingURL=Progress.js.map
