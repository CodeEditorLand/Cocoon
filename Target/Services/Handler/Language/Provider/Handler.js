var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// Source/Services/Dev/Log.ts
var Raw = process.env["Trace"] ?? "";
var ParsedTags = Raw.split(",").map((Segment) => Segment.trim().toLowerCase()).filter((Segment) => Segment.length > 0);
var TagSet = new Set(ParsedTags);
var IsShort = TagSet.has("short");
var HasAll = TagSet.has("all");
var IsEnabled = /* @__PURE__ */ __name((Tag) => {
  if (TagSet.size === 0) return false;
  if (HasAll || IsShort) return true;
  return TagSet.has(Tag.toLowerCase());
}, "IsEnabled");
var CocoonDevLog2 = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog2;

// Source/Services/Language/Provider/Registry.ts
var Callbacks = /* @__PURE__ */ new Map();
function Register(Handle, Provider) {
  Callbacks.set(Handle, Provider);
}
__name(Register, "Register");
function Unregister(Handle) {
  Callbacks.delete(Handle);
}
__name(Unregister, "Unregister");
function Get(Handle) {
  const Provider = Callbacks.get(Handle);
  if (process.env.Trace) {
    CocoonDevLog(
      "registry",
      `[DEV:LANG] Get(handle=${Handle}) resolved=${Boolean(Provider)} (total_registered=${Callbacks.size})`
    );
  }
  return Provider;
}
__name(Get, "Get");
var NextHandle = 1e4;
function RegisterAutoHandle(Provider) {
  const Handle = NextHandle++;
  Callbacks.set(Handle, Provider);
  return Handle;
}
__name(RegisterAutoHandle, "RegisterAutoHandle");
function NextProviderHandle() {
  return NextHandle++;
}
__name(NextProviderHandle, "NextProviderHandle");
var Commands = /* @__PURE__ */ new Map();
function RegisterCommand(CommandId, Callback) {
  Commands.set(CommandId, Callback);
}
__name(RegisterCommand, "RegisterCommand");
function HasCommand(CommandId) {
  return Commands.has(CommandId);
}
__name(HasCommand, "HasCommand");
function ExecuteCommand(CommandId, ...Args) {
  const Handler = Commands.get(CommandId);
  if (Handler) return Handler(...Args);
  return void 0;
}
__name(ExecuteCommand, "ExecuteCommand");
function UnregisterCommand(CommandId) {
  Commands.delete(CommandId);
}
__name(UnregisterCommand, "UnregisterCommand");
function ListCommands() {
  return Array.from(Commands.keys());
}
__name(ListCommands, "ListCommands");
function ListHandles() {
  return Array.from(Callbacks.keys());
}
__name(ListHandles, "ListHandles");

