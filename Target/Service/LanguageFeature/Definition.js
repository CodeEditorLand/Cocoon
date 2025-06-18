var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  Disposable
} from "vscode";
var Definition_default = Effect.gen(function* () {
  const LanguageFeatureImplementation = {
    // Each register method would add the provider to the appropriate map and
    // return a disposable to remove it.
    RegisterHoverProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Extension) => Effect.sync(() => {
      return new Disposable(() => {
      });
    }), "RegisterHoverProvider"),
    RegisterCompletionItemProvider: /* @__PURE__ */ __name((_Selector, _Provider, _TriggerCharacters, _Extension) => Effect.sync(() => {
      return new Disposable(() => {
      });
    }), "RegisterCompletionItemProvider"),
    RegisterDefinitionProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Extension) => Effect.sync(() => {
      return new Disposable(() => {
      });
    }), "RegisterDefinitionProvider"),
    RegisterCodeActionsProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Metadata, _Extension) => Effect.sync(() => {
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
