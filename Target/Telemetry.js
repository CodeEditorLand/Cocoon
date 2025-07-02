var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Emitter } from "@codeeditorland/output/vs/base/common/event.js";
import { TelemetryLevel } from "@codeeditorland/output/vs/platform/telemetry/common/telemetry.js";
import { Effect, Ref } from "effect";
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
        _productConfig: { usage: true, error: true },
        _level: TelemetryLevel.NONE,
        _oldTelemetryEnablement: false,
        _inLoggingOnlyMode: false,
        _telemetryLoggers: /* @__PURE__ */ new Map(),
        _onDidChangeTelemetryConfiguration: new Emitter(),
        onDidChangeTelemetryConfiguration: new Emitter().event,
        _onDidChangeTelemetryEnabled: new Emitter(),
        onDidChangeTelemetryEnabled: new Emitter().event,
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
        instantiateLogger: /* @__PURE__ */ __name((_extension, _sender, _options) => ({
          logUsage: /* @__PURE__ */ __name(() => {
          }, "logUsage"),
          logError: /* @__PURE__ */ __name(() => {
          }, "logError"),
          isUsageEnabled: false,
          isErrorsEnabled: false,
          onDidChangeEnableStates: new AbortController().signal,
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "instantiateLogger"),
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
        }, "onExtensionError"),
        dispose() {
        }
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
