var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import InitDataService from "../InitData/Service.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
const ToLevel = /* @__PURE__ */ __name((logLevel) => {
  switch (logLevel) {
    case 0:
      return TelemetryLevel.NONE;
    case 1:
    // Trace
    case 2:
    // Debug
    case 3:
      return TelemetryLevel.USAGE;
    case 4:
      return TelemetryLevel.ERROR;
    case 5:
      return TelemetryLevel.ERROR;
    default:
      return TelemetryLevel.NONE;
  }
}, "ToLevel");
var Definition_default = Effect.gen(function* () {
  const InitData = yield* InitDataService;
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const telemetryLevelRef = yield* Ref.make(
    ToLevel(InitData.logLevel)
  );
  const productConfigRef = yield* Ref.make({ usage: true, error: true });
  const ShouldSendEvent = /* @__PURE__ */ __name((Type) => Effect.gen(function* () {
    const level = yield* Ref.get(telemetryLevelRef);
    if (level < TelemetryLevel.ERROR) {
      return false;
    }
    const config = yield* Ref.get(productConfigRef);
    if (Type === "error" && !config.error) {
      return false;
    }
    if (Type === "usage" && level < TelemetryLevel.USAGE) {
      return false;
    }
    if (Type === "usage" && !config.usage) {
      return false;
    }
    return true;
  }), "ShouldSendEvent");
  const LogExtensionError = /* @__PURE__ */ __name((Extension, CaughtError) => {
    const SerializableError = CaughtError instanceof Error ? {
      name: CaughtError.name,
      message: CaughtError.message,
      stack: CaughtError.stack ?? "",
      $isError: true,
      noTelemetry: false
    } : CaughtError;
    return Effect.whenEffect(
      Log.Error(
        `Extension error reported for '${Extension.value}'.`,
        SerializableError
      ).pipe(
        Effect.flatMap(
          () => IPC.SendNotification("$onExtensionError", [
            Extension,
            SerializableError
          ])
        )
      ),
      ShouldSendEvent("error")
    ).pipe(Effect.catchAll(() => Effect.void));
  }, "LogExtensionError");
  const TelemetryImplementation = {
    _serviceBrand: void 0,
    _onDidChangeTelemetryEnabled: void 0,
    onDidChangeTelemetryEnabled: void 0,
    _onDidChangeTelemetryConfiguration: void 0,
    onDidChangeTelemetryConfiguration: void 0,
    getTelemetryConfiguration: /* @__PURE__ */ __name(() => {
      const level = Effect.runSync(Ref.get(telemetryLevelRef));
      return level >= TelemetryLevel.USAGE;
    }, "getTelemetryConfiguration"),
    getTelemetryDetails: /* @__PURE__ */ __name(() => {
      const level = Effect.runSync(Ref.get(telemetryLevelRef));
      const config = Effect.runSync(Ref.get(productConfigRef));
      return {
        isCrashEnabled: level >= TelemetryLevel.CRASH,
        isErrorsEnabled: config.error && level >= TelemetryLevel.ERROR,
        isUsageEnabled: config.usage && level >= TelemetryLevel.USAGE
      };
    }, "getTelemetryDetails"),
    instantiateLogger: /* @__PURE__ */ __name((_extension, _sender, _options) => ({}), "instantiateLogger"),
    getBuiltInCommonProperties: /* @__PURE__ */ __name((_extension) => ({}), "getBuiltInCommonProperties"),
    $initializeTelemetryLevel(level, _supportsTelemetry, productConfig) {
      Effect.runSync(Ref.set(telemetryLevelRef, level));
      Effect.runSync(
        Ref.set(
          productConfigRef,
          productConfig ?? { usage: true, error: true }
        )
      );
    },
    $onDidChangeTelemetryLevel(level) {
      Effect.runSync(Ref.set(telemetryLevelRef, level));
    },
    onExtensionError: /* @__PURE__ */ __name((Extension, Error2) => {
      Effect.runFork(LogExtensionError(Extension, Error2));
      return false;
    }, "onExtensionError")
  };
  return TelemetryImplementation;
});
export {
  ToLevel,
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
