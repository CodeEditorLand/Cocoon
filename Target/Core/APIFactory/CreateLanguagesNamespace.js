var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function CreateLanguagesNamespace(LanguageFeatureService, Extension) {
  return {
    // --- Provider Registration Methods ---
    registerHoverProvider: /* @__PURE__ */ __name((selector, provider) => {
      return Effect.runSync(
        LanguageFeatureService.RegisterHoverProvider(
          selector,
          provider,
          Extension
        )
      );
    }, "registerHoverProvider"),
    registerCompletionItemProvider: /* @__PURE__ */ __name((selector, provider, ...triggerCharacters) => {
      return Effect.runSync(
        LanguageFeatureService.RegisterCompletionItemProvider(
          selector,
          provider,
          triggerCharacters,
          Extension
        )
      );
    }, "registerCompletionItemProvider"),
    registerDefinitionProvider: /* @__PURE__ */ __name((selector, provider) => {
      return Effect.runSync(
        LanguageFeatureService.RegisterDefinitionProvider(
          selector,
          provider,
          Extension
        )
      );
    }, "registerDefinitionProvider"),
    registerCodeActionsProvider: /* @__PURE__ */ __name((selector, provider, metadata) => {
      return Effect.runSync(
        LanguageFeatureService.RegisterCodeActionsProvider(
          selector,
          provider,
          metadata,
          Extension
        )
      );
    }, "registerCodeActionsProvider"),
    // ... and so on for all other provider types (references, implementation, etc.)
    // --- Other Methods ---
    getLanguages: /* @__PURE__ */ __name(() => {
      return Promise.resolve([]);
    }, "getLanguages"),
    setTextDocumentLanguage: /* @__PURE__ */ __name((document, languageId) => {
      return Promise.resolve(document);
    }, "setTextDocumentLanguage"),
    createDiagnosticCollection: /* @__PURE__ */ __name((name) => {
      throw new Error(
        "createDiagnosticCollection not implemented in this mock."
      );
    }, "createDiagnosticCollection")
  };
}
__name(CreateLanguagesNamespace, "CreateLanguagesNamespace");
export {
  CreateLanguagesNamespace
};
//# sourceMappingURL=CreateLanguagesNamespace.js.map
