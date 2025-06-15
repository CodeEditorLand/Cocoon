var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
const TelemetryLevel = {
  NONE: 0,
  OFF: 0,
  // Assuming OFF is an alias for NONE
  ERROR: 1,
  USAGE: 2
};
var Definition_default = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const TelemetryLevelValue = InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
  const ProductConfig = InitData.product?.telemetryOptOut;
  const ShouldSendEvent = /* @__PURE__ */ __name((Type) => {
    if (TelemetryLevelValue === TelemetryLevel.NONE) {
      return false;
    }
    if (Type === "error" && ProductConfig?.error === true) {
      return false;
    }
    if (Type === "usage" && ProductConfig?.usage === true) {
      return false;
    }
    return true;
  }, "ShouldSendEvent");
  const LogPublicEvent = /* @__PURE__ */ __name((EventName, Data) => Log.Debug(`Telemetry event: '${EventName}'`, Data).pipe(
    Effect.flatMap(
      () => Effect.when(
        () => IPC.SendNotification("$publicLog", [EventName, Data]),
        () => ShouldSendEvent("usage")
      )
    ),
    Effect.catchAll(() => Effect.void)
  ), "LogPublicEvent");
  const LogExtensionError = /* @__PURE__ */ __name((Extension, CaughtError) => {
    const SerializableError = CaughtError instanceof Error ? {
      name: CaughtError.name,
      message: CaughtError.message,
      stack: CaughtError.stack
    } : CaughtError;
    return Log.Error(
      `Extension error reported for '${Extension.value}'.`,
      SerializableError
    ).pipe(
      Effect.flatMap(
        () => Effect.when(
          () => IPC.SendNotification("$onExtensionError", [
            Extension.value,
            SerializableError
          ]),
          () => ShouldSendEvent("error")
        )
      ),
      Effect.catchAll(() => Effect.void)
    );
  }, "LogExtensionError");
  const TelemetryImplementation = {
    _serviceBrand: void 0,
    getTelemetryInfo: /* @__PURE__ */ __name(() => Promise.resolve(InitData.telemetryInfo), "getTelemetryInfo"),
    setEnabled: /* @__PURE__ */ __name(() => {
    }, "setEnabled"),
    publicLog: /* @__PURE__ */ __name((EventName, Data) => {
      Effect.runFork(LogPublicEvent(EventName, Data));
    }, "publicLog"),
    publicLog2: /* @__PURE__ */ __name((EventName, Data) => {
      Effect.runFork(LogPublicEvent(EventName, Data));
    }, "publicLog2"),
    onExtensionError: /* @__PURE__ */ __name((Extension, Error2) => {
      Effect.runFork(LogExtensionError(Extension, Error2));
      return false;
    }, "onExtensionError")
  };
  return TelemetryImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
