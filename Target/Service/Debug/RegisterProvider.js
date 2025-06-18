var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import IPCService from "../IPC/Service.js";
import DebugProviderRegistrationError from "./Error/DebugProviderRegistrationError.js";
let HandleCounter = 0;
const RegisterProviderEffect = /* @__PURE__ */ __name((Registry, Data) => {
  return Effect.gen(function* (G) {
    const IPC = yield* G(IPCService);
    const Handle = ++HandleCounter;
    yield* G(Ref.update(Registry, (Map) => Map.set(Handle, Data)));
    yield* G(
      IPC.SendNotification("$registerDebugConfigurationProvider", [
        Handle,
        Data.Type
        // The data object is known to have a 'type' property.
      ]).pipe(
        Effect.mapError(
          (cause) => new DebugProviderRegistrationError({
            DebugType: Data.Type,
            cause
          })
        )
      )
    );
    const CleanupEffect = Effect.gen(function* (G2) {
      yield* G2(Ref.update(Registry, (Map) => (Map.delete(Handle), Map)));
      yield* G2(
        IPC.SendNotification("$unregisterDebugConfigurationProvider", [
          Handle
        ])
      );
    });
    return new Disposable(() => {
      Effect.runFork(CleanupEffect);
    });
  });
}, "RegisterProviderEffect");
var RegisterProvider_default = RegisterProviderEffect;
export {
  RegisterProvider_default as default
};
//# sourceMappingURL=RegisterProvider.js.map
