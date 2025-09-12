var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import {
  Disposable
} from "vscode";
class LanguageFeatureService extends Effect.Service()(
  "Service/LanguageFeature",
  {
    // This provides a stubbed implementation to satisfy the type contract.
    // A full implementation would be synthesized from OldCocoon's Definition.ts.
    sync: /* @__PURE__ */ __name(() => ({
      RegisterHoverProvider: /* @__PURE__ */ __name(() => Effect.succeed(new Disposable(() => {
      })), "RegisterHoverProvider"),
      RegisterCompletionItemProvider: /* @__PURE__ */ __name(() => Effect.succeed(new Disposable(() => {
      })), "RegisterCompletionItemProvider"),
      RegisterDefinitionProvider: /* @__PURE__ */ __name(() => Effect.succeed(new Disposable(() => {
      })), "RegisterDefinitionProvider"),
      RegisterReferenceProvider: /* @__PURE__ */ __name(() => Effect.succeed(new Disposable(() => {
      })), "RegisterReferenceProvider"),
      RegisterCodeActionsProvider: /* @__PURE__ */ __name(() => Effect.succeed(new Disposable(() => {
      })), "RegisterCodeActionsProvider")
    }), "sync")
  }
) {
  static {
    __name(this, "LanguageFeatureService");
  }
}
export {
  LanguageFeatureService
};
//# sourceMappingURL=LanguageFeature.js.map
