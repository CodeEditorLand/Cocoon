var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IMountainClientService.ts
import * as Effect from "effect/Effect";
var IMountainClientService = Effect.Service()(
  "Service/MountainClient",
  {
    effect: Effect.gen(function* () {
      return {};
    })
  }
);

// Source/Services/Logger.ts
import { Context, Effect as Effect2, Ref } from "effect";
var Logger = Context.Tag("Service/Logger");
var LoggerService = class extends Effect2.Service()(
  "Service/Logger",
  {
    effect: Effect2.gen(function* () {
      const ExtensionIdRef = yield* Ref.make(
        void 0
      );
      const LogLevelRef = yield* Ref.make("info");
      const FormatMessage = /* @__PURE__ */ __name((Message, Level, ExtensionId) => {
        const Timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const Prefix = `[${Level.toUpperCase()}${ExtensionId ? `:${ExtensionId}` : ""}]`;
        return `${Timestamp} ${Prefix} ${Message}`;
      }, "FormatMessage");
      const Trace = /* @__PURE__ */ __name((Message, ...Data) => Effect2.gen(function* () {
        const LogLevel = yield* Ref.get(LogLevelRef);
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        if (LogLevel === "trace") {
          const FormattedMessage = FormatMessage(
            Message,
            "trace",
            ExtensionId
          );
          return yield* Effect2.logTrace(Message).pipe(
            Effect2.annotateLogs({
              extensionId: ExtensionId,
              data: Data.length === 1 ? Data[0] : Data
            })
          );
        }
      }), "Trace");
      const Debug = /* @__PURE__ */ __name((Message, ...Data) => Effect2.gen(function* () {
        const LogLevel = yield* Ref.get(LogLevelRef);
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        if (LogLevel === "trace" || LogLevel === "debug") {
          const FormattedMessage = FormatMessage(
            Message,
            "debug",
            ExtensionId
          );
          return yield* Effect2.logDebug(Message).pipe(
            Effect2.annotateLogs({
              extensionId: ExtensionId,
              data: Data.length === 1 ? Data[0] : Data
            })
          );
        }
      }), "Debug");
      const Info = /* @__PURE__ */ __name((Message, ...Data) => Effect2.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        const FormattedMessage = FormatMessage(
          Message,
          "info",
          ExtensionId
        );
        return yield* Effect2.logInfo(Message).pipe(
          Effect2.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Info");
      const Warn = /* @__PURE__ */ __name((Message, ...Data) => Effect2.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return yield* Effect2.logWarning(Message).pipe(
          Effect2.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Warn");
      const Error2 = /* @__PURE__ */ __name((Message, ...Data) => Effect2.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return yield* Effect2.logError(Message).pipe(
          Effect2.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Error");
      const Fatal = /* @__PURE__ */ __name((Message, ...Data) => Effect2.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return yield* Effect2.logFatal(Message).pipe(
          Effect2.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Fatal");
      const SetExtensionId = /* @__PURE__ */ __name((ExtensionId) => Effect2.gen(function* () {
        yield* Ref.set(ExtensionIdRef, ExtensionId);
      }), "SetExtensionId");
      const GetExtensionId = /* @__PURE__ */ __name(() => Effect2.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return ExtensionId ?? "cocoon-core";
      }), "GetExtensionId");
      const ServiceImplementation = {
        Trace,
        Debug,
        Info,
        Warn,
        Error: Error2,
        Fatal,
        SetExtensionId,
        GetExtensionId
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "LoggerService");
  }
};

// Source/Services/MountainGRPCClient.ts
import { Context as Context2, Effect as Effect3, Layer } from "effect";
var MountainGRPCClientService = Context2.GenericTag("Service/MountainGRPCClient");
var MountainGRPCClientLive = Layer.effect(
  MountainGRPCClientService,
  Effect3.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    const logger = yield* Logger.Logger;
    const service = {
      _serviceBrand: void 0,
      // ==================== Window Operations ====================
      showTextDocument: /* @__PURE__ */ __name((uri, options = {}) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showTextDocument: ${uri}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showTextDocument", {
            uri: { value: uri },
            viewColumn: options.viewColumn ? options.viewColumn - 2 : void 0,
            // Convert ViewColumn enum (1-based to 0-based)
            preserveFocus: options.preserveFocus ?? true
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show text document: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error(`Failed to show text document: ${uri}`)
          );
        }
        return;
      }), "showTextDocument"),
      showInformationMessage: /* @__PURE__ */ __name((message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showInformationMessage: ${message}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showInformation", {
            message
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show information message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error(
              `Failed to show information message: ${message}`
            )
          );
        }
        return;
      }), "showInformationMessage"),
      showWarningMessage: /* @__PURE__ */ __name((message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showWarningMessage: ${message}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showWarning", {
            message
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show warning message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error(
              `Failed to show warning message: ${message}`
            )
          );
        }
        return;
      }), "showWarningMessage"),
      showErrorMessage: /* @__PURE__ */ __name((message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showErrorMessage: ${message}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showError", {
            message
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show error message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error(
              `Failed to show error message: ${message}`
            )
          );
        }
        return;
      }), "showErrorMessage"),
      createStatusBarItem: /* @__PURE__ */ __name((options) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] createStatusBarItem: ${options.id}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("createStatusBarItem", {
            id: options.id,
            text: options.text,
            tooltip: options.tooltip ?? ""
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to create status bar item: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.itemId) {
          return yield* Effect3.fail(
            new Error(
              `Failed to create status bar item: ${options.id}`
            )
          );
        }
        return result.itemId;
      }), "createStatusBarItem"),
      setStatusBarText: /* @__PURE__ */ __name((itemId, text) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] setStatusBarText: ${itemId} = ${text}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("setStatusBarText", {
            itemId,
            text
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to set status bar text: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "setStatusBarText"),
      createWebviewPanel: /* @__PURE__ */ __name((options) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] createWebviewPanel: ${options.viewType}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("createWebviewPanel", {
            viewType: options.viewType,
            title: options.title,
            iconPath: options.iconPath ?? "",
            viewColumn: options.viewColumn ? options.viewColumn - 2 : void 0,
            preserveFocus: options.preserveFocus ?? false,
            enableFindWidget: options.enableFindWidget ?? true,
            retainContextWhenHidden: options.retainContextWhenHidden ?? false,
            localResourceRoots: options.localResourceRoots ?? []
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to create webview panel: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (result?.handle === void 0) {
          return yield* Effect3.fail(
            new Error(
              `Failed to create webview panel: ${options.viewType}`
            )
          );
        }
        return result.handle;
      }), "createWebviewPanel"),
      setWebviewHtml: /* @__PURE__ */ __name((handle, html) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] setWebviewHtml: handle=${handle}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("setWebviewHtml", {
            handle,
            html
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to set webview HTML: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "setWebviewHtml"),
      postWebviewMessage: /* @__PURE__ */ __name((handle, message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] postWebviewMessage: handle=${handle}`
        );
        const isString = typeof message === "string";
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendNotification(
            "onDidReceiveMessage",
            {
              handle,
              stringMessage: isString ? message : void 0,
              bytesMessage: isString ? void 0 : message
            }
          ), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to post webview message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "postWebviewMessage"),
      // ==================== Workspace Operations ====================
      findFiles: /* @__PURE__ */ __name((pattern, include) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] findFiles: ${pattern}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("findFiles", {
            pattern,
            include: include ?? true
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to find files: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return result?.uris ?? [];
      }), "findFiles"),
      findTextInFiles: /* @__PURE__ */ __name((pattern, include, exclude) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] findTextInFiles: ${pattern}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("findTextInFiles", {
            pattern,
            include: include ?? [],
            exclude: exclude ?? []
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to find text in files: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return result?.matches ?? [];
      }), "findTextInFiles"),
      openDocument: /* @__PURE__ */ __name((uri, viewColumn) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] openDocument: ${uri}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("openDocument", {
            uri: { value: uri },
            viewColumn: viewColumn ? viewColumn - 2 : void 0
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to open document: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error(`Failed to open document: ${uri}`)
          );
        }
        return;
      }), "openDocument"),
      saveAll: /* @__PURE__ */ __name((includeUntitled = false) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] saveAll: includeUntitled=${includeUntitled}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("saveAll", {
            includeUntitled
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to save all: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error("Failed to save all documents")
          );
        }
        return;
      }), "saveAll"),
      applyEdit: /* @__PURE__ */ __name((uri, edits) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] applyEdit: ${uri}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("applyEdit", {
            uri: { value: uri },
            // `+ 1` converts vscode.Range (0-based) to
            // the workbench's `IRange` (1-based) shape
            // Mountain forwards verbatim to the
            // `sky://workspace/applyEdit` listener.
            // Without this, every `workspace.applyEdit`
            // from an extension lands one row too high
            // and one column too far left of the
            // extension's intent - rename refactors,
            // quick fixes, and snippet inserts all
            // shred the file silently.
            edits: edits.map((edit) => ({
              range: {
                start: {
                  line: edit.range.start.line + 1,
                  character: edit.range.start.character + 1
                },
                end: {
                  line: edit.range.end.line + 1,
                  character: edit.range.end.character + 1
                }
              },
              newText: edit.newText
            }))
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to apply edit: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect3.fail(
            new Error(`Failed to apply edit to: ${uri}`)
          );
        }
        return;
      }), "applyEdit"),
      // ==================== Command Operations ====================
      registerCommand: /* @__PURE__ */ __name((commandId, extensionId, title) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] registerCommand: ${commandId}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendNotification("registerCommand", {
            commandId,
            extensionId,
            title
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to register command: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "registerCommand"),
      executeCommand: /* @__PURE__ */ __name((commandId, ...args) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] executeCommand: ${commandId}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("executeCommand", {
            commandId,
            arguments: args.map((arg) => {
              if (typeof arg === "string") {
                return { stringValue: arg };
              }
              if (typeof arg === "number") {
                return { intValue: arg };
              }
              if (typeof arg === "boolean") {
                return { boolValue: arg };
              }
              if (arg instanceof Uint8Array) {
                return { bytesValue: arg };
              }
              return { stringValue: String(arg) };
            })
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (result?.error) {
          return yield* Effect3.fail(
            new Error(
              `Command execution failed: ${result.error.Message}`
            )
          );
        }
        return result?.value;
      }), "executeCommand"),
      unregisterCommand: /* @__PURE__ */ __name((commandId) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] unregisterCommand: ${commandId}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendNotification(
            "unregisterCommand",
            {
              commandId
            }
          ), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to unregister command: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "unregisterCommand"),
      // ==================== Secret Storage ====================
      getSecret: /* @__PURE__ */ __name((key) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] getSecret: ${key}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("getSecret", { key }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to get secret: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return result?.value;
      }), "getSecret"),
      storeSecret: /* @__PURE__ */ __name((key, value) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] storeSecret: ${key}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendNotification("storeSecret", {
            key,
            value
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to store secret: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "storeSecret"),
      deleteSecret: /* @__PURE__ */ __name((key) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] deleteSecret: ${key}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendNotification("deleteSecret", {
            key
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to delete secret: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "deleteSecret"),
      // ==================== File System Operations ====================
      readFile: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] readFile: ${uri}`
        );
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("readFile", {
            uri: { value: uri }
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.content) {
          return yield* Effect3.fail(
            new Error(`Failed to read file: ${uri}`)
          );
        }
        return result.content;
      }), "readFile"),
      writeFile: /* @__PURE__ */ __name((uri, content, encoding = "utf8") => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] writeFile: ${uri}`
        );
        yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendNotification("writeFile", {
            uri: { value: uri },
            content,
            encoding
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to write file: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return;
      }), "writeFile"),
      stat: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(`[MountainGRPCClient] stat: ${uri}`);
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("stat", {
            uri: { value: uri }
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to stat file: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result) {
          return yield* Effect3.fail(
            new Error(`Failed to stat file: ${uri}`)
          );
        }
        return result;
      }), "stat"),
      readdir: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(`[MountainGRPCClient] readdir: ${uri}`);
        const result = yield* Effect3.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("readdir", {
            uri: { value: uri }
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to read directory: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return result?.entries ?? [];
      }), "readdir")
    };
    return service;
  })
);
var MountainGRPCClientMock = Layer.effect(
  MountainGRPCClientService,
  Effect3.gen(function* () {
    const logger = yield* Logger.Logger;
    const mockSecrets = /* @__PURE__ */ new Map();
    const mockStatusBarItems = /* @__PURE__ */ new Map();
    const mockWebviewPanels = /* @__PURE__ */ new Map();
    let mockWebviewHandleCounter = 0;
    const service = {
      _serviceBrand: void 0,
      // Window Operations
      showTextDocument: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showTextDocument: ${uri}`
        );
        return;
      }), "showTextDocument"),
      showInformationMessage: /* @__PURE__ */ __name((message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showInformationMessage: ${message}`
        );
        return;
      }), "showInformationMessage"),
      showWarningMessage: /* @__PURE__ */ __name((message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showWarningMessage: ${message}`
        );
        return;
      }), "showWarningMessage"),
      showErrorMessage: /* @__PURE__ */ __name((message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showErrorMessage: ${message}`
        );
        return;
      }), "showErrorMessage"),
      createStatusBarItem: /* @__PURE__ */ __name((options) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] createStatusBarItem: ${options.id}`
        );
        const itemId = `status-${options.id}`;
        mockStatusBarItems.set(itemId, options.text);
        return itemId;
      }), "createStatusBarItem"),
      setStatusBarText: /* @__PURE__ */ __name((itemId, text) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] setStatusBarText: ${itemId}`
        );
        mockStatusBarItems.set(itemId, text);
        return;
      }), "setStatusBarText"),
      createWebviewPanel: /* @__PURE__ */ __name((options) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] createWebviewPanel: ${options.viewType}`
        );
        const handle = mockWebviewHandleCounter++;
        mockWebviewPanels.set(handle, { html: options.html ?? "" });
        return handle;
      }), "createWebviewPanel"),
      setWebviewHtml: /* @__PURE__ */ __name((handle, html) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] setWebviewHtml: ${handle}`
        );
        const panel = mockWebviewPanels.get(handle);
        if (panel) {
          panel.html = html;
        }
        return;
      }), "setWebviewHtml"),
      postWebviewMessage: /* @__PURE__ */ __name((handle, message) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] postWebviewMessage: ${handle}`
        );
        return;
      }), "postWebviewMessage"),
      // Workspace Operations
      findFiles: /* @__PURE__ */ __name((pattern) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] findFiles: ${pattern}`
        );
        return [];
      }), "findFiles"),
      findTextInFiles: /* @__PURE__ */ __name((pattern) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] findTextInFiles: ${pattern}`
        );
        return [];
      }), "findTextInFiles"),
      openDocument: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] openDocument: ${uri}`
        );
        return;
      }), "openDocument"),
      saveAll: /* @__PURE__ */ __name(() => Effect3.gen(function* () {
        yield* logger.debug("[MountainGRPCClientMock] saveAll");
        return;
      }), "saveAll"),
      applyEdit: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] applyEdit: ${uri}`
        );
        return;
      }), "applyEdit"),
      // Command Operations
      registerCommand: /* @__PURE__ */ __name((commandId) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] registerCommand: ${commandId}`
        );
        return;
      }), "registerCommand"),
      executeCommand: /* @__PURE__ */ __name((commandId) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] executeCommand: ${commandId}`
        );
        return void 0;
      }), "executeCommand"),
      unregisterCommand: /* @__PURE__ */ __name((commandId) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] unregisterCommand: ${commandId}`
        );
        return;
      }), "unregisterCommand"),
      // Secret Storage
      getSecret: /* @__PURE__ */ __name((key) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] getSecret: ${key}`
        );
        return mockSecrets.get(key);
      }), "getSecret"),
      storeSecret: /* @__PURE__ */ __name((key, value) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] storeSecret: ${key}`
        );
        mockSecrets.set(key, value);
        return;
      }), "storeSecret"),
      deleteSecret: /* @__PURE__ */ __name((key) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] deleteSecret: ${key}`
        );
        mockSecrets.delete(key);
        return;
      }), "deleteSecret"),
      // File System Operations
      readFile: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] readFile: ${uri}`
        );
        return new Uint8Array(0);
      }), "readFile"),
      writeFile: /* @__PURE__ */ __name((uri, content) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] writeFile: ${uri}`
        );
        return;
      }), "writeFile"),
      stat: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] stat: ${uri}`
        );
        return {
          isFile: true,
          isDirectory: false,
          size: 0,
          mtime: Date.now()
        };
      }), "stat"),
      readdir: /* @__PURE__ */ __name((uri) => Effect3.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] readdir: ${uri}`
        );
        return [];
      }), "readdir")
    };
    return service;
  })
);
var MountainGRPCClientLayer = MountainGRPCClientLive.pipe(
  Layer.provide(IMountainClientService)
);
var MountainGRPCClientMockLayer = MountainGRPCClientMock;
export {
  MountainGRPCClientLayer,
  MountainGRPCClientMockLayer,
  MountainGRPCClientService
};
//# sourceMappingURL=MountainGRPCClient.js.map
