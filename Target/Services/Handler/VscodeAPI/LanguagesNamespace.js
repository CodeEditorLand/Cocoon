var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Utility/GlobToRegex.ts
var FindMatchingBrace = /* @__PURE__ */ __name((Input, Start, Open, Close) => {
  let Depth = 1;
  for (let I = Start + 1; I < Input.length; I++) {
    const Character = Input[I];
    if (Character === "\\") {
      I++;
      continue;
    }
    if (Character === Open) Depth++;
    else if (Character === Close) {
      Depth--;
      if (Depth === 0) return I;
    }
  }
  return -1;
}, "FindMatchingBrace");
var SplitTopLevelCommas = /* @__PURE__ */ __name((Body) => {
  const Parts = [];
  let Depth = 0;
  let Start = 0;
  for (let I = 0; I < Body.length; I++) {
    const Character = Body[I];
    if (Character === "\\") {
      I++;
      continue;
    }
    if (Character === "{" || Character === "(") Depth++;
    else if (Character === "}" || Character === ")") Depth--;
    else if (Character === "," && Depth === 0) {
      Parts.push(Body.slice(Start, I));
      Start = I + 1;
    }
  }
  Parts.push(Body.slice(Start));
  return Parts;
}, "SplitTopLevelCommas");
var ExpandBraces = /* @__PURE__ */ __name((Input) => {
  const Open = Input.indexOf("{");
  if (Open === -1) return [Input];
  const Close = FindMatchingBrace(Input, Open, "{", "}");
  if (Close === -1) return [Input];
  const Prefix = Input.slice(0, Open);
  const Body = Input.slice(Open + 1, Close);
  const Suffix = Input.slice(Close + 1);
  const RangeMatch = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(Body);
  const Alternatives = [];
  if (RangeMatch) {
    const Start = parseInt(RangeMatch[1], 10);
    const End = parseInt(RangeMatch[2], 10);
    const StepRaw = RangeMatch[3];
    const Step = StepRaw ? Math.abs(parseInt(StepRaw, 10)) : 1;
    if (Step > 0 && Number.isFinite(Start) && Number.isFinite(End)) {
      const Width = RangeMatch[1].startsWith("0") || RangeMatch[2].startsWith("0") ? Math.max(RangeMatch[1].length, RangeMatch[2].length) : 0;
      const Direction = Start <= End ? 1 : -1;
      for (let Value = Start; Direction === 1 ? Value <= End : Value >= End; Value += Direction * Step) {
        const Text = String(Math.abs(Value));
        const Padded = Width > 0 && Text.length < Width ? "0".repeat(Width - Text.length) + Text : Text;
        Alternatives.push(Value < 0 ? `-${Padded}` : Padded);
      }
    }
  }
  if (Alternatives.length === 0) {
    Alternatives.push(...SplitTopLevelCommas(Body));
  }
  const Expanded = [];
  for (const Alternative of Alternatives) {
    for (const Sub of ExpandBraces(Alternative)) {
      for (const Tail of ExpandBraces(Suffix)) {
        Expanded.push(`${Prefix}${Sub}${Tail}`);
      }
    }
  }
  return Expanded;
}, "ExpandBraces");
var RegexEscape = /* @__PURE__ */ __name((Character) => /[.+^$()|\[\]\\]/.test(Character) ? `\\${Character}` : Character, "RegexEscape");
var PlainGlobToRegexSource = /* @__PURE__ */ __name((Glob) => {
  let Expression = "";
  let I = 0;
  while (I < Glob.length) {
    const Character = Glob[I];
    const Next = Glob[I + 1];
    if (Character === "*" && Next === "*") {
      Expression += ".*";
      I += 2;
      if (Glob[I] === "/") I++;
      continue;
    }
    if ((Character === "?" || Character === "*" || Character === "+" || Character === "@" || Character === "!") && Next === "(") {
      const CloseAt = FindMatchingBrace(Glob, I + 1, "(", ")");
      if (CloseAt !== -1) {
        const Inside = Glob.slice(I + 2, CloseAt);
        const Alternatives = SplitTopLevelCommas(
          Inside.replace(/\|/g, ",")
        ).map((Alternative) => PlainGlobToRegexSource(Alternative));
        const Joined = Alternatives.join("|");
        switch (Character) {
          case "?":
            Expression += `(?:${Joined})?`;
            break;
          case "*":
            Expression += `(?:${Joined})*`;
            break;
          case "+":
            Expression += `(?:${Joined})+`;
            break;
          case "@":
            Expression += `(?:${Joined})`;
            break;
          case "!":
            Expression += `(?:(?!(?:${Joined})(?:/|$))[^/])+`;
            break;
        }
        I = CloseAt + 1;
        continue;
      }
    }
    if (Character === "*") {
      Expression += "[^/]*";
      I++;
      continue;
    }
    if (Character === "?") {
      Expression += "[^/]";
      I++;
      continue;
    }
    if (Character === "[") {
      const CloseAt = Glob.indexOf("]", I + 1);
      if (CloseAt !== -1) {
        let Class = Glob.slice(I + 1, CloseAt);
        if (Class.startsWith("!")) Class = `^${Class.slice(1)}`;
        Expression += `[${Class}]`;
        I = CloseAt + 1;
        continue;
      }
    }
    if (Character === "\\" && Next !== void 0) {
      Expression += RegexEscape(Next);
      I += 2;
      continue;
    }
    Expression += RegexEscape(Character);
    I++;
  }
  return Expression;
}, "PlainGlobToRegexSource");
var GlobToRegex = /* @__PURE__ */ __name((Glob) => {
  const Variants = ExpandBraces(Glob);
  const Source = Variants.length === 1 ? PlainGlobToRegexSource(Variants[0]) : `(?:${Variants.map(PlainGlobToRegexSource).join("|")})`;
  return new RegExp(`^${Source}$`);
}, "GlobToRegex");
var GlobToRegex_default = GlobToRegex;

