var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/I/Configuration/Service.ts
import { Context } from "effect";
var ConfigurationScope = /* @__PURE__ */ ((ConfigurationScope2) => {
  ConfigurationScope2["APPLICATION"] = "APPLICATION";
  ConfigurationScope2["WORKSPACE"] = "WORKSPACE";
  ConfigurationScope2["PROFILE"] = "PROFILE";
  return ConfigurationScope2;
})(ConfigurationScope || {});
var IConfigurationService = Context.Tag(
  "IConfigurationService"
);

// Source/Interfaces/I/Mountain/Client/Service.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/File/System/Service.ts
import { Context as Context2, Effect as Effect2, Layer } from "effect";
var IFileSystemService = Context2.Tag();
var FileSystemService = class {
  constructor(mountainClient) {
    this.mountainClient = mountainClient;
  }
  mountainClient;
  static {
    __name(this, "FileSystemService");
  }
  async stat(uri) {
    const Path = uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "");
    const Response = await this.mountainClient.sendRequest(
      "FileSystem.Stat",
      Path
    );
    if (!Response) throw new Error(`File not found: ${Path}`);
    return {
      type: Response.type ?? 1,
      ctime: 0,
      mtime: Response.mtime ?? 0,
      size: Response.size ?? 0
    };
  }
  async readFile(uri) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    const response = await this.mountainClient.sendRequest(
      "FileSystem.ReadFile",
      uri.fsPath
    );
    return response;
  }
  async writeFile(uri, content) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    await this.mountainClient.sendRequest("FileSystem.WriteFile", {
      path: uri.fsPath,
      content: Array.from(content)
      // Serialize buffer to array
    });
  }
  async readDirectory(uri) {
    if (uri.scheme !== "file") {
      throw new Error(`Unsupported scheme: ${uri.scheme}`);
    }
    const Path = uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "");
    const Entries = await this.mountainClient.sendRequest(
      "FileSystem.ReadDirectory",
      Path
    );
    return (Entries ?? []).map(
      (E) => typeof E === "string" ? [E, 1] : [E.name, E.type]
    );
  }
  async createDirectory(uri) {
    await this.mountainClient.sendRequest(
      "FileSystem.CreateDirectory",
      uri.fsPath
    );
  }
  async delete(uri, _options) {
    await this.mountainClient.sendRequest("FileSystem.Delete", uri.fsPath);
  }
  async rename(source, target, _options) {
    await this.mountainClient.sendRequest("FileSystem.Rename", {
      from: source.fsPath,
      to: target.fsPath
    });
  }
};
var FileSystemServiceLayer = Layer.effect(
  IFileSystemService,
  Effect2.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    return new FileSystemService(mountainClient);
  })
);

// Source/Interfaces/I/Module/Interceptor/Service.ts
import { Context as Context3 } from "effect";
var SecurityLevel = /* @__PURE__ */ ((SecurityLevel2) => {
  SecurityLevel2["TRUSTED"] = "TRUSTED";
  SecurityLevel2["SANDBOXED"] = "SANDBOXED";
  SecurityLevel2["RESTRICTED"] = "RESTRICTED";
  SecurityLevel2["BLOCKED"] = "BLOCKED";
  return SecurityLevel2;
})(SecurityLevel || {});
var IModuleInterceptorService = Context3.Tag(
  "IModuleInterceptorService"
);

// Source/Interfaces/I/Terminal/Service.ts
import { Context as Context4 } from "effect";
var ITerminalService = Context4.Tag();

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

