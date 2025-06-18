var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const CreateLanguagesNamespace = /* @__PURE__ */ __name((LanguageFeature, Extension) => {
  const LanguagesNamespace = {
    // --- Provider Registration Methods (now return Effects) ---
    registerHoverProvider: /* @__PURE__ */ __name((selector, provider) => LanguageFeature.RegisterHoverProvider(
      selector,
      provider,
      Extension
    ), "registerHoverProvider"),
    registerCompletionItemProvider: /* @__PURE__ */ __name((selector, provider, ...triggerCharacters) => LanguageFeature.RegisterCompletionItemProvider(
      selector,
      provider,
      triggerCharacters,
      Extension
    ), "registerCompletionItemProvider"),
    registerDefinitionProvider: /* @__PURE__ */ __name((selector, provider) => LanguageFeature.RegisterDefinitionProvider(
      selector,
      provider,
      Extension
    ), "registerDefinitionProvider"),
    registerCodeActionsProvider: /* @__PURE__ */ __name((selector, provider, metadata) => LanguageFeature.RegisterCodeActionsProvider(
      selector,
      provider,
      metadata,
      Extension
    ), "registerCodeActionsProvider"),
    // --- Other Methods (stubbed for now) ---
    getLanguages: /* @__PURE__ */ __name(() => {
      return Promise.resolve([]);
    }, "getLanguages"),
    setTextDocumentLanguage: /* @__PURE__ */ __name((document, _languageId) => {
      return Promise.resolve(document);
    }, "setTextDocumentLanguage"),
    createDiagnosticCollection: /* @__PURE__ */ __name((_name) => {
      throw new Error(
        "createDiagnosticCollection not implemented in this mock. It is provided by a separate DiagnosticService."
      );
    }, "createDiagnosticCollection")
  };
  return LanguagesNamespace;
}, "CreateLanguagesNamespace");
var CreateLanguagesNamespace_default = CreateLanguagesNamespace;
export {
  CreateLanguagesNamespace_default as default
};
//# sourceMappingURL=CreateLanguagesNamespace.js.map
