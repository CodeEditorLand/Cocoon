var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/LanguagesNamespace.ts
var RegisterProvider = /* @__PURE__ */ __name((Context, LanguageProviderRegistry, MethodName, Selector, Provider) => {
  const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
  const Language = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
  Context.SendToMountain(MethodName, { handle: Handle, language_selector: Language, extension_id: "" }).catch(() => {
  });
  return { dispose: /* @__PURE__ */ __name(() => LanguageProviderRegistry.Unregister(Handle), "dispose") };
}, "RegisterProvider");
var CreateLanguagesNamespace = /* @__PURE__ */ __name((Context, LanguageProviderRegistry) => ({
  registerHoverProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_hover_provider", Selector, Provider), "registerHoverProvider"),
  registerCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider, ..._TriggerCharacters) => RegisterProvider(Context, LanguageProviderRegistry, "register_completion_item_provider", Selector, Provider), "registerCompletionItemProvider"),
  registerDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_definition_provider", Selector, Provider), "registerDefinitionProvider"),
  registerReferenceProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_reference_provider", Selector, Provider), "registerReferenceProvider"),
  registerCodeActionsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_code_actions_provider", Selector, Provider), "registerCodeActionsProvider"),
  registerDocumentSymbolProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_document_symbol_provider", Selector, Provider), "registerDocumentSymbolProvider"),
  registerDocumentFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_document_formatting_provider", Selector, Provider), "registerDocumentFormattingEditProvider"),
  registerDocumentRangeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_document_range_formatting_provider", Selector, Provider), "registerDocumentRangeFormattingEditProvider"),
  registerOnTypeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider, _FirstTrigger, ..._MoreTriggers) => RegisterProvider(Context, LanguageProviderRegistry, "register_on_type_formatting_provider", Selector, Provider), "registerOnTypeFormattingEditProvider"),
  registerTypeDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_type_definition_provider", Selector, Provider), "registerTypeDefinitionProvider"),
  registerImplementationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_implementation_provider", Selector, Provider), "registerImplementationProvider"),
  registerDeclarationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_declaration_provider", Selector, Provider), "registerDeclarationProvider"),
  registerDocumentLinkProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_document_link_provider", Selector, Provider), "registerDocumentLinkProvider"),
  registerColorProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_color_provider", Selector, Provider), "registerColorProvider"),
  registerLinkedEditingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_linked_editing_range_provider", Selector, Provider), "registerLinkedEditingRangeProvider"),
  registerCallHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_call_hierarchy_provider", Selector, Provider), "registerCallHierarchyProvider"),
  registerTypeHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_type_hierarchy_provider", Selector, Provider), "registerTypeHierarchyProvider"),
  registerEvaluatableExpressionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_evaluatable_expression_provider", Selector, Provider), "registerEvaluatableExpressionProvider"),
  registerInlineValuesProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_inline_values_provider", Selector, Provider), "registerInlineValuesProvider"),
  registerSignatureHelpProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_signature_help_provider", Selector, Provider), "registerSignatureHelpProvider"),
  registerDocumentHighlightProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_document_highlight_provider", Selector, Provider), "registerDocumentHighlightProvider"),
  registerCodeLensProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_code_lens_provider", Selector, Provider), "registerCodeLensProvider"),
  registerRenameProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_rename_provider", Selector, Provider), "registerRenameProvider"),
  registerFoldingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_folding_range_provider", Selector, Provider), "registerFoldingRangeProvider"),
  registerSelectionRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_selection_range_provider", Selector, Provider), "registerSelectionRangeProvider"),
  registerDocumentSemanticTokensProvider: /* @__PURE__ */ __name((Selector, Provider, _Legend) => RegisterProvider(Context, LanguageProviderRegistry, "register_semantic_tokens_provider", Selector, Provider), "registerDocumentSemanticTokensProvider"),
  registerInlayHintsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(Context, LanguageProviderRegistry, "register_inlay_hints_provider", Selector, Provider), "registerInlayHintsProvider"),
  createDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
    const Owner = Name ?? "default";
    const Store = /* @__PURE__ */ new Map();
    return {
      name: Owner,
      set: /* @__PURE__ */ __name((UriOrEntries, Diagnostics) => {
        if (Array.isArray(UriOrEntries) && Diagnostics === void 0) {
          const Entries = UriOrEntries;
          for (const [Uri, D] of Entries) {
            Store.set(String(Uri), D ?? []);
          }
        } else {
          Store.set(String(UriOrEntries), Diagnostics ?? []);
        }
        Context.MountainClient?.sendRequest("Diagnostic.Set", [
          Owner,
          [...Store.entries()].map(([U, D]) => ({ uri: U, diagnostics: D }))
        ]).catch(() => {
        });
      }, "set"),
      delete: /* @__PURE__ */ __name((Uri) => {
        Store.delete(String(Uri));
        Context.MountainClient?.sendRequest("Diagnostic.Set", [
          Owner,
          [...Store.entries()].map(([U, D]) => ({ uri: U, diagnostics: D }))
        ]).catch(() => {
        });
      }, "delete"),
      clear: /* @__PURE__ */ __name(() => {
        Store.clear();
        Context.MountainClient?.sendRequest("Diagnostic.Clear", [Owner]).catch(
          () => {
          }
        );
      }, "clear"),
      forEach: /* @__PURE__ */ __name((Callback) => {
        const Self = null;
        for (const [Uri, Diagnostics] of Store) {
          Callback(Uri, Diagnostics, Self);
        }
      }, "forEach"),
      get: /* @__PURE__ */ __name((Uri) => Store.get(String(Uri)) ?? [], "get"),
      has: /* @__PURE__ */ __name((Uri) => Store.has(String(Uri)), "has"),
      dispose: /* @__PURE__ */ __name(() => {
        Store.clear();
        Context.MountainClient?.sendRequest("Diagnostic.Clear", [Owner]).catch(
          () => {
          }
        );
      }, "dispose")
    };
  }, "createDiagnosticCollection"),
  getLanguages: /* @__PURE__ */ __name(async () => {
    try {
      const Result = await Context.MountainClient?.sendRequest(
        "Languages.GetAll",
        []
      );
      return Array.isArray(Result) ? Result : [];
    } catch {
      return [];
    }
  }, "getLanguages"),
  setTextDocumentLanguage: /* @__PURE__ */ __name(async (Document, LanguageId) => {
    Context.SendToMountain("languages.setDocumentLanguage", {
      uri: Document?.uri?.toString?.() ?? "",
      languageId: LanguageId
    }).catch(() => {
    });
    return Document;
  }, "setTextDocumentLanguage"),
  match: /* @__PURE__ */ __name((_Selector, _Document) => 10, "match"),
  onDidChangeDiagnostics: /* @__PURE__ */ __name((Listener) => {
    Context.Emitter.on("diagnostics.didChange", Listener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.off("diagnostics.didChange", Listener);
      }, "dispose")
    };
  }, "onDidChangeDiagnostics"),
  getDiagnostics: /* @__PURE__ */ __name((_Resource) => [], "getDiagnostics"),
  registerDocumentPasteEditProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Metadata) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDocumentPasteEditProvider"),
  registerDocumentDropEditProvider: /* @__PURE__ */ __name((_Selector, _Provider, _Metadata) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerDocumentDropEditProvider"),
  registerInlineCompletionItemProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerInlineCompletionItemProvider"),
  registerInlineEditProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerInlineEditProvider"),
  registerMultiDocumentHighlightProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerMultiDocumentHighlightProvider"),
  registerMappedEditsProvider: /* @__PURE__ */ __name((_Selector, _Provider) => ({ dispose: /* @__PURE__ */ __name(() => {
  }, "dispose") }), "registerMappedEditsProvider")
}), "CreateLanguagesNamespace");
var LanguagesNamespace_default = CreateLanguagesNamespace;
export {
  LanguagesNamespace_default as default
};
//# sourceMappingURL=LanguagesNamespace.js.map
