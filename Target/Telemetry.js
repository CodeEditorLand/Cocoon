var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { TelemetryLevel } from "vs/platform/telemetry/common/telemetry.js";
import { InitDataService } from "./InitData.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
const ConvertToTelemetryLevel = /* @__PURE__ */ __name((LogLevel) => {
  switch (LogLevel) {
    case 0:
      return TelemetryLevel.NONE;
    case 1:
    case 2:
    case 3:
      return TelemetryLevel.USAGE;
    case 4:
    case 5:
      return TelemetryLevel.ERROR;
    default:
      return TelemetryLevel.NONE;
  }
}, "ConvertToTelemetryLevel");
class TelemetryService extends Effect.Service()(
  "Service/Telemetry",
  {
    effect: Effect.gen(function* () {
      const InitData = yield* InitDataService;
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      const TelemetryLevelRef = yield* Ref.make(
        ConvertToTelemetryLevel(InitData.logLevel)
      );
      const ProductConfigRef = yield* Ref.make({ usage: true, error: true });
      const ShouldSendEvent = /* @__PURE__ */ __name((Type) => Effect.gen(function* () {
        const Level = yield* Ref.get(TelemetryLevelRef);
        if (Level < TelemetryLevel.ERROR) return false;
        const Config = yield* Ref.get(ProductConfigRef);
        if (Type === "error" && !Config.error) return false;
        if (Type === "usage" && Level < TelemetryLevel.USAGE)
          return false;
        if (Type === "usage" && !Config.usage) return false;
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
          Logger.Error(
            `Extension error reported for '${Extension.value}'.`,
            SerializableError
          ).pipe(
            Effect.andThen(
              IPC.SendNotification("$onExtensionError", [
                Extension,
                SerializableError
              ])
            )
          ),
          ShouldSendEvent("error")
        ).pipe(Effect.catchAll(() => Effect.void));
      }, "LogExtensionError");
      const ServiceImplementation = {
        _serviceBrand: void 0,
        _onDidChangeTelemetryEnabled: void 0,
        onDidChangeTelemetryEnabled: void 0,
        _onDidChangeTelemetryConfiguration: void 0,
        onDidChangeTelemetryConfiguration: void 0,
        getTelemetryConfiguration: /* @__PURE__ */ __name(() => Effect.runSync(Ref.get(TelemetryLevelRef)) >= TelemetryLevel.USAGE, "getTelemetryConfiguration"),
        getTelemetryDetails: /* @__PURE__ */ __name(() => {
          const Level = Effect.runSync(Ref.get(TelemetryLevelRef));
          const Config = Effect.runSync(Ref.get(ProductConfigRef));
          return {
            isCrashEnabled: Level >= TelemetryLevel.CRASH,
            isErrorsEnabled: Config.error && Level >= TelemetryLevel.ERROR,
            isUsageEnabled: Config.usage && Level >= TelemetryLevel.USAGE
          };
        }, "getTelemetryDetails"),
        instantiateLogger: /* @__PURE__ */ __name((_extension, _sender, _options) => ({}), "instantiateLogger"),
        getBuiltInCommonProperties: /* @__PURE__ */ __name((_extension) => ({}), "getBuiltInCommonProperties"),
        $initializeTelemetryLevel(level, _supportsTelemetry, productConfig) {
          Effect.runSync(Ref.set(TelemetryLevelRef, level));
          Effect.runSync(
            Ref.set(
              ProductConfigRef,
              productConfig ?? { usage: true, error: true }
            )
          );
        },
        $onDidChangeTelemetryLevel(level) {
          Effect.runSync(Ref.set(TelemetryLevelRef, level));
        },
        onExtensionError: /* @__PURE__ */ __name((Extension, Error2) => {
          Effect.runFork(LogExtensionError(Extension, Error2));
          return false;
        }, "onExtensionError")
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "TelemetryService");
  }
}
export {
  TelemetryService
};
//# sourceMappingURL=Telemetry.js.map
