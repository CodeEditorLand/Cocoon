var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Context, Effect, Layer } from "effect";
import {
  TelemetryLevel
} from "vs/platform/telemetry/common/telemetry.js";
import { InitData } from "./InitData.js";
import { IPC } from "./IPC.js";
import { Log } from "./Log.js";
const Tag = Context.Tag("Service/Telemetry");
const Definition = Effect.gen(function* (_) {
  const InitDataService = yield* _(InitData.Tag);
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const TelemetryLevelValue = InitDataService.telemetryInfo.telemetryLevel ?? TelemetryLevel.NONE;
  const ProductConfig = InitDataService.product?.telemetryOptOut;
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
  const LogPublicEvent = /* @__PURE__ */ __name((EventName, Data) => LogService.Debug(`Telemetry event: '${EventName}'`, Data).pipe(
    Effect.flatMap(
      () => Effect.when(
        IPCService.SendNotification("$publicLog", [
          EventName,
          Data
        ]),
        () => ShouldSendEvent("usage")
      )
    ),
    Effect.catchAll(() => Effect.unit)
    // Telemetry should never crash the host
  ), "LogPublicEvent");
  const LogExtensionError = /* @__PURE__ */ __name((Extension, CaughtError) => {
    const SerializableError = CaughtError instanceof Error ? {
      name: CaughtError.name,
      message: CaughtError.message,
      stack: CaughtError.stack
    } : CaughtError;
    return LogService.Error(
      `Extension error reported for '${Extension.value}'.`,
      SerializableError
    ).pipe(
      Effect.flatMap(
        () => Effect.when(
          IPCService.SendNotification("$onExtensionError", [
            Extension.value,
            SerializableError
          ]),
          () => ShouldSendEvent("error")
        )
      ),
      Effect.catchAll(() => Effect.unit)
    );
  }, "LogExtensionError");
  const ServiceImplementation = {
    _serviceBrand: void 0,
    getTelemetryInfo: /* @__PURE__ */ __name(() => Promise.resolve(InitDataService.telemetryInfo), "getTelemetryInfo"),
    setEnabled: /* @__PURE__ */ __name(() => {
    }, "setEnabled"),
    publicLog: /* @__PURE__ */ __name((eventName, data) => {
      Effect.runFork(LogPublicEvent(eventName, data));
    }, "publicLog"),
    publicLog2: /* @__PURE__ */ __name((eventName, data) => {
      Effect.runFork(LogPublicEvent(eventName, data));
    }, "publicLog2"),
    onExtensionError: /* @__PURE__ */ __name((extension, error) => {
      Effect.runFork(LogExtensionError(extension, error));
      return false;
    }, "onExtensionError")
  };
  return ServiceImplementation;
});
const Live = Layer.effect(Tag, Definition).pipe(
  Layer.provide(Layer.merge(IPC.Live, Log.Live))
  // InitData service must be provided by the top-level ApplicationLayer
);
export {
  Live,
  Tag
};
//# sourceMappingURL=Telemetry.js.map