// Source/Services/API/Factory/Service.ts
import { Context as Context5, Effect as Effect3, Layer as Layer2 } from "effect";
var VsCodeTypes = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
var { URI } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js");
var { CancellationTokenSource, CancellationToken } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js");
var { Emitter } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js");
var StockRelativePattern = VsCodeTypes.RelativePattern;
var HydrateBase = /* @__PURE__ */ __name((Base) => {
  if (Base == null) return Base;
  if (typeof Base === "string") return Base;
  if (Base instanceof URI) return Base;
  if (typeof Base.uri !== "undefined") {
    const Uri = Base.uri;
    if (Uri instanceof URI) return Base;
    let Revived;
    if (typeof Uri === "string") {
      if (Uri.length === 0) {
        Revived = void 0;
      } else {
        try {
          Revived = URI.parse(Uri);
        } catch {
          Revived = void 0;
        }
      }
    } else {
      try {
        Revived = URI.revive(Uri);
      } catch {
        Revived = void 0;
      }
    }
    return { ...Base, uri: Revived };
  }
  try {
    const Revived = URI.revive(Base);
    return Revived ?? Base;
  } catch {
    return Base;
  }
}, "HydrateBase");
var PatchedRelativePattern = /* @__PURE__ */ __name(function RelativePattern(Base, Pattern) {
  const Safe = HydrateBase(Base);
  return Reflect.construct(
    StockRelativePattern,
    [Safe, Pattern],
    PatchedRelativePattern
  );
}, "RelativePattern");
PatchedRelativePattern.prototype = StockRelativePattern.prototype;
Object.setPrototypeOf(PatchedRelativePattern, StockRelativePattern);
var IAPIFactoryService = Context5.Tag();
var createVSCodeAPI = /* @__PURE__ */ __name((mountainClient, configService, fsService, terminalService) => {
  return {
    version: "1.88.0",
    // --- Type Constructors (real VS Code classes from @codeeditorland/output) ---
    Position: VsCodeTypes.Position,
    Range: VsCodeTypes.Range,
    Location: VsCodeTypes.Location,
    Selection: VsCodeTypes.Selection,
    MarkdownString: VsCodeTypes.MarkdownString,
    Hover: VsCodeTypes.Hover,
    CompletionItem: VsCodeTypes.CompletionItem,
    CompletionItemKind: VsCodeTypes.CompletionItemKind,
    CompletionItemTag: VsCodeTypes.CompletionItemTag,
    CompletionList: VsCodeTypes.CompletionList,
    CompletionTriggerKind: VsCodeTypes.CompletionTriggerKind,
    Diagnostic: VsCodeTypes.Diagnostic,
    DiagnosticSeverity: VsCodeTypes.DiagnosticSeverity,
    DiagnosticTag: VsCodeTypes.DiagnosticTag,
    DiagnosticRelatedInformation: VsCodeTypes.DiagnosticRelatedInformation,
    TextEdit: VsCodeTypes.TextEdit,
    WorkspaceEdit: VsCodeTypes.WorkspaceEdit,
    SnippetString: VsCodeTypes.SnippetString,
    SnippetTextEdit: VsCodeTypes.SnippetTextEdit,
    SymbolKind: VsCodeTypes.SymbolKind,
    SymbolInformation: VsCodeTypes.SymbolInformation,
    DocumentSymbol: VsCodeTypes.DocumentSymbol,
    CodeActionKind: VsCodeTypes.CodeActionKind,
    CodeAction: VsCodeTypes.CodeAction,
    CodeActionTriggerKind: VsCodeTypes.CodeActionTriggerKind,
    SignatureHelp: VsCodeTypes.SignatureHelp,
    SignatureHelpTriggerKind: VsCodeTypes.SignatureHelpTriggerKind,
    SignatureInformation: VsCodeTypes.SignatureInformation,
    ParameterInformation: VsCodeTypes.ParameterInformation,
    InlayHint: VsCodeTypes.InlayHint,
    InlayHintKind: VsCodeTypes.InlayHintKind,
    InlayHintLabelPart: VsCodeTypes.InlayHintLabelPart,
    FoldingRange: VsCodeTypes.FoldingRange,
    FoldingRangeKind: VsCodeTypes.FoldingRangeKind,
    DocumentHighlight: VsCodeTypes.DocumentHighlight,
    DocumentHighlightKind: VsCodeTypes.DocumentHighlightKind,
    DocumentLink: VsCodeTypes.DocumentLink,
    SelectionRange: VsCodeTypes.SelectionRange,
    SemanticTokensLegend: VsCodeTypes.SemanticTokensLegend,
    SemanticTokensBuilder: VsCodeTypes.SemanticTokensBuilder,
    SemanticTokens: VsCodeTypes.SemanticTokens,
    RelativePattern: PatchedRelativePattern,
    Disposable: VsCodeTypes.Disposable,
    StatusBarAlignment: VsCodeTypes.StatusBarAlignment,
    ThemeColor: VsCodeTypes.ThemeColor,
    ThemeIcon: VsCodeTypes.ThemeIcon,
    TreeItem: VsCodeTypes.TreeItem,
    TreeItemCollapsibleState: VsCodeTypes.TreeItemCollapsibleState,
    ViewColumn: VsCodeTypes.ViewColumn,
    EndOfLine: VsCodeTypes.EndOfLine,
    FileSystemError: VsCodeTypes.FileSystemError,
    FileChangeType: VsCodeTypes.FileChangeType,
    ConfigurationTarget: VsCodeTypes.ConfigurationTarget,
    DecorationRangeBehavior: VsCodeTypes.DecorationRangeBehavior,
    TextDocumentSaveReason: VsCodeTypes.TextDocumentSaveReason,
    // These enums are declared in vs/editor/common/config/editorOptions.ts
    // and vs/workbench/services/extensions/common/extensionHostProtocol.ts
    // respectively, but extHostTypes.js doesn't re-export them. Extensions
    // (vscodevim, gitlens) crash at activation reading .Line / .Web off
    // undefined. Inline the literal enum values so the API surface matches
    // what extensions expect. Keep in sync with the upstream enums.
    TextEditorCursorStyle: {
      Line: 1,
      Block: 2,
      Underline: 3,
      LineThin: 4,
      BlockOutline: 5,
      UnderlineThin: 6
    },
    UIKind: { Desktop: 1, Web: 2 },
    // URI is exposed as 'Uri' to match the vscode API surface
    Uri: URI,
    CancellationTokenSource,
    CancellationToken,
    // Emitter is the vscode.EventEmitter equivalent
    EventEmitter: Emitter,
    // --- Window Namespace ---
    window: {
      showInformationMessage: /* @__PURE__ */ __name(async (message, ..._items) => {
        await mountainClient.sendRequest("Window.ShowMessage", {
          title: "Information",
          message,
          level: "info"
        });
        return void 0;
      }, "showInformationMessage"),
      showErrorMessage: /* @__PURE__ */ __name(async (message, ..._items) => {
        await mountainClient.sendRequest("Window.ShowMessage", {
          title: "Error",
          message,
          level: "error"
        });
        return void 0;
      }, "showErrorMessage"),
      showWarningMessage: /* @__PURE__ */ __name(async (message, ..._items) => {
        await mountainClient.sendRequest("Window.ShowMessage", {
          title: "Warning",
          message,
          level: "warn"
        });
        return void 0;
      }, "showWarningMessage"),
      createTerminal: /* @__PURE__ */ __name((options) => {
        const name = typeof options === "string" ? options : options.name;
        const shellPath = typeof options === "object" ? options.shellPath : void 0;
        const cwd = typeof options === "object" ? options.cwd : void 0;
        const terminalIdPromise = terminalService.createTerminal(
          name,
          shellPath,
          cwd
        );
        return {
          name,
          sendText: /* @__PURE__ */ __name(async (text) => {
            const id = await terminalIdPromise;
            await terminalService.sendText(id, text);
          }, "sendText"),
          show: /* @__PURE__ */ __name(() => {
          }, "show"),
          hide: /* @__PURE__ */ __name(() => {
          }, "hide"),
          dispose: /* @__PURE__ */ __name(async () => {
            const id = await terminalIdPromise;
            await terminalService.kill(id);
          }, "dispose")
        };
      }, "createTerminal"),
      createStatusBarItem: /* @__PURE__ */ __name((_alignment, _priority) => ({
        show: /* @__PURE__ */ __name(() => {
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
        }, "hide"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose"),
        text: "",
        tooltip: "",
        command: void 0
      }), "createStatusBarItem"),
      createOutputChannel: /* @__PURE__ */ __name((_name) => ({
        append: /* @__PURE__ */ __name((_value) => {
        }, "append"),
        appendLine: /* @__PURE__ */ __name((_value) => {
        }, "appendLine"),
        clear: /* @__PURE__ */ __name(() => {
        }, "clear"),
        show: /* @__PURE__ */ __name(() => {
        }, "show"),
        hide: /* @__PURE__ */ __name(() => {
        }, "hide"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "createOutputChannel"),
      withProgress: /* @__PURE__ */ __name(async (_options, task) => {
        return task({ report: /* @__PURE__ */ __name((_value) => {
        }, "report") });
      }, "withProgress"),
      // Terminal shell-integration events. Land doesn't track shell
      // integration, so extensions (openai.chatgpt) that subscribe get
      // a never-firing event that still registers/disposes cleanly.
      // Must be a function returning IDisposable - not just an object -
      // because `vscode.window.onDidChangeTerminalShellIntegration(cb)`
      // is called as a function by the extension.
      onDidChangeTerminalShellIntegration: /* @__PURE__ */ __name((_Listener) => ({
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "onDidChangeTerminalShellIntegration"),
      onDidStartTerminalShellExecution: /* @__PURE__ */ __name((_Listener) => ({
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "onDidStartTerminalShellExecution"),
      onDidEndTerminalShellExecution: /* @__PURE__ */ __name((_Listener) => ({
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "onDidEndTerminalShellExecution")
    },
    // --- Workspace Namespace ---
    workspace: {
      workspaceFolders: [],
      getConfiguration: /* @__PURE__ */ __name((section) => {
        return {
          get: /* @__PURE__ */ __name((key, defaultValue) => {
            const fullKey = section ? `${section}.${key}` : key;
            return configService.getValue(fullKey, 0, defaultValue);
          }, "get"),
          update: /* @__PURE__ */ __name(async (key, value, target) => {
            const fullKey = section ? `${section}.${key}` : key;
            await configService.setValue(fullKey, value, target);
          }, "update"),
          has: /* @__PURE__ */ __name((key) => configService.hasKey(
            section ? `${section}.${key}` : key,
            0
          ), "has"),
          inspect: /* @__PURE__ */ __name((key) => configService.inspect(
            section ? `${section}.${key}` : key,
            0
          ), "inspect")
        };
      }, "getConfiguration"),
      // Filesystem API (Real Implementation)
      fs: {
        stat: /* @__PURE__ */ __name((uri) => fsService.stat(uri), "stat"),
        readFile: /* @__PURE__ */ __name((uri) => fsService.readFile(uri), "readFile"),
        writeFile: /* @__PURE__ */ __name((uri, content) => fsService.writeFile(uri, content), "writeFile"),
        readDirectory: /* @__PURE__ */ __name((uri) => fsService.readDirectory(uri), "readDirectory"),
        createDirectory: /* @__PURE__ */ __name((uri) => fsService.createDirectory(uri), "createDirectory"),
        delete: /* @__PURE__ */ __name((uri, options) => fsService.delete(uri, options), "delete"),
        rename: /* @__PURE__ */ __name((source, target, options) => fsService.rename(source, target, options), "rename")
      },
      findFiles: /* @__PURE__ */ __name(async (_include) => [], "findFiles"),
      openTextDocument: /* @__PURE__ */ __name(async (uri) => ({
        getText: /* @__PURE__ */ __name(() => "", "getText"),
        uri,
        languageId: "plaintext",
        lineCount: 0,
        fileName: uri.fsPath || ""
      }), "openTextDocument")
    },
    // --- Commands Namespace ---
    commands: /* @__PURE__ */ (() => {
      const LocalHandlers = /* @__PURE__ */ new Map();
      return {
        registerCommand: /* @__PURE__ */ __name((command, callback) => {
          LocalHandlers.set(command, callback);
          mountainClient.sendNotification("registerCommand", {
            commandId: command,
            extensionId: "unknown",
            title: command
          }).catch(() => {
          });
          return {
            dispose: /* @__PURE__ */ __name(() => {
              LocalHandlers.delete(command);
              mountainClient.sendNotification("unregisterCommand", {
                commandId: command
              }).catch(() => {
              });
            }, "dispose")
          };
        }, "registerCommand"),
        executeCommand: /* @__PURE__ */ __name(async (command, ...args) => {
          const Local = LocalHandlers.get(command);
          if (Local !== void 0) {
            return Local(...args);
          }
          try {
            const Result = await mountainClient.sendRequest(
              "executeCommand",
              {
                commandId: command,
                arguments: args.map((Arg) => {
                  if (typeof Arg === "string")
                    return { stringValue: Arg };
                  if (typeof Arg === "number")
                    return { intValue: Arg };
                  if (typeof Arg === "boolean")
                    return { boolValue: Arg };
                  return { stringValue: JSON.stringify(Arg) };
                })
              }
            );
            return Result?.result;
          } catch (Error2) {
            const Message = String(Error2?.message ?? Error2);
            const IsNotFound = Message.includes("not found") || Message.includes("Command not found");
            const IsExtensionNamespaced = command.includes(".") && !command.startsWith("vscode.") && !command.startsWith("workbench.") && !command.startsWith("editor.");
            if (IsNotFound && IsExtensionNamespaced) {
              return void 0;
            }
            throw Error2;
          }
        }, "executeCommand"),
        getCommands: /* @__PURE__ */ __name(async () => {
          const Result = await mountainClient.sendRequest("executeCommand", {
            commandId: "_getCommands",
            arguments: []
          }).catch(() => null);
          return Array.isArray(Result?.result) ? Result.result : [];
        }, "getCommands")
      };
    })(),
    // --- Env Namespace ---
    env: {
      appName: "CodeEditorLand",
      appRoot: "/app",
      language: "en-US",
      clipboard: {
        readText: /* @__PURE__ */ __name(async () => "", "readText"),
        writeText: /* @__PURE__ */ __name(async (_value) => {
        }, "writeText")
      },
      openExternal: /* @__PURE__ */ __name(async (target) => {
        const Url = typeof target === "string" ? target : target?.toString?.() ?? "";
        await mountainClient.sendNotification("openExternal", {
          url: Url
        });
        return true;
      }, "openExternal"),
      uriScheme: "codeeditorland",
      appHost: "desktop",
      remoteName: "",
      isNewAppInstall: false,
      isTelemetryEnabled: false,
      onDidChangeTelemetryEnabled: {
        event: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "event")
      }
    },
    // --- Extensions Namespace ---
    extensions: {
      getExtension: /* @__PURE__ */ __name((_id) => void 0, "getExtension"),
      all: []
    },
    // --- Languages Namespace ---
    // Full provider registration surface lifted from extHostLanguageFeatures.ts.
    // Each register*Provider sends a registration notification to Mountain so
    // the editor can dispatch feature requests back to Cocoon.
    languages: /* @__PURE__ */ (() => {
      let NextHandle2 = 1;
      const RegisterProvider = /* @__PURE__ */ __name((type, selector, provider) => {
        const Handle = NextHandle2++;
        Register(Handle, provider);
        mountainClient.sendNotification(`register_${type}`, {
          language_selector: typeof selector === "string" ? selector : JSON.stringify(selector),
          handle: Handle
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => Unregister(Handle), "dispose")
        };
      }, "RegisterProvider");
      return {
        getLanguages: /* @__PURE__ */ __name(() => [], "getLanguages"),
        setTextDocumentLanguage: /* @__PURE__ */ __name(async () => void 0, "setTextDocumentLanguage"),
        match: /* @__PURE__ */ __name(() => 0, "match"),
        createDiagnosticCollection: /* @__PURE__ */ __name((name) => {
          const Items = /* @__PURE__ */ new Map();
          return {
            name: name ?? "default",
            set: /* @__PURE__ */ __name((uri, diagnostics) => Items.set(
              uri?.toString?.() ?? String(uri),
              diagnostics
            ), "set"),
            delete: /* @__PURE__ */ __name((uri) => Items.delete(uri?.toString?.() ?? String(uri)), "delete"),
            clear: /* @__PURE__ */ __name(() => Items.clear(), "clear"),
            forEach: /* @__PURE__ */ __name((cb) => Items.forEach(cb), "forEach"),
            get: /* @__PURE__ */ __name((uri) => Items.get(uri?.toString?.() ?? String(uri)), "get"),
            has: /* @__PURE__ */ __name((uri) => Items.has(uri?.toString?.() ?? String(uri)), "has"),
            dispose: /* @__PURE__ */ __name(() => Items.clear(), "dispose")
          };
        }, "createDiagnosticCollection"),
        registerHoverProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("hover_provider", sel, p), "registerHoverProvider"),
        registerCompletionItemProvider: /* @__PURE__ */ __name((sel, p, ..._) => RegisterProvider("completion_item_provider", sel, p), "registerCompletionItemProvider"),
        registerDefinitionProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("definition_provider", sel, p), "registerDefinitionProvider"),
        registerReferenceProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("reference_provider", sel, p), "registerReferenceProvider"),
        registerCodeActionsProvider: /* @__PURE__ */ __name((sel, p, _meta) => RegisterProvider("code_actions_provider", sel, p), "registerCodeActionsProvider"),
        registerDocumentHighlightProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("document_highlight_provider", sel, p), "registerDocumentHighlightProvider"),
        registerDocumentSymbolProvider: /* @__PURE__ */ __name((sel, p, _meta) => RegisterProvider("document_symbol_provider", sel, p), "registerDocumentSymbolProvider"),
        registerWorkspaceSymbolProvider: /* @__PURE__ */ __name((p) => RegisterProvider("workspace_symbol_provider", "*", p), "registerWorkspaceSymbolProvider"),
        registerRenameProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("rename_provider", sel, p), "registerRenameProvider"),
        registerDocumentFormattingEditProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("document_formatting_provider", sel, p), "registerDocumentFormattingEditProvider"),
        registerDocumentRangeFormattingEditProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider(
          "document_range_formatting_provider",
          sel,
          p
        ), "registerDocumentRangeFormattingEditProvider"),
        registerOnTypeFormattingEditProvider: /* @__PURE__ */ __name((sel, p, _first, ..._more) => RegisterProvider("on_type_formatting_provider", sel, p), "registerOnTypeFormattingEditProvider"),
        registerSignatureHelpProvider: /* @__PURE__ */ __name((sel, p, ..._) => RegisterProvider("signature_help_provider", sel, p), "registerSignatureHelpProvider"),
        registerCodeLensProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("code_lens_provider", sel, p), "registerCodeLensProvider"),
        registerFoldingRangeProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("folding_range_provider", sel, p), "registerFoldingRangeProvider"),
        registerSelectionRangeProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("selection_range_provider", sel, p), "registerSelectionRangeProvider"),
        registerDocumentSemanticTokensProvider: /* @__PURE__ */ __name((sel, p, _legend) => RegisterProvider("semantic_tokens_provider", sel, p), "registerDocumentSemanticTokensProvider"),
        registerDocumentRangeSemanticTokensProvider: /* @__PURE__ */ __name((sel, p, _legend) => RegisterProvider("semantic_tokens_provider", sel, p), "registerDocumentRangeSemanticTokensProvider"),
        registerInlayHintsProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("inlay_hints_provider", sel, p), "registerInlayHintsProvider"),
        registerTypeHierarchyProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("type_hierarchy_provider", sel, p), "registerTypeHierarchyProvider"),
        registerCallHierarchyProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("call_hierarchy_provider", sel, p), "registerCallHierarchyProvider"),
        registerLinkedEditingRangeProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("linked_editing_range_provider", sel, p), "registerLinkedEditingRangeProvider"),
        registerDocumentLinkProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("document_link_provider", sel, p), "registerDocumentLinkProvider"),
        registerColorProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("color_provider", sel, p), "registerColorProvider"),
        registerImplementationProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("implementation_provider", sel, p), "registerImplementationProvider"),
        registerTypeDefinitionProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("type_definition_provider", sel, p), "registerTypeDefinitionProvider"),
        registerDeclarationProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("declaration_provider", sel, p), "registerDeclarationProvider"),
        registerEvaluatableExpressionProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("evaluatable_expression_provider", sel, p), "registerEvaluatableExpressionProvider"),
        registerInlineValuesProvider: /* @__PURE__ */ __name((sel, p) => RegisterProvider("inline_values_provider", sel, p), "registerInlineValuesProvider"),
        setLanguageConfiguration: /* @__PURE__ */ __name((lang, config) => {
          mountainClient.sendNotification("set_language_configuration", {
            language: lang,
            configuration: config
          }).catch(() => {
          });
          return { dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") };
        }, "setLanguageConfiguration")
      };
    })(),
    debug: {
      startDebugging: /* @__PURE__ */ __name(async () => false, "startDebugging"),
      activeDebugSession: void 0
    },
    scm: {
      createSourceControl: /* @__PURE__ */ __name((_id, _label) => ({
        createResourceGroup: /* @__PURE__ */ __name((_id2, _label2) => ({
          resourceStates: []
        }), "createResourceGroup"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose")
      }), "createSourceControl")
    },
    authentication: {
      getSession: /* @__PURE__ */ __name(async () => void 0, "getSession")
    }
  };
}, "createVSCodeAPI");
var APIFactoryService = class {
  constructor(mountainClient, configService, fsService, terminalService, moduleInterceptor) {
    this.mountainClient = mountainClient;
    this.configService = configService;
    this.fsService = fsService;
    this.terminalService = terminalService;
    this.moduleInterceptor = moduleInterceptor;
    this.api = createVSCodeAPI(
      mountainClient,
      configService,
      fsService,
      terminalService
    );
  }
  mountainClient;
  configService;
  fsService;
  terminalService;
  moduleInterceptor;
  static {
    __name(this, "APIFactoryService");
  }
  _serviceBrand;
  api;
  /**
   * Create/Get the API instance
   */
  createAPI() {
    return this.api;
  }
};
var APIFactoryLayer = Layer2.effect(
  IAPIFactoryService,
  Effect3.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    const configService = yield* IConfigurationService;
    const fsService = yield* IFileSystemService;
    const terminalService = yield* ITerminalService;
    const moduleInterceptor = yield* IModuleInterceptorService;
    return new APIFactoryService(
      mountainClient,
      configService,
      fsService,
      terminalService,
      moduleInterceptor
    );
  })
);
export {
  APIFactoryLayer,
  APIFactoryService,
  IAPIFactoryService
};
//# sourceMappingURL=Service.js.map
