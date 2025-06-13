var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { IPC } from "../IPC.js";
import { RegisterProvider } from "./RegisterProvider.js";
import { ProvideHover } from "./RPCHandlers/ProvideHover.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const ProviderRegistry = yield* _(Ref.make(/* @__PURE__ */ new Map()));
  IPCService.RegisterInvokeHandler(
    "$provideHover",
    ([handle, uri, pos, tokenID]) => Effect.runPromise(
      ProvideHover(ProviderRegistry, handle, uri, pos, tokenID)
    )
  );
  const ServiceImplementation = {
    RegisterHoverProvider: /* @__PURE__ */ __name((Selector, Provider, Extension) => RegisterProvider(
      ProviderRegistry,
      IPCService,
      "Hover",
      Selector,
      Provider,
      Extension
    ), "RegisterHoverProvider"),
    RegisterCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider, TriggerCharacters, Extension) => RegisterProvider(
      ProviderRegistry,
      IPCService,
      "CompletionItem",
      Selector,
      Provider,
      Extension,
      { triggerCharacters: TriggerCharacters }
      // Additional options
    ), "RegisterCompletionItemProvider"),
    RegisterDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider, Extension) => RegisterProvider(
      ProviderRegistry,
      IPCService,
      "Definition",
      Selector,
      Provider,
      Extension
    ), "RegisterDefinitionProvider"),
    RegisterCodeActionsProvider: /* @__PURE__ */ __name((Selector, Provider, Metadata, Extension) => RegisterProvider(
      ProviderRegistry,
      IPCService,
      "CodeAction",
      Selector,
      Provider,
      Extension,
      Metadata
    ), "RegisterCodeActionsProvider")
    // ... Implementations for all other `register...` methods would follow this pattern ...
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
