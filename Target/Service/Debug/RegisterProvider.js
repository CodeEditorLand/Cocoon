var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
let HandleCounter = 0;
const RegisterProvider = /* @__PURE__ */ __name((Registry, IPC, RPCRegisterMethod, Data) => {
  return Effect.sync(() => {
    const Handle = ++HandleCounter;
    Ref.update(Registry, (Map) => Map.set(Handle, Data)).pipe(
      Effect.runSync
    );
    IPC.SendNotification(RPCRegisterMethod, [
      Handle,
      Data.Type
      // Assumes the data object has a 'type' property (e.g., debug type)
    ]).pipe(Effect.runFork);
    return new Disposable(() => {
      Ref.update(Registry, (Map) => (Map.delete(Handle), Map)).pipe(
        Effect.runSync
      );
      const RPCUnregisterMethod = `$unregister${RPCRegisterMethod.slice(1)}`;
      IPC.SendNotification(RPCUnregisterMethod, [Handle]).pipe(
        Effect.runFork
      );
    });
  });
}, "RegisterProvider");
var RegisterProvider_default = RegisterProvider;
export {
  RegisterProvider_default as default
};
//# sourceMappingURL=RegisterProvider.js.map
