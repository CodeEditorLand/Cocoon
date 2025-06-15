var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Disposable } from "vscode";
var Definition_default = Effect.gen(function* () {
  const HoverProviderRegistry = yield* Ref.make(/* @__PURE__ */ new Map());
  const LanguageFeatureImplementation = {
    // Each register method would add the provider to the appropriate map and
    // return a disposable to remove it.
    RegisterHoverProvider: /* @__PURE__ */ __name((Selector, Provider, Extension) => Effect.sync(() => {
      console.log(
        "Registering Hover Provider for",
        Extension.identifier.value,
        Selector,
        Provider
      );
      return new Disposable(() => {
      });
    }), "RegisterHoverProvider"),
    RegisterCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider, TriggerCharacters, Extension) => Effect.sync(() => {
      console.log(
        "Registering Completion Provider for",
        Extension.identifier.value,
        Selector,
        Provider,
        TriggerCharacters
      );
      return new Disposable(() => {
      });
    }), "RegisterCompletionItemProvider"),
    RegisterDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider, Extension) => Effect.sync(() => {
      console.log(
        "Registering Definition Provider for",
        Extension.identifier.value,
        Selector,
        Provider
      );
      return new Disposable(() => {
      });
    }), "RegisterDefinitionProvider"),
    RegisterCodeActionsProvider: /* @__PURE__ */ __name((Selector, Provider, Metadata, Extension) => Effect.sync(() => {
      console.log(
        "Registering Code Actions Provider for",
        Extension.identifier.value,
        Selector,
        Provider,
        Metadata
      );
      return new Disposable(() => {
      });
    }), "RegisterCodeActionsProvider")
    // ... implementations for all other provider registration methods.
  };
  return LanguageFeatureImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
