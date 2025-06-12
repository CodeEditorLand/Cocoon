var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
let HandleCounter = 0;
const RegisterProviderEffect = /* @__PURE__ */ __name((Registry, IpcService, RpcRegisterMethod, Data) => Effect.acquireRelease(
  Effect.sync(() => {
    const Handle = ++HandleCounter;
    Ref.update(Registry, (map) => map.set(Handle, Data)).pipe(
      Effect.runSync
    );
    return Handle;
  }).pipe(
    Effect.flatMap(
      (Handle) => IpcService.SendNotification(RpcRegisterMethod, [
        Handle,
        Data.type
      ]).pipe(Effect.as(Handle))
      // Pass the handle through
    )
  ),
  (Handle) => {
    const RpcUnregisterMethod = `$unregister${RpcRegisterMethod.substring(9)}`;
    return IpcService.SendNotification(RpcUnregisterMethod, [Handle]);
  }
).pipe(
  Effect.map(
    (handle) => new Disposable(() => {
      Ref.get(Registry).pipe(
        Effect.map((map) => map.delete(handle)),
        Effect.runSync
      );
    })
  )
), "RegisterProviderEffect");
export {
  RegisterProviderEffect
};
//# sourceMappingURL=RegisterProvider.js.map
