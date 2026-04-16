var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/DocumentContentHandler.ts
var InferLanguageIdentifier = /* @__PURE__ */ __name((Uri) => {
  const ExtensionMatch = Uri.match(/\.([^./?#]+)(?:\?|#|$)/);
  if (!ExtensionMatch?.[1]) return "plaintext";
  const Extension = ExtensionMatch[1].toLowerCase();
  const LanguageMap = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    json: "json",
    jsonc: "jsonc",
    md: "markdown",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    less: "less",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    rs: "rust",
    py: "python",
    rb: "ruby",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    sh: "shellscript",
    bash: "shellscript",
    zsh: "shellscript",
    ps1: "powershell",
    sql: "sql",
    graphql: "graphql",
    proto: "proto3",
    dockerfile: "dockerfile",
    vue: "vue",
    svelte: "svelte",
    astro: "astro",
    txt: "plaintext"
  };
  return LanguageMap[Extension] ?? "plaintext";
}, "InferLanguageIdentifier");
var BuildTextDocument = /* @__PURE__ */ __name((Uri, Content, Version = 1, LanguageIdentifier) => {
  const Lines = Content.split(/\r?\n/);
  const FileName = Uri.replace(/^file:\/\//, "");
  const ResolvedLanguage = LanguageIdentifier ?? InferLanguageIdentifier(Uri);
  return {
    uri: {
      scheme: "file",
      path: FileName,
      fsPath: FileName,
      authority: "",
      query: "",
      fragment: "",
      with: /* @__PURE__ */ __name(() => ({}), "with"),
      toString: /* @__PURE__ */ __name(() => Uri, "toString"),
      toJSON: /* @__PURE__ */ __name(() => ({ scheme: "file", path: FileName, fsPath: FileName }), "toJSON")
    },
    fileName: FileName,
    languageId: ResolvedLanguage,
    version: Version,
    lineCount: Lines.length,
    getText: /* @__PURE__ */ __name((Range) => {
      if (!Range) return Content;
      const StartLine = Range?.start?.line ?? 0;
      const StartCharacter = Range?.start?.character ?? 0;
      const EndLine = Range?.end?.line ?? Lines.length - 1;
      const EndCharacter = Range?.end?.character ?? (Lines[EndLine]?.length ?? 0);
      if (StartLine === EndLine) {
        return (Lines[StartLine] ?? "").substring(StartCharacter, EndCharacter);
      }
      const Result = [];
      Result.push((Lines[StartLine] ?? "").substring(StartCharacter));
      for (let Index = StartLine + 1; Index < EndLine; Index++) {
        Result.push(Lines[Index] ?? "");
      }
      Result.push((Lines[EndLine] ?? "").substring(0, EndCharacter));
      return Result.join("\n");
    }, "getText"),
    lineAt: /* @__PURE__ */ __name((LineOrPosition) => {
      const LineNumber = typeof LineOrPosition === "number" ? LineOrPosition : LineOrPosition.line;
      const Text = Lines[LineNumber] ?? "";
      return {
        text: Text,
        lineNumber: LineNumber,
        range: {
          start: { line: LineNumber, character: 0 },
          end: { line: LineNumber, character: Text.length }
        },
        isEmptyOrWhitespace: Text.trim().length === 0
      };
    }, "lineAt"),
    isUntitled: false,
    isDirty: false,
    isClosed: false,
    eol: 1,
    // EndOfLine.LF
    offsetAt: /* @__PURE__ */ __name((Position) => {
      let Offset = 0;
      for (let Index = 0; Index < Position.line && Index < Lines.length; Index++) {
        Offset += (Lines[Index]?.length ?? 0) + 1;
      }
      return Offset + Position.character;
    }, "offsetAt"),
    positionAt: /* @__PURE__ */ __name((Offset) => {
      let Remaining = Offset;
      for (let Index = 0; Index < Lines.length; Index++) {
        const LineLength = (Lines[Index]?.length ?? 0) + 1;
        if (Remaining < LineLength) {
          return { line: Index, character: Remaining };
        }
        Remaining -= LineLength;
      }
      return { line: Lines.length - 1, character: Lines[Lines.length - 1]?.length ?? 0 };
    }, "positionAt"),
    validateRange: /* @__PURE__ */ __name((Range) => Range, "validateRange"),
    validatePosition: /* @__PURE__ */ __name((Position) => Position, "validatePosition"),
    getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
    save: /* @__PURE__ */ __name(async () => false, "save")
  };
}, "BuildTextDocument");
var DocumentVersionMap = /* @__PURE__ */ new Map();
var HandleDocumentChange = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
  let Uri;
  let EventData;
  if (Array.isArray(Parameters) && Parameters.length >= 2) {
    Uri = Parameters[0]?.external ?? Parameters[0]?.toString?.() ?? "";
    EventData = Parameters[1];
  } else {
    Uri = Parameters?.uri?.external ?? Parameters?.uri ?? Parameters?.Uri ?? "";
    EventData = Parameters;
  }
  const Content = EventData?.content ?? EventData?.Content ?? EventData?.text;
  if (Uri && Content !== void 0) {
    DocumentContentCache.set(Uri, Content);
  } else if (Uri && (EventData?.changes || Parameters?.changes)) {
    const Existing = DocumentContentCache.get(Uri) ?? "";
    let Updated = Existing;
    const Changes = Array.isArray(EventData?.changes) ? EventData.changes : Array.isArray(Parameters?.changes) ? Parameters.changes : [];
    const Sorted = [...Changes].sort(
      (A, B) => (B.rangeOffset ?? 0) - (A.rangeOffset ?? 0)
    );
    for (const Change of Sorted) {
      const Offset = Change.rangeOffset ?? 0;
      const Length = Change.rangeLength ?? 0;
      const Text = Change.text ?? "";
      Updated = Updated.substring(0, Offset) + Text + Updated.substring(Offset + Length);
    }
    DocumentContentCache.set(Uri, Updated);
  }
  if (Uri && WorkspaceEventEmitter) {
    const CurrentVersion = (DocumentVersionMap.get(Uri) ?? 1) + 1;
    DocumentVersionMap.set(Uri, CurrentVersion);
    const CachedContent = DocumentContentCache.get(Uri) ?? "";
    const Document = BuildTextDocument(Uri, CachedContent, CurrentVersion);
    WorkspaceEventEmitter.emit("didChangeTextDocument", {
      document: Document,
      contentChanges: EventData?.changes ?? Parameters?.changes ?? [],
      reason: void 0
    });
  }
}, "HandleDocumentChange");
var HandleDocumentOpen = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
  const Models = Array.isArray(Parameters) ? Parameters : [Parameters];
  for (const Model of Models) {
    const Uri = Model?.URI?.toString?.() ?? Model?.URI ?? Model?.uri?.external ?? Model?.uri ?? Model?.Uri ?? "";
    const Lines = Model?.Lines ?? Model?.lines;
    const EOL = Model?.EOL ?? Model?.eol ?? "\n";
    let Content;
    if (Array.isArray(Lines)) {
      Content = Lines.join(EOL);
    } else {
      Content = Model?.content ?? Model?.Content ?? Model?.text;
    }
    const LanguageIdentifier = Model?.LanguageIdentifier ?? Model?.languageId ?? Model?.language;
    if (Uri && Content !== void 0) {
      DocumentContentCache.set(Uri, Content);
      DocumentVersionMap.set(Uri, 1);
      console.log(`[DocumentContentHandler] Document opened: ${Uri.slice(-60)} (${Content.length} chars)`);
      if (WorkspaceEventEmitter) {
        const Document = BuildTextDocument(Uri, Content, 1, LanguageIdentifier);
        WorkspaceEventEmitter.emit("didOpenTextDocument", Document);
      }
    }
  }
}, "HandleDocumentOpen");
var HandleDocumentClose = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
  const Items = Array.isArray(Parameters) ? Parameters : [Parameters];
  for (const Item of Items) {
    const Uri = Item?.external ?? Item?.uri?.external ?? Item?.uri ?? Item?.Uri ?? "";
    if (Uri) {
      if (WorkspaceEventEmitter) {
        const CachedContent = DocumentContentCache.get(Uri) ?? "";
        const Version = DocumentVersionMap.get(Uri) ?? 1;
        const Document = BuildTextDocument(Uri, CachedContent, Version);
        WorkspaceEventEmitter.emit("didCloseTextDocument", Document);
      }
      DocumentContentCache.delete(Uri);
      DocumentVersionMap.delete(Uri);
    }
  }
}, "HandleDocumentClose");
var HandleDocumentSave = /* @__PURE__ */ __name((DocumentContentCache, Parameters, WorkspaceEventEmitter) => {
  if (!WorkspaceEventEmitter) return;
  const Items = Array.isArray(Parameters) ? Parameters : [Parameters];
  for (const Item of Items) {
    const Uri = typeof Item === "string" ? Item : Item?.external ?? Item?.uri?.external ?? Item?.uri ?? Item?.Uri ?? "";
    if (Uri) {
      const CachedContent = DocumentContentCache.get(Uri) ?? "";
      const Version = DocumentVersionMap.get(Uri) ?? 1;
      const Document = BuildTextDocument(Uri, CachedContent, Version);
      WorkspaceEventEmitter.emit("didSaveTextDocument", Document);
    }
  }
}, "HandleDocumentSave");
var GetDocumentContent = /* @__PURE__ */ __name((DocumentContentCache, Uri) => {
  return DocumentContentCache.get(Uri) ?? null;
}, "GetDocumentContent");
var DocumentContentHandler_default = {
  HandleDocumentChange,
  HandleDocumentOpen,
  HandleDocumentClose,
  HandleDocumentSave,
  GetDocumentContent,
  BuildTextDocument
};
export {
  DocumentContentHandler_default as default
};
//# sourceMappingURL=DocumentContentHandler.js.map
