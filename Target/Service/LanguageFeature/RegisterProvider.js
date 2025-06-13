var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
import * as TypeConverter from "../../TypeConverter.js";
let HandleCounter = 0;
function RegisterProvider(Registry, IPCService, ProviderType, Selector, Provider, Extension, Option) {
  return Effect.sync(() => {
    const Handle = ++HandleCounter;
    const Entry = {
      type: ProviderType,
      selector: Selector,
      provider: Provider,
      extensionId: Extension.identifier
    };
    Ref.update(Registry, (map) => map.set(Handle, Entry)).pipe(
      Effect.runSync
    );
    const selectorDTO = TypeConverter.Main.DocumentSelector.fromAPI(Selector);
    IPCService.SendNotification(`$register${ProviderType}Provider`, [
      Handle,
      selectorDTO,
      Option
    ]).pipe(Effect.runFork);
    return new Disposable(() => {
      Ref.update(Registry, (map) => (map.delete(Handle), map)).pipe(
        Effect.runSync
      );
      IPCService.SendNotification("$unregister", [Handle]).pipe(
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
