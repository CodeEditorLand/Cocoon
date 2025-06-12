var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import * as TypeConverter from "../../TypeConverter/mod.js";
let HandleCounter = 0;
const RegisterProvider = /* @__PURE__ */ __name((Registry, IpcService, ProviderType, Selector, Provider, Extension, Options) => Effect.acquireRelease(
  Effect.sync(() => {
    const Handle = ++HandleCounter;
    const Entry = {
      type: ProviderType,
      selector: Selector,
      provider: Provider,
      extension: Extension
    };
    Ref.update(Registry, (map) => map.set(Handle, Entry)).pipe(
      Effect.runSync
    );
    return Handle;
  }).pipe(
    Effect.flatMap(
      (Handle) => IpcService.SendNotification(
        `$register${ProviderType}Provider`,
        [
          Handle,
          TypeConverter.DocumentSelector.fromApi(Selector),
          Extension.identifier.value,
          Options
          // Convert options to DTO
        ]
      ).pipe(Effect.as(Handle))
    )
  ),
  (Handle) => IpcService.SendNotification("$unregister", [Handle])
).pipe(
  Effect.map(
    (handle) => new Disposable(() => {
    })
  )
), "RegisterProvider");
export {
  RegisterProvider
};
//# sourceMappingURL=RegisterProvider.js.map
