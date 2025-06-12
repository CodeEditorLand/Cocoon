var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { IpcProvider } from "../Ipc/mod.js";
import { RegisterProvider } from "./RegisterProvider.js";
import { ProvideHover } from "./RpcHandlers/ProvideHover.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const ProviderRegistry = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  Ipc.RegisterInvokeHandler(
    "$provideHover",
    ([handle, uri, pos, token]) => Effect.runPromise(
      ProvideHover(ProviderRegistry, handle, uri, pos, token)
    )
  );
  const ServiceImplementation = {
    RegisterHoverProvider: /* @__PURE__ */ __name((Selector, Provider, Extension) => RegisterProvider(
      ProviderRegistry,
      Ipc,
      "Hover",
      Selector,
      Provider,
      Extension
    ), "RegisterHoverProvider")
    // ... Implementations for all other `register...` methods ...
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