// Source/Services/Handler/Language/Provider/Handler.ts
var NormalizeRange = /* @__PURE__ */ __name((VsRange) => {
  return {
    StartLineNumber: (VsRange?.start?.line ?? 0) + 1,
    StartColumn: (VsRange?.start?.character ?? 0) + 1,
    EndLineNumber: (VsRange?.end?.line ?? 0) + 1,
    EndColumn: (VsRange?.end?.character ?? 0) + 1
  };
}, "NormalizeRange");
var ResolveLanguageIdentifier = /* @__PURE__ */ __name((Extension) => {
  switch (Extension) {
    case "rs":
      return "rust";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
    case "mjs":
      return "javascript";
    case "json":
      return "json";
    case "toml":
      return "toml";
    case "md":
      return "markdown";
    case "py":
      return "python";
    case "go":
      return "go";
    default:
      return Extension || "plaintext";
  }
}, "ResolveLanguageIdentifier");
var BuildVsDocument = /* @__PURE__ */ __name(async (UriString, FsPath, LanguageIdentifier, DocumentContentCache) => {
  const { Position, Range } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
  let CachedContent = null;
  let CachedLines = null;
  const LoadContent = /* @__PURE__ */ __name(() => {
    if (CachedContent !== null) return CachedContent;
    const MirrorContent = DocumentContentCache.get(UriString);
    if (MirrorContent !== void 0) {
      CachedContent = MirrorContent;
      return CachedContent;
    }
    try {
      const Fs = __require("node:fs");
      CachedContent = Fs.readFileSync(FsPath, "utf8");
    } catch {
      CachedContent = "";
    }
    return CachedContent;
  }, "LoadContent");
  const GetLines = /* @__PURE__ */ __name(() => {
    if (CachedLines !== null) return CachedLines;
    CachedLines = LoadContent().split(/\r?\n/);
    return CachedLines;
  }, "GetLines");
  return {
    uri: {
      toString: /* @__PURE__ */ __name(() => UriString, "toString"),
      fsPath: FsPath,
      external: UriString,
      $mid: 1,
      scheme: "file",
      path: FsPath
    },
    fileName: FsPath,
    languageId: LanguageIdentifier,
    version: 1,
    isDirty: false,
    isClosed: false,
    eol: 1,
    // LF
    getText: /* @__PURE__ */ __name((_range) => {
      const Text = LoadContent();
      if (!_range) return Text;
      const Lines = GetLines();
      const StartLine = _range?.start?.line ?? 0;
      const StartChar = _range?.start?.character ?? 0;
      const EndLine = _range?.end?.line ?? Lines.length - 1;
      const EndChar = _range?.end?.character ?? Lines[EndLine]?.length ?? 0;
      if (StartLine === EndLine) {
        return (Lines[StartLine] ?? "").substring(StartChar, EndChar);
      }
      const Result = [];
      Result.push((Lines[StartLine] ?? "").substring(StartChar));
      for (let I = StartLine + 1; I < EndLine; I++)
        Result.push(Lines[I] ?? "");
      Result.push((Lines[EndLine] ?? "").substring(0, EndChar));
      return Result.join("\n");
    }, "getText"),
    lineAt: /* @__PURE__ */ __name((LineOrPos) => {
      const LineNum = typeof LineOrPos === "number" ? LineOrPos : LineOrPos?.line ?? 0;
      const Lines = GetLines();
      const LineText = Lines[LineNum] ?? "";
      const FirstNonWS = LineText.search(/\S/);
      return {
        text: LineText,
        lineNumber: LineNum,
        range: new Range(LineNum, 0, LineNum, LineText.length),
        rangeIncludingLineBreak: new Range(LineNum, 0, LineNum + 1, 0),
        firstNonWhitespaceCharacterIndex: FirstNonWS === -1 ? LineText.length : FirstNonWS,
        isEmptyOrWhitespace: LineText.trim().length === 0
      };
    }, "lineAt"),
    get lineCount() {
      return GetLines().length;
    },
    offsetAt: /* @__PURE__ */ __name((Pos) => {
      const Lines = GetLines();
      let Offset = 0;
      const TargetLine = Pos?.line ?? 0;
      for (let I = 0; I < TargetLine && I < Lines.length; I++) {
        Offset += (Lines[I] ?? "").length + 1;
      }
      return Offset + (Pos?.character ?? 0);
    }, "offsetAt"),
    positionAt: /* @__PURE__ */ __name((Offset) => {
      const Lines = GetLines();
      let Remaining = Offset;
      for (let I = 0; I < Lines.length; I++) {
        const LineText = Lines[I] ?? "";
        if (Remaining <= LineText.length) {
          return new Position(I, Remaining);
        }
        Remaining -= LineText.length + 1;
      }
      return new Position(
        Lines.length - 1,
        (Lines[Lines.length - 1] ?? "").length
      );
    }, "positionAt"),
    validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
    validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
    getWordRangeAtPosition: /* @__PURE__ */ __name((Pos, Pattern) => {
      const Lines = GetLines();
      const Line = Lines[Pos?.line ?? 0] ?? "";
      const Regex = Pattern ?? /\w+/g;
      const Col = Pos?.character ?? 0;
      let Match;
      Regex.lastIndex = 0;
      while ((Match = Regex.exec(Line)) !== null) {
        if (Match.index <= Col && Match.index + Match[0].length >= Col) {
          return new Range(
            Pos.line,
            Match.index,
            Pos.line,
            Match.index + Match[0].length
          );
        }
      }
      return void 0;
    }, "getWordRangeAtPosition"),
    save: /* @__PURE__ */ __name(async () => false, "save")
  };
}, "BuildVsDocument");
var InvokeLanguageProvider = /* @__PURE__ */ __name(async (Method, Parameters, DocumentContentCache) => {
  const Args = Array.isArray(Parameters) ? Parameters : [Parameters];
  const Handle = Args[0];
  const Provider = Get(Handle);
  if (!Provider) {
    CocoonDevLog2(
      "language-provider",
      `[LanguageProviderHandler] Provider handle ${Handle} not found for ${Method}`
    );
    return null;
  }
  const UriObj = Args[1];
  const UriString = typeof UriObj === "string" ? UriObj : UriObj?.external ?? "file:///unknown";
  const RawPos = Args[2];
  const SubtractOne = /* @__PURE__ */ __name((V) => V > 0 ? V - 1 : 0, "SubtractOne");
  const RawLine = RawPos?.Line ?? RawPos?.lineNumber ?? RawPos?.line ?? 1;
  const RawCol = RawPos?.Character ?? RawPos?.column ?? RawPos?.character ?? 1;
  const PosLine = SubtractOne(RawLine);
  const PosChar = SubtractOne(RawCol);
  const { Position } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
  const VsPosition = new Position(PosLine, PosChar);
  const Ext = UriString.split(".").pop() ?? "";
  const LangId = ResolveLanguageIdentifier(Ext);
  const FsPath = UriString.replace(/^file:\/\//, "");
  const VsDocument = await BuildVsDocument(
    UriString,
    FsPath,
    LangId,
    DocumentContentCache
  );
  const { CancellationTokenSource } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");
  const VsToken = new CancellationTokenSource().token;
  const Context = Args[3];
  try {
    switch (Method) {
      case "$provideHover": {
        if (process.env.Trace) {
          CocoonDevLog2(
            "exthost",
            `[DEV:EXTHOST] provideHover dispatch uri=${UriString} line=${VsPosition?.line} char=${VsPosition?.character} providerHasMethod=${typeof Provider.provideHover === "function"}`
          );
        }
        const Result = await Provider.provideHover?.(
          VsDocument,
          VsPosition,
          VsToken
        );
        if (process.env.Trace) {
          CocoonDevLog2(
            "exthost",
            `[DEV:EXTHOST] provideHover result kind=${Result ? Array.isArray(Result.contents) ? `array(${Result.contents.length})` : typeof Result.contents : "null"}`
          );
        }
        if (!Result) return null;
        const RawContents = Result.contents;
        const Contents = Array.isArray(
          RawContents
        ) ? RawContents.map((C) => ({
          Value: typeof C === "string" ? C : C?.value ?? C?.Value ?? ""
        })) : typeof RawContents === "string" ? [{ Value: RawContents }] : [
          {
            Value: RawContents?.value ?? RawContents?.Value ?? ""
          }
        ];
        const VsRange = Result.range ?? null;
        const RangeDTO = VsRange ? {
          // `+ 1` to match `NormalizeRange` above; the
          // hover anchor range is what the workbench
          // uses to position the popup over the
          // underlined token. 0-based here = popup
          // floats one row above and one column left
          // of the actual symbol.
          StartLineNumber: (VsRange.start?.line ?? 0) + 1,
          StartColumn: (VsRange.start?.character ?? 0) + 1,
          EndLineNumber: (VsRange.end?.line ?? 0) + 1,
          EndColumn: (VsRange.end?.character ?? 0) + 1
        } : void 0;
        return RangeDTO !== void 0 ? { Contents, Range: RangeDTO } : { Contents };
      }
      // Mountain sends "$provideCompletion" (Debug fmt of ProviderType::Completion)
      case "$provideCompletion":
      case "$provideCompletions": {
        const Result = await Provider.provideCompletionItems?.(
          VsDocument,
          VsPosition,
          VsToken,
          Context
        );
        if (!Result) return { Suggestions: [], IsIncomplete: false };
        const RawItems = Array.isArray(Result) ? Result : Result.items ?? [];
        return {
          Suggestions: RawItems.map((Item) => ({
            Label: typeof Item.label === "string" ? Item.label : Item.label?.label ?? "",
            Kind: Item.kind ?? 0,
            Detail: Item.detail ?? void 0,
            Documentation: typeof Item.documentation === "string" ? { Value: Item.documentation } : Item.documentation?.value !== void 0 ? { Value: Item.documentation.value } : void 0,
            InsertText: typeof Item.insertText === "string" ? Item.insertText : typeof Item.label === "string" ? Item.label : Item.label?.label ?? ""
          })),
          IsIncomplete: Result.isIncomplete ?? false
        };
      }
      case "$provideDefinition": {
        const Result = await Provider.provideDefinition?.(
          VsDocument,
          VsPosition,
          VsToken
        );
        if (!Result) return null;
        const Locations = Array.isArray(Result) ? Result : [Result];
        return Locations.map((L) => ({
          Uri: (L.uri ?? L.targetUri)?.toString?.() ?? UriString,
          Range: NormalizeRange(L.range ?? L.targetSelectionRange)
        }));
      }
      case "$provideReferences": {
        const Result = await Provider.provideReferences?.(
          VsDocument,
          VsPosition,
          Context ?? { includeDeclaration: true },
          VsToken
        );
        if (!Result) return null;
        return Result.map((L) => ({
          Uri: L.uri?.toString?.() ?? UriString,
          Range: NormalizeRange(L.range)
        }));
      }
      // Mountain sends "$provideCodeAction" (ProviderType::CodeAction)
      case "$provideCodeAction":
      case "$provideCodeActions": {
        const RangeArg = Args[2];
        const ContextArg = Args[3];
        const Result = await Provider.provideCodeActions?.(
          VsDocument,
          RangeArg,
          ContextArg,
          VsToken
        );
        return Result ?? null;
      }
      // Mountain sends "$provideDocumentHighlight" (ProviderType::DocumentHighlight)
      case "$provideDocumentHighlight":
      case "$provideDocumentHighlights": {
        const Result = await Provider.provideDocumentHighlights?.(VsDocument, VsPosition, VsToken);
        return Result ?? null;
      }
      // Mountain sends "$provideDocumentSymbol" (ProviderType::DocumentSymbol)
      case "$provideDocumentSymbol":
      case "$provideDocumentSymbols": {
        const Result = await Provider.provideDocumentSymbols?.(
          VsDocument,
          VsToken
        );
        return Result ?? null;
      }
      // Mountain sends "$provideWorkspaceSymbol" (ProviderType::WorkspaceSymbol)
      case "$provideWorkspaceSymbol":
      case "$provideWorkspaceSymbols": {
        const Query = Args[1];
        const Result = await Provider.provideWorkspaceSymbols?.(Query, VsToken);
        return Result ?? null;
      }
      // Mountain: "$provideDocumentFormatting" / "$provideDocumentRangeFormatting"
      case "$provideDocumentFormatting":
      case "$provideDocumentFormattingEdits":
      case "$provideDocumentRangeFormatting":
      case "$provideDocumentRangeFormattingEdits": {
        const RangeArg = Args[2];
        const OptionsArg = Args[3];
        const Fn = Method === "$provideDocumentFormattingEdits" || Method === "$provideDocumentFormatting" ? "provideDocumentFormattingEdits" : "provideDocumentRangeFormattingEdits";
        const Result = await Provider[Fn]?.(
          VsDocument,
          RangeArg,
          OptionsArg,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideSignatureHelp": {
        const Result = await Provider.provideSignatureHelp?.(
          VsDocument,
          VsPosition,
          VsToken,
          Context
        );
        return Result ?? null;
      }
      // Mountain sends "$provideRename" (ProviderType::Rename)
      case "$provideRename":
      case "$provideRenameEdits": {
        const NewName = Args[3];
        const Result = await Provider.provideRenameEdits?.(
          VsDocument,
          VsPosition,
          NewName,
          VsToken
        );
        return Result ?? null;
      }
      // Mountain sends "$provideFoldingRange" (ProviderType::FoldingRange)
      case "$provideFoldingRange":
      case "$provideFoldingRanges": {
        const Result = await Provider.provideFoldingRanges?.(
          VsDocument,
          Context,
          VsToken
        );
        return Result ?? null;
      }
      // Mountain sends "$provideInlayHint" (ProviderType::InlayHint)
      case "$provideInlayHint":
      case "$provideInlayHints": {
        const RangeArg = Args[2];
        const Result = await Provider.provideInlayHints?.(
          VsDocument,
          RangeArg,
          VsToken
        );
        return Result ?? null;
      }
      // Mountain sends "$provideCodeLens" (ProviderType::CodeLens)
      case "$provideCodeLens":
      case "$provideCodeLenses": {
        const Result = await Provider.provideCodeLenses?.(
          VsDocument,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideOnTypeFormatting":
      case "$provideOnTypeFormattingEdits": {
        const TypeChar = Args[2];
        const TypeOptions = Args[3];
        const Result = await Provider.provideOnTypeFormattingEdits?.(
          VsDocument,
          VsPosition,
          TypeChar,
          TypeOptions ?? {},
          VsToken
        );
        return Result ?? null;
      }
      case "$provideSelectionRange":
      case "$provideSelectionRanges": {
        const Positions = Args[2];
        const Result = await Provider.provideSelectionRanges?.(
          VsDocument,
          Array.isArray(Positions) ? Positions.map(
            (P) => new Position(
              P?.line ?? P?.Line ?? 0,
              P?.character ?? P?.Character ?? 0
            )
          ) : [VsPosition],
          VsToken
        );
        return Result ?? null;
      }
      case "$provideSemanticTokens":
      case "$provideSemanticTokensFull": {
        const Result = await Provider.provideDocumentSemanticTokens?.(VsDocument, VsToken);
        return Result ?? null;
      }
      // `prepareCallHierarchy(document, position, token)` - the entry point.
      // Mountain calls this first to establish the `CallHierarchyItem` root
      // before requesting incoming/outgoing calls. Without this, call
      // hierarchy UI trees are always empty even with a registered provider.
      case "$prepareCallHierarchy":
      case "$prepareCallHierarchyItems": {
        const Result = await Provider.prepareCallHierarchy?.(
          VsDocument,
          VsPosition,
          VsToken
        );
        if (!Result) return null;
        return Array.isArray(Result) ? Result : [Result];
      }
      case "$provideCallHierarchy":
      case "$provideCallHierarchyIncomingCalls": {
        const Item = Args[1];
        const Result = await Provider.provideCallHierarchyIncomingCalls?.(Item, VsToken);
        return Result ?? null;
      }
      case "$provideCallHierarchyOutgoingCalls": {
        const Item = Args[1];
        const Result = await Provider.provideCallHierarchyOutgoingCalls?.(Item, VsToken);
        return Result ?? null;
      }
      // `prepareTypeHierarchy(document, position, token)` - entry point.
      // Establishes the root `TypeHierarchyItem` before sub/supertypes.
      case "$prepareTypeHierarchy":
      case "$prepareTypeHierarchyItems": {
        const Result = await Provider.prepareTypeHierarchy?.(
          VsDocument,
          VsPosition,
          VsToken
        );
        if (!Result) return null;
        return Array.isArray(Result) ? Result : [Result];
      }
      case "$provideTypeHierarchy":
      case "$provideTypeHierarchySupertypes": {
        const Item = Args[1];
        const Result = await Provider.provideTypeHierarchySupertypes?.(Item, VsToken);
        return Result ?? null;
      }
      case "$provideTypeHierarchySubtypes": {
        const Item = Args[1];
        const Result = await Provider.provideTypeHierarchySubtypes?.(Item, VsToken);
        return Result ?? null;
      }
      case "$provideLinkedEditingRange":
      case "$provideLinkedEditingRanges": {
        const Result = await Provider.provideLinkedEditingRanges?.(VsDocument, VsPosition, VsToken);
        return Result ?? null;
      }
      // VS Code ≥1.87 provider types - registered via the new
      // LanguageFeatures.rs arms; Mountain forwards $provideX with the
      // Debug name of ProviderType (e.g. InlineCompletion → $provideInlineCompletion).
      case "$provideInlineCompletion":
      case "$provideInlineCompletionItems": {
        const Context2 = Args[2];
        const Result = await Provider.provideInlineCompletionItems?.(
          VsDocument,
          VsPosition,
          Context2,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideInlineEdit":
      case "$provideInlineEdits": {
        const Context2 = Args[2];
        const Result = await Provider.provideInlineEdits?.(
          VsDocument,
          VsPosition,
          Context2,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideMultiDocumentHighlight":
      case "$provideMultiDocumentHighlights": {
        const OtherDocs = Args[2];
        const Result = await Provider.provideMultiDocumentHighlights?.(
          VsDocument,
          VsPosition,
          OtherDocs,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideMappedEdits": {
        const CodeBlocks = Args[2];
        const Context2 = Args[3];
        const Result = await Provider.provideMappedEdits?.(
          VsDocument,
          CodeBlocks,
          Context2,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideDocumentPasteEdit":
      case "$provideDocumentPasteEdits": {
        const Ranges = Args[2];
        const DataTransfer = Args[3];
        const Context2 = Args[4];
        const Result = await Provider.provideDocumentPasteEdits?.(
          VsDocument,
          Ranges,
          DataTransfer,
          Context2,
          VsToken
        );
        return Result ?? null;
      }
      case "$provideDocumentDropEdit":
      case "$provideDocumentDropEdits": {
        const DataTransfer = Args[2];
        const Result = await Provider.provideDocumentDropEdits?.(
          VsDocument,
          VsPosition,
          DataTransfer,
          VsToken
        );
        return Result ?? null;
      }
      // File decoration provider: called for each URI in the explorer.
      // Args: [handle, uri]
      case "$provideFileDecoration": {
        const UriArg = Args[1] ?? VsDocument?.uri ?? Args[0];
        let UriValue = UriArg;
        try {
          const API = globalThis.__cocoonVscodeAPI;
          if (API?.Uri) {
            const UriStr = typeof UriArg === "string" ? UriArg : UriArg?.external ?? (UriArg?.scheme && UriArg?.path ? `${UriArg.scheme}://${UriArg.authority ?? ""}${UriArg.path}` : "") ?? "";
            if (UriStr) UriValue = API.Uri.parse(UriStr);
          }
        } catch {
        }
        const Result = await Provider.provideFileDecoration?.(
          UriValue,
          VsToken
        );
        return Result ?? null;
      }
      // Two-phase resolution: extensions provide a lightweight list of items,
      // then VS Code calls resolve* for the selected item to load details.
      // Without these handlers the workbench only shows the stub item.
      case "$resolveCodeAction":
      case "$resolveCodeActions": {
        const Item = Args[1];
        const Result = await Provider.resolveCodeAction?.(
          Item,
          VsToken
        );
        return Result ?? Item ?? null;
      }
      case "$resolveCodeLens": {
        const Lens = Args[1];
        const Result = await Provider.resolveCodeLens?.(
          Lens,
          VsToken
        );
        return Result ?? Lens ?? null;
      }
      case "$resolveCompletionItem": {
        const Item = Args[1];
        const Result = await Provider.resolveCompletionItem?.(
          Item,
          VsToken
        );
        return Result ?? Item ?? null;
      }
      case "$resolveHover": {
        const Item = Args[1];
        const Result = await Provider.resolveHover?.(
          VsDocument,
          VsPosition,
          VsToken
        );
        return Result ?? Item ?? null;
      }
      case "$resolveInlayHint":
      case "$resolveInlayHints": {
        const Hint = Args[1];
        const Result = await Provider.resolveInlayHint?.(
          Hint,
          VsToken
        );
        return Result ?? Hint ?? null;
      }
      case "$resolveDocumentLink": {
        const Link = Args[1];
        const Result = await Provider.resolveDocumentLink?.(
          Link,
          VsToken
        );
        return Result ?? Link ?? null;
      }
      case "$resolveWorkspaceSymbol": {
        const Symbol2 = Args[1];
        const Result = await Provider.resolveWorkspaceSymbol?.(
          Symbol2,
          VsToken
        );
        return Result ?? Symbol2 ?? null;
      }
      default:
        CocoonDevLog2(
          "language-provider",
          `[LanguageProviderHandler] Unhandled $provide method: ${Method}`
        );
        return null;
    }
  } catch (Error2) {
    CocoonDevLog2(
      "language-provider",
      `[LanguageProviderHandler] Provider ${Handle} threw for ${Method}: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`
    );
    return null;
  }
}, "InvokeLanguageProvider");
var Handler_default = InvokeLanguageProvider;
export {
  Handler_default as default
};
//# sourceMappingURL=Handler.js.map
