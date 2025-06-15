var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const CreateLanguagesNamespace = /* @__PURE__ */ __name((LanguageFeature, Extension) => {
  return {
    // --- Provider Registration Methods ---
    registerHoverProvider: /* @__PURE__ */ __name((selector, provider) => {
      return Effect.runSync(
        LanguageFeature.RegisterHoverProvider(
          selector,
          provider,
          Extension
        )
      );
    }, "registerHoverProvider"),
    registerCompletionItemProvider: /* @__PURE__ */ __name((selector, provider, ...triggerCharacters) => {
      return Effect.runSync(
        LanguageFeature.RegisterCompletionItemProvider(
          selector,
          provider,
          triggerCharacters,
          Extension
        )
      );
    }, "registerCompletionItemProvider"),
    registerDefinitionProvider: /* @__PURE__ */ __name((selector, provider) => {
      return Effect.runSync(
        LanguageFeature.RegisterDefinitionProvider(
          selector,
          provider,
          Extension
        )
      );
    }, "registerDefinitionProvider"),
    registerCodeActionsProvider: /* @__PURE__ */ __name((selector, provider, metadata) => {
      return Effect.runSync(
        LanguageFeature.RegisterCodeActionsProvider(
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
    setTextDocumentLanguage: /* @__PURE__ */ __name((document, _languageId) => {
      return Promise.resolve(document);
    }, "setTextDocumentLanguage"),
    createDiagnosticCollection: /* @__PURE__ */ __name((_name) => {
      throw new Error(
        "createDiagnosticCollection not implemented in this mock."
      );
    }, "createDiagnosticCollection")
  };
}, "CreateLanguagesNamespace");
var CreateLanguagesNamespace_default = CreateLanguagesNamespace;
export {
  CreateLanguagesNamespace_default as default
};
//# sourceMappingURL=CreateLanguagesNamespace.js.map
