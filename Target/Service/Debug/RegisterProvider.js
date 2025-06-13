var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
let HandleCounter = 0;
function RegisterProvider(Registry, IPCService, RPCRegisterMethod, Data) {
  return Effect.sync(() => {
    const Handle = ++HandleCounter;
    Ref.update(Registry, (map) => map.set(Handle, Data)).pipe(
      Effect.runSync
    );
    IPCService.SendNotification(RPCRegisterMethod, [
      Handle,
      Data.type
      // Assumes the data object has a 'type' property (e.g., debug type)
    ]).pipe(Effect.runFork);
    return new Disposable(() => {
      Ref.update(Registry, (map) => (map.delete(Handle), map)).pipe(
        Effect.runSync
      );
      const RPCUnregisterMethod = `$unregister${RPCRegisterMethod.slice(1)}`;
      IPCService.SendNotification(RPCUnregisterMethod, [Handle]).pipe(
        Effect.runFork
      );
    });
  });
}
__name(RegisterProvider, "RegisterProvider");
export {
  RegisterProvider
};
//# sourceMappingURL=RegisterProvider.js.map