// Source/Services/Handler/VscodeAPI/LanguagesNamespace.ts
var RegisterProvider = /* @__PURE__ */ __name((Context, LanguageProviderRegistry, MethodName, Selector, Provider) => {
  const Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
  const Language = typeof Selector === "string" ? Selector : Selector?.language ?? "*";
  Context.SendToMountain(MethodName, {
    handle: Handle,
    language_selector: Language,
    extension_id: ""
  }).catch(() => {
  });
  return { dispose: /* @__PURE__ */ __name(() => LanguageProviderRegistry.Unregister(Handle), "dispose") };
}, "RegisterProvider");
var CreateLanguagesNamespace = /* @__PURE__ */ __name((Context, LanguageProviderRegistry) => ({
  registerHoverProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_hover_provider",
    Selector,
    Provider
  ), "registerHoverProvider"),
  registerCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider, ..._TriggerCharacters) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_completion_item_provider",
    Selector,
    Provider
  ), "registerCompletionItemProvider"),
  registerDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_definition_provider",
    Selector,
    Provider
  ), "registerDefinitionProvider"),
  registerReferenceProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_reference_provider",
    Selector,
    Provider
  ), "registerReferenceProvider"),
  registerCodeActionsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_code_actions_provider",
    Selector,
    Provider
  ), "registerCodeActionsProvider"),
  registerDocumentSymbolProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_symbol_provider",
    Selector,
    Provider
  ), "registerDocumentSymbolProvider"),
  registerDocumentFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_formatting_provider",
    Selector,
    Provider
  ), "registerDocumentFormattingEditProvider"),
  registerDocumentRangeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_range_formatting_provider",
    Selector,
    Provider
  ), "registerDocumentRangeFormattingEditProvider"),
  registerOnTypeFormattingEditProvider: /* @__PURE__ */ __name((Selector, Provider, _FirstTrigger, ..._MoreTriggers) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_on_type_formatting_provider",
    Selector,
    Provider
  ), "registerOnTypeFormattingEditProvider"),
  registerTypeDefinitionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_type_definition_provider",
    Selector,
    Provider
  ), "registerTypeDefinitionProvider"),
  registerImplementationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_implementation_provider",
    Selector,
    Provider
  ), "registerImplementationProvider"),
  registerDeclarationProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_declaration_provider",
    Selector,
    Provider
  ), "registerDeclarationProvider"),
  registerDocumentLinkProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_link_provider",
    Selector,
    Provider
  ), "registerDocumentLinkProvider"),
  registerColorProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_color_provider",
    Selector,
    Provider
  ), "registerColorProvider"),
  registerLinkedEditingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_linked_editing_range_provider",
    Selector,
    Provider
  ), "registerLinkedEditingRangeProvider"),
  registerCallHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_call_hierarchy_provider",
    Selector,
    Provider
  ), "registerCallHierarchyProvider"),
  registerTypeHierarchyProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_type_hierarchy_provider",
    Selector,
    Provider
  ), "registerTypeHierarchyProvider"),
  registerEvaluatableExpressionProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_evaluatable_expression_provider",
    Selector,
    Provider
  ), "registerEvaluatableExpressionProvider"),
  registerInlineValuesProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_inline_values_provider",
    Selector,
    Provider
  ), "registerInlineValuesProvider"),
  registerSignatureHelpProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_signature_help_provider",
    Selector,
    Provider
  ), "registerSignatureHelpProvider"),
  registerDocumentHighlightProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_highlight_provider",
    Selector,
    Provider
  ), "registerDocumentHighlightProvider"),
  registerCodeLensProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_code_lens_provider",
    Selector,
    Provider
  ), "registerCodeLensProvider"),
  registerRenameProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_rename_provider",
    Selector,
    Provider
  ), "registerRenameProvider"),
  registerFoldingRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_folding_range_provider",
    Selector,
    Provider
  ), "registerFoldingRangeProvider"),
  registerSelectionRangeProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_selection_range_provider",
    Selector,
    Provider
  ), "registerSelectionRangeProvider"),
  registerDocumentSemanticTokensProvider: /* @__PURE__ */ __name((Selector, Provider, _Legend) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_semantic_tokens_provider",
    Selector,
    Provider
  ), "registerDocumentSemanticTokensProvider"),
  registerInlayHintsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_inlay_hints_provider",
    Selector,
    Provider
  ), "registerInlayHintsProvider"),
  registerWorkspaceSymbolProvider: /* @__PURE__ */ __name((Provider) => {
    process.stdout.write(
      "[LandFix:LangNs] registerWorkspaceSymbolProvider called\n"
    );
    return RegisterProvider(
      Context,
      LanguageProviderRegistry,
      "register_workspace_symbol_provider",
      "*",
      Provider
    );
  }, "registerWorkspaceSymbolProvider"),
  createDiagnosticCollection: /* @__PURE__ */ __name((Name) => {
    const Owner = Name ?? "default";
    const Store = /* @__PURE__ */ new Map();
    let Disposed = false;
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
          [...Store.entries()].map(([U, D]) => ({
            uri: U,
            diagnostics: D
          }))
        ]).catch(() => {
        });
      }, "set"),
      delete: /* @__PURE__ */ __name((Uri) => {
        Store.delete(String(Uri));
        Context.MountainClient?.sendRequest("Diagnostic.Set", [
          Owner,
          [...Store.entries()].map(([U, D]) => ({
            uri: U,
            diagnostics: D
          }))
        ]).catch(() => {
        });
      }, "delete"),
      clear: /* @__PURE__ */ __name(() => {
        if (Store.size === 0) return;
        Store.clear();
        Context.MountainClient?.sendRequest("Diagnostic.Clear", [
          Owner
        ]).catch(() => {
        });
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
        if (Disposed) return;
        Disposed = true;
        if (Store.size === 0) return;
        Store.clear();
        Context.MountainClient?.sendRequest("Diagnostic.Clear", [
          Owner
        ]).catch(() => {
        });
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
  match: /* @__PURE__ */ __name((Selector, Document) => {
    const DocLanguage = typeof Document?.languageId === "string" ? Document.languageId : "";
    const DocScheme = typeof Document?.uri?.scheme === "string" ? Document.uri.scheme : "";
    const DocPath = typeof Document?.uri?.fsPath === "string" ? Document.uri.fsPath : typeof Document?.uri?.path === "string" ? Document.uri.path : "";
    const ScoreOne = /* @__PURE__ */ __name((One) => {
      if (typeof One === "string") {
        if (One === DocLanguage) return 10;
        if (One === "*") return 5;
        return 0;
      }
      if (!One || typeof One !== "object") return 0;
      const Filter = One;
      let Score = 0;
      if (typeof Filter.language === "string") {
        if (Filter.language === DocLanguage) Score += 5;
        else if (Filter.language === "*") Score += 3;
        else return 0;
      }
      if (typeof Filter.scheme === "string") {
        if (Filter.scheme === DocScheme) Score += 5;
        else if (Filter.scheme === "*") Score += 3;
        else return 0;
      }
      if (typeof Filter.pattern === "string" && DocPath.length > 0) {
        try {
          if (GlobToRegex_default(Filter.pattern).test(DocPath)) Score += 5;
          else return 0;
        } catch {
          return 0;
        }
      }
      if (typeof Filter.notebookType === "string") {
        const NotebookType = typeof Document?.notebook?.notebookType === "string" ? Document.notebook.notebookType : "";
        if (Filter.notebookType === NotebookType) Score += 1;
        else if (Filter.notebookType === "*") Score += 1;
        else return 0;
      }
      return Score;
    }, "ScoreOne");
    if (Array.isArray(Selector)) {
      let Best = 0;
      for (const One of Selector) {
        const Value = ScoreOne(One);
        if (Value > Best) Best = Value;
      }
      return Best;
    }
    return ScoreOne(Selector);
  }, "match"),
  onDidChangeDiagnostics: /* @__PURE__ */ __name((Listener) => {
    Context.Emitter.on("diagnostics.didChange", Listener);
    return {
      dispose: /* @__PURE__ */ __name(() => {
        Context.Emitter.off("diagnostics.didChange", Listener);
      }, "dispose")
    };
  }, "onDidChangeDiagnostics"),
  getDiagnostics: /* @__PURE__ */ __name((_Resource) => [], "getDiagnostics"),
  registerDocumentPasteEditProvider: /* @__PURE__ */ __name((Selector, Provider, _Metadata) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_paste_edit_provider",
    Selector,
    Provider
  ), "registerDocumentPasteEditProvider"),
  registerDocumentDropEditProvider: /* @__PURE__ */ __name((Selector, Provider, _Metadata) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_document_drop_edit_provider",
    Selector,
    Provider
  ), "registerDocumentDropEditProvider"),
  registerInlineCompletionItemProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_inline_completion_item_provider",
    Selector,
    Provider
  ), "registerInlineCompletionItemProvider"),
  registerInlineEditProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_inline_edit_provider",
    Selector,
    Provider
  ), "registerInlineEditProvider"),
  registerMultiDocumentHighlightProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_multi_document_highlight_provider",
    Selector,
    Provider
  ), "registerMultiDocumentHighlightProvider"),
  registerMappedEditsProvider: /* @__PURE__ */ __name((Selector, Provider) => RegisterProvider(
    Context,
    LanguageProviderRegistry,
    "register_mapped_edits_provider",
    Selector,
    Provider
  ), "registerMappedEditsProvider"),
  createLanguageStatusItem: /* @__PURE__ */ __name((Identifier, _Selector) => {
    process.stdout.write(
      `[LandFix:LangNs] createLanguageStatusItem id=${Identifier}
`
    );
    const Item = {
      id: Identifier,
      name: void 0,
      selector: _Selector,
      severity: 0,
      text: "",
      detail: void 0,
      busy: false,
      command: void 0,
      accessibilityInformation: void 0,
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    };
    return Item;
  }, "createLanguageStatusItem")
}), "CreateLanguagesNamespace");
var LanguagesNamespace_default = CreateLanguagesNamespace;
export {
  LanguagesNamespace_default as default
};
//# sourceMappingURL=LanguagesNamespace.js.map
