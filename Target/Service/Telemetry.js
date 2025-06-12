var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context, Effect, Layer } from "effect";
import {
  TelemetryLevel
} from "vs/platform/telemetry/common/telemetry.js";
import { InitDataService } from "./InitData.js";
import { IpcProvider } from "./Ipc/mod.js";
import { LogProvider } from "./Log.js";
const Tag = Context.Tag("Service/Telemetry");
const Definition = Effect.gen(function* (_) {
  const InitData = yield* _(InitDataService);
  const Ipc = yield* _(IpcProvider.Tag);
  const Log = yield* _(LogProvider.Tag);
  const TelemetryLevelValue = InitData.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
  const ProductConfig = InitData.product?.telemetryOptOut;
  const ShouldSendEvent = /* @__PURE__ */ __name((type) => {
    if (TelemetryLevelValue === TelemetryLevel.NONE || TelemetryLevelValue === TelemetryLevel.OFF) {
      return false;
    }
    if (type === "error" && ProductConfig?.error === true) {
      return false;
    }
    if (type === "usage" && ProductConfig?.usage === true) {
      return false;
    }
    return true;
  }, "ShouldSendEvent");
  const LogPublicEventEffect = /* @__PURE__ */ __name((EventName, Data) => Log.Debug(`Telemetry event: '${EventName}'`, Data).pipe(
    Effect.flatMap(
      () => Effect.when(
        Ipc.SendNotification("$publicLog", [EventName, Data]),
        () => ShouldSendEvent("usage")
      )
    ),
    Effect.catchAll(() => Effect.unit)
    // Telemetry should never crash the host
  ), "LogPublicEventEffect");
  const LogExtensionErrorEffect = /* @__PURE__ */ __name((Extension, ErrorValue) => {
    const SerializableError = ErrorValue instanceof Error ? {
      name: ErrorValue.name,
      message: ErrorValue.message,
      stack: ErrorValue.stack
    } : ErrorValue;
    return Log.Error(
      `Extension error reported for '${Extension.value}'.`,
      SerializableError
    ).pipe(
      Effect.flatMap(
        () => Effect.when(
          Ipc.SendNotification("$onExtensionError", [
            Extension.value,
            SerializableError
          ]),
          () => ShouldSendEvent("error")
        )
      ),
      Effect.catchAll(() => Effect.unit)
    );
  }, "LogExtensionErrorEffect");
  const ServiceImplementation = {
    _serviceBrand: void 0,
    getTelemetryInfo: /* @__PURE__ */ __name(() => Promise.resolve(InitData.telemetryInfo), "getTelemetryInfo"),
    setEnabled: /* @__PURE__ */ __name(() => {
    }, "setEnabled"),
    publicLog: /* @__PURE__ */ __name((eventName, data) => {
      Effect.runFork(LogPublicEventEffect(eventName, data));
    }, "publicLog"),
    publicLog2: /* @__PURE__ */ __name((eventName, data) => {
      Effect.runFork(LogPublicEventEffect(eventName, data));
    }, "publicLog2"),
    onExtensionError: /* @__PURE__ */ __name((extension, error) => {
      Effect.runFork(LogExtensionErrorEffect(extension, error));
      return false;
    }, "onExtensionError")
  };
  return ServiceImplementation;
});
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(IpcProvider.Live, LogProvider.Live))
  // InitDataService must be provided by the top-level AppLayer
);
export {
  Live,
  Tag
};
//# sourceMappingURL=Telemetry.js.map
