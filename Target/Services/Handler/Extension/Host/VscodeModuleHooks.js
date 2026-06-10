var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

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
var CocoonDevLog = /* @__PURE__ */ __name((Tag, Message) => {
  if (!IsEnabled(Tag)) return;
  const TagUpper = Tag.toUpperCase();
  process.stdout.write(`[DEV:${TagUpper}] ${Message}
`);
}, "CocoonDevLog");
var Log_default = CocoonDevLog;

// Source/Services/Handler/Extension/Host/VscodeModuleHooks.ts
var InstallVscodeModuleHooks = /* @__PURE__ */ __name(async () => {
  if (globalThis.__cocoonModuleHooksInstalled) return;
  globalThis.__cocoonModuleHooksInstalled = true;
  const ModuleModule = await import("module");
  const CreateRequire = ModuleModule.createRequire;
  const LocalRequire = CreateRequire(import.meta.url);
  try {
    const NodeModule = LocalRequire("module");
    const OriginalLoad = NodeModule._load;
    NodeModule._load = /* @__PURE__ */ __name(function PatchedLoad(Request, Parent, IsMain) {
      if (Request === "vscode") {
        const API = globalThis.__cocoonVscodeAPI;
        if (API) return API;
        CocoonDevLog(
          "ext-host",
          "[ExtensionHostHandler] require('vscode') called before shim registered - returning empty namespace"
        );
        return {};
      }
      return OriginalLoad.call(this, Request, Parent, IsMain);
    }, "PatchedLoad");
    CocoonDevLog(
      "ext-host",
      "[ExtensionHostHandler] Module._load hook installed - require('vscode') intercepted"
    );
  } catch (Err) {
    CocoonDevLog(
      "ext-host",
      `[ExtensionHostHandler] Failed to patch Module._load: ${Err instanceof Error ? Err.message : String(Err)}`
    );
  }
  try {
    const NodeModule = LocalRequire("module");
    if (typeof NodeModule.register === "function") {
      const VscodeExportNames = [
        // Namespaces
        "window",
        "workspace",
        "commands",
        "languages",
        "extensions",
        "env",
        "debug",
        "tasks",
        "scm",
        "authentication",
        "l10n",
        "notebooks",
        "tests",
        "comments",
        "chat",
        "lm",
        "interactive",
        // Type constructors
        "Position",
        "Range",
        "Location",
        "LocationLink",
        "Selection",
        "MarkdownString",
        "Hover",
        "CompletionItem",
        "CompletionItemKind",
        "CompletionItemTag",
        "CompletionList",
        "CompletionTriggerKind",
        "Diagnostic",
        "DiagnosticSeverity",
        "DiagnosticTag",
        "DiagnosticRelatedInformation",
        "TextEdit",
        "WorkspaceEdit",
        "SnippetString",
        "SnippetTextEdit",
        "SymbolKind",
        "SymbolTag",
        "SymbolInformation",
        "DocumentSymbol",
        "CodeActionKind",
        "CodeAction",
        "CodeActionTriggerKind",
        "CodeLens",
        "SignatureHelp",
        "SignatureHelpTriggerKind",
        "SignatureInformation",
        "ParameterInformation",
        "InlayHint",
        "InlayHintKind",
        "InlayHintLabelPart",
        "FoldingRange",
        "FoldingRangeKind",
        "DocumentHighlight",
        "DocumentHighlightKind",
        "SelectionRange",
        "SemanticTokensLegend",
        "SemanticTokensBuilder",
        "SemanticTokens",
        "SemanticTokensEdit",
        "SemanticTokensEdits",
        "RelativePattern",
        "Disposable",
        "StatusBarAlignment",
        "ThemeColor",
        "ThemeIcon",
        "TreeItem",
        "TreeItemCollapsibleState",
        "TreeItemCheckboxState",
        "ViewColumn",
        "EndOfLine",
        "ConfigurationTarget",
        "Uri",
        "CancellationTokenSource",
        "CancellationError",
        "EventEmitter",
        "FileType",
        "FilePermission",
        "FileSystemError",
        "DataTransfer",
        "DataTransferItem",
        "TextDocumentChangeReason",
        "TextDocumentSaveReason",
        "TextEditorCursorStyle",
        "TextEditorLineNumbersStyle",
        "TextEditorRevealType",
        "TextEditorSelectionChangeKind",
        "DecorationRangeBehavior",
        "OverviewRulerLane",
        "ColorPresentation",
        "ColorInformation",
        "Color",
        "QuickPickItemKind",
        "InputBoxValidationSeverity",
        "ProgressLocation",
        "NotebookCellData",
        "NotebookCellKind",
        "NotebookCellOutput",
        "NotebookCellOutputItem",
        "NotebookData",
        "NotebookEdit",
        "NotebookRange",
        "TestRunProfileKind",
        "TestMessage",
        "TestRunRequest",
        "TestTag",
        "DebugAdapterExecutable",
        "DebugAdapterInlineImplementation",
        "DebugAdapterNamedPipeServer",
        "DebugAdapterServer",
        "DebugConfigurationProviderTriggerKind",
        "IndentAction",
        "Breakpoint",
        "FunctionBreakpoint",
        "SourceBreakpoint",
        "TerminalLink",
        "TerminalLocation",
        "TerminalProfile",
        "TaskGroup",
        "TaskScope",
        "TaskRevealKind",
        "TaskPanelKind",
        "ShellExecution",
        "ProcessExecution",
        "CustomExecution",
        "Task",
        "CommentMode",
        "CommentThreadCollapsibleState",
        "CommentThreadState",
        "ExtensionKind",
        "ExtensionMode",
        "UIKind",
        "LogLevel",
        "LanguageStatusSeverity",
        "TextSearchContext",
        "TextSearchMatch",
        "DocumentLink",
        "LinkedEditingRanges",
        "EvaluatableExpression",
        "InlineValueText",
        "InlineValueVariableLookup",
        "InlineValueEvaluatableExpression",
        "TypeHierarchyItem",
        "CallHierarchyItem",
        "CallHierarchyIncomingCall",
        "CallHierarchyOutgoingCall",
        // Fields
        "version"
      ];
      const NamedExports = VscodeExportNames.map(
        (Name) => `export const ${Name} = API.${Name};`
      ).join("\n");
      const BridgeSource = [
        "const API = globalThis.__cocoonVscodeAPI || {};",
        NamedExports,
        "export default API;",
        "export const __esModule = true;"
      ].join("\n");
      const LoaderSource = `
				const BRIDGE_URL = 'vscode-shim:///vscode';

				const BRIDGE_SOURCE = ${JSON.stringify(BridgeSource)};

				export async function resolve(Specifier, Context, NextResolve) {

					if (Specifier === 'vscode') {

						return { url: BRIDGE_URL, shortCircuit: true, format: 'module' };
					}

					return NextResolve(Specifier, Context);
				}

				export async function load(Url, Context, NextLoad) {

					if (Url === BRIDGE_URL) {

						return { format: 'module', source: BRIDGE_SOURCE, shortCircuit: true };
					}

					return NextLoad(Url, Context);
				}

			`;
      const LoaderURL = `data:text/javascript;base64,${Buffer.from(LoaderSource).toString("base64")}`;
      try {
        NodeModule.register(LoaderURL, import.meta.url);
        CocoonDevLog(
          "ext-host",
          "[ExtensionHostHandler] ESM loader registered - import 'vscode' intercepted"
        );
      } catch (RegisterErr) {
        CocoonDevLog(
          "ext-host",
          `[ExtensionHostHandler] module.register failed (ESM imports of 'vscode' will fail): ${RegisterErr instanceof Error ? RegisterErr.message : String(RegisterErr)}`
        );
      }
    }
  } catch (Err) {
    CocoonDevLog(
      "ext-host",
      `[ExtensionHostHandler] ESM loader setup skipped: ${Err instanceof Error ? Err.message : String(Err)}`
    );
  }
}, "InstallVscodeModuleHooks");
var VscodeModuleHooks_default = InstallVscodeModuleHooks;
export {
  VscodeModuleHooks_default as default
};
//# sourceMappingURL=VscodeModuleHooks.js.map
