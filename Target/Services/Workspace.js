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
            edits: edits.map((edit) => ({
              range: {
                start: {
                  line: edit.range.start.line,
                  character: edit.range.start.character
                },
                end: {
                  line: edit.range.end.line,
                  character: edit.range.end.character
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

// Source/Services/Workspace.ts
import { Context as Context3, Effect as Effect4, Ref as Ref2 } from "effect";
var WorkspaceService = class extends Effect4.Service()(
  "Service/Workspace",
  {
    effect: Effect4.gen(function* () {
      const Configuration = yield* Context3.Tag(
        "Service/Configuration"
      );
      const Logger2 = yield* Context3.Tag("Service/Logger");
      const InternalWorkspaceRef = yield* Ref2.make(void 0);
      const TextEditorsMapRef = yield* Ref2.make(
        /* @__PURE__ */ new Map()
      );
      const ActiveTextEditorRef = yield* Ref2.make(void 0);
      const VisibleTextEditorsRef = yield* Ref2.make([]);
      const OnDidChangeWorkspaceFoldersListeners = /* @__PURE__ */ new Set();
      const OnDidChangeActiveTextEditorListeners = /* @__PURE__ */ new Set();
      const OnDidChangeVisibleTextEditorsListeners = /* @__PURE__ */ new Set();
      const OnDidChangeTextDocumentListeners = /* @__PURE__ */ new Set();
      const OnDidChangeConfigurationListeners = /* @__PURE__ */ new Set();
      const AcceptWorkspaceData = /* @__PURE__ */ __name((Data) => Effect4.gen(function* () {
        const OldWorkspace = yield* Ref2.get(InternalWorkspaceRef);
        const Folders = (Data.folders ?? []).map((F, Index) => ({
          uri: VSCode.Uri.parse(
            typeof F === "string" ? F : F.uri ?? F.path ?? F
          ),
          name: F.name ?? (typeof F === "string" ? F.split("/").pop() ?? "" : ""),
          index: F.index ?? Index
        }));
        const NewWorkspace = {
          ID: Data.id,
          Name: Data.name,
          Folders,
          Configuration: Data.configuration ? VSCode.Uri.parse(Data.configuration) : void 0
        };
        yield* Ref2.set(InternalWorkspaceRef, NewWorkspace);
        Logger2.Info(
          `[WorkspaceService] Workspace updated: ${NewWorkspace.Name} with ${Folders.length} folders`
        );
        const OldFolders = OldWorkspace?.Folders ?? [];
        const AddedFolders = Folders.filter(
          (Folder) => !OldFolders.some(
            (OldFolder) => OldFolder.uri.toString() === Folder.uri.toString()
          )
        );
        const RemovedFolders = OldFolders.filter(
          (OldFolder) => !Folders.some(
            (Folder) => OldFolder.uri.toString() === OldFolder.uri.toString()
          )
        );
        if (AddedFolders.length > 0 || RemovedFolders.length > 0) {
          const Event = {
            added: AddedFolders,
            removed: RemovedFolders
          };
          OnDidChangeWorkspaceFoldersListeners.forEach(
            (listener) => listener(Event)
          );
        }
      }), "AcceptWorkspaceData");
      const AcceptEditorState = /* @__PURE__ */ __name((ActiveEditorId, VisibleEditorIds) => Effect4.gen(function* () {
        const TextEditorsMap = yield* Ref2.get(TextEditorsMapRef);
        const OldActiveEditor = yield* Ref2.get(ActiveTextEditorRef);
        const NewActiveEditor = ActiveEditorId ? TextEditorsMap.get(ActiveEditorId) : void 0;
        yield* Ref2.set(ActiveTextEditorRef, NewActiveEditor);
        if (OldActiveEditor !== NewActiveEditor) {
          Logger2.Debug(
            `[WorkspaceService] Active text editor changed: ${NewActiveEditor?.document.uri.toString() ?? "none"}`
          );
          OnDidChangeActiveTextEditorListeners.forEach(
            (listener) => listener(NewActiveEditor)
          );
        }
        const NewVisibleEditors = VisibleEditorIds.map(
          (id) => TextEditorsMap.get(id)
        ).filter(
          (editor) => editor !== void 0
        );
        yield* Ref2.set(VisibleTextEditorsRef, NewVisibleEditors);
        OnDidChangeVisibleTextEditorsListeners.forEach(
          (listener) => listener(NewVisibleEditors)
        );
      }), "AcceptEditorState");
      const GetWorkspaceFolder = /* @__PURE__ */ __name((uri) => {
        const Workspace = Effect4.runSync(Ref2.get(InternalWorkspaceRef));
        if (!Workspace) {
          return void 0;
        }
        const UriString = uri.toString();
        return Workspace.Folders.find((folder) => {
          const FolderUri = folder.uri.toString();
          return UriString.startsWith(FolderUri);
        });
      }, "GetWorkspaceFolder");
      const FindFiles = /* @__PURE__ */ __name((include, exclude, maxResults) => Effect4.gen(function* () {
        Logger2.Debug(
          `[WorkspaceService] Finding files: ${include}${exclude ? `, excluding: ${exclude}` : ""}` + (maxResults ? `, maxResults: ${maxResults}` : "")
        );
        const mountainClient = yield* MountainGRPCClientService;
        const pattern = typeof include === "string" ? include : include.pattern;
        const excludePatterns = exclude ? typeof exclude === "string" ? [exclude] : exclude.pattern : void 0;
        const files = yield* mountainClient.findFiles(
          pattern,
          excludePatterns
        );
        return files.map((uri) => ({
          scheme: "file",
          authority: "",
          path: uri,
          query: "",
          fragment: "",
          fsPath: uri,
          with: /* @__PURE__ */ __name(() => ({ scheme: "file", path: uri }), "with"),
          toString: /* @__PURE__ */ __name(() => uri, "toString")
        }));
      }), "FindFiles");
      const FindTextInFiles = /* @__PURE__ */ __name((query, options) => Effect4.gen(function* () {
        Logger2.Debug(`[WorkspaceService] Finding text in files`);
        const mountainClient = yield* MountainGRPCClientService;
        const pattern = query.pattern;
        const includePatterns = options?.include ? Array.isArray(options.include) ? options.include.map(
          (p) => typeof p === "string" ? p : p.pattern
        ) : [
          typeof options.include === "string" ? options.include : options.include.pattern
        ] : void 0;
        const excludePatterns = options?.exclude ? Array.isArray(options.exclude) ? options.exclude.map(
          (p) => typeof p === "string" ? p : p.pattern
        ) : [
          typeof options.exclude === "string" ? options.exclude : options.exclude.pattern
        ] : void 0;
        const matches = yield* mountainClient.findTextInFiles(
          pattern,
          includePatterns,
          excludePatterns
        );
        return matches.length > 0 ? matches.map((m) => ({
          scheme: "file",
          authority: "",
          path: m.uri,
          query: "",
          fragment: "",
          fsPath: m.uri,
          with: /* @__PURE__ */ __name(() => ({ scheme: "file", path: m.uri }), "with"),
          toString: /* @__PURE__ */ __name(() => m.uri, "toString")
        })) : null;
      }), "FindTextInFiles");
      const OpenTextDocument = /* @__PURE__ */ __name((uriOrOptions) => Effect4.gen(function* () {
        let Uri;
        let Language;
        let Content;
        if (uriOrOptions) {
          if ("uri" in uriOrOptions) {
            Uri = uriOrOptions;
          } else {
            Uri = VSCode.Uri.parse(
              `untitled:${Language}-${Date.now()}`
            );
            Language = uriOrOptions.language;
            Content = uriOrOptions.content;
          }
        } else {
          const ActiveEditor = yield* Ref2.get(ActiveTextEditorRef);
          if (!ActiveEditor) {
            return yield* Effect4.fail(
              new Error(
                "[WorkspaceService] No active text editor to open"
              )
            );
          }
          return ActiveEditor.document;
        }
        Logger2.Debug(
          `[WorkspaceService] Opening text document: ${Uri}`
        );
        const mountainClient = yield* MountainGRPCClientService;
        yield* mountainClient.openDocument(Uri.toString());
        let DocumentContent = Content ?? "";
        let DocumentLanguage = Language ?? "plaintext";
        if (Uri.scheme === "file") {
          const FileBytes = yield* Effect4.either(
            mountainClient.readFile(Uri.toString())
          );
          if (FileBytes._tag === "Right") {
            DocumentContent = new TextDecoder().decode(
              FileBytes.right
            );
            const Ext = Uri.fsPath.split(".").pop() ?? "";
            const ExtMap = {
              ts: "typescript",
              tsx: "typescriptreact",
              js: "javascript",
              jsx: "javascriptreact",
              rs: "rust",
              py: "python",
              json: "json",
              md: "markdown",
              toml: "toml",
              yaml: "yaml",
              yml: "yaml",
              css: "css",
              html: "html",
              sh: "shellscript"
            };
            DocumentLanguage = Language ?? ExtMap[Ext] ?? "plaintext";
          }
        }
        const DocumentLines = DocumentContent.split("\n");
        return {
          uri: Uri,
          languageId: DocumentLanguage,
          version: 1,
          isDirty: false,
          isClosed: false,
          getText: /* @__PURE__ */ __name((Range) => {
            if (!Range) return DocumentContent;
            return DocumentLines.slice(
              Range.start.line,
              Range.end.line + 1
            ).join("\n");
          }, "getText"),
          lineCount: DocumentLines.length,
          lineAt: /* @__PURE__ */ __name((LineOrPos) => {
            const Num = typeof LineOrPos === "number" ? LineOrPos : LineOrPos.line;
            const Text = DocumentLines[Num] ?? "";
            return {
              lineNumber: Num,
              text: Text,
              range: {
                start: { line: Num, character: 0 },
                end: { line: Num, character: Text.length }
              },
              firstNonWhitespaceCharacterIndex: Text.search(/\S|$/)
            };
          }, "lineAt"),
          offsetAt: /* @__PURE__ */ __name((Pos) => DocumentLines.slice(0, Pos.line).reduce(
            (Sum, L) => Sum + L.length + 1,
            0
          ) + Pos.character, "offsetAt"),
          positionAt: /* @__PURE__ */ __name((Offset) => {
            let Remaining = Offset;
            for (let I = 0; I < DocumentLines.length; I++) {
              const Len = DocumentLines[I].length + 1;
              if (Remaining < Len)
                return { line: I, character: Remaining };
              Remaining -= Len;
            }
            return {
              line: DocumentLines.length - 1,
              character: 0
            };
          }, "positionAt"),
          getWordRangeAtPosition: /* @__PURE__ */ __name(() => void 0, "getWordRangeAtPosition"),
          validateRange: /* @__PURE__ */ __name((R) => R, "validateRange"),
          validatePosition: /* @__PURE__ */ __name((P) => P, "validatePosition"),
          save: /* @__PURE__ */ __name(() => Promise.resolve(true), "save"),
          eol: 1
        };
      }), "OpenTextDocument");
      const SaveAll = /* @__PURE__ */ __name((includeUntitled) => Effect4.gen(function* () {
        Logger2.Debug(
          `[WorkspaceService] Saving all documents${includeUntitled ? " (including untitled)" : ""}`
        );
        const mountainClient = yield* MountainGRPCClientService;
        yield* mountainClient.saveAll(includeUntitled ?? false);
        return true;
      }), "SaveAll");
      const ApplyEdit = /* @__PURE__ */ __name((edit) => Effect4.gen(function* () {
        Logger2.Info(
          `[WorkspaceService] Applying workspace edit with ${edit.entries()?.length ?? 0} changes`
        );
        const mountainClient = yield* MountainGRPCClientService;
        for (const entry of edit.entries() ?? []) {
          const [uri, edits] = entry;
          const textEdits = edits.map((e) => ({
            range: {
              start: {
                line: e.range.start.line,
                character: e.range.start.character
              },
              end: {
                line: e.range.end.line,
                character: e.range.end.character
              }
            },
            newText: e.newText
          }));
          yield* mountainClient.applyEdit(
            uri.toString(),
            textEdits
          );
        }
        return true;
      }), "ApplyEdit");
      const GetConfiguration = /* @__PURE__ */ __name((section, _scope) => {
        return {
          get: /* @__PURE__ */ __name((key, defaultValue) => {
            const FullKey = section ? key ? `${section}.${key}` : section : key ?? "";
            return Configuration.getValue(
              FullKey,
              1,
              defaultValue
            );
          }, "get"),
          has: /* @__PURE__ */ __name((HasKey) => {
            const FullKey = section ? `${section}.${HasKey}` : HasKey;
            return Configuration.hasKey(FullKey, 1);
          }, "has"),
          update: /* @__PURE__ */ __name((key, value, _configurationTarget) => {
            const FullKey = section ? `${section}.${key}` : key;
            Configuration.updateValue(FullKey, value, 1);
          }, "update"),
          inspect: /* @__PURE__ */ __name((InspectKey) => {
            const FullKey = section ? InspectKey ? `${section}.${InspectKey}` : section : InspectKey ?? "";
            return {
              key: FullKey,
              defaultValue: Configuration.getValue(
                FullKey,
                0,
                void 0
              ),
              globalValue: Configuration.getValue(
                FullKey,
                1,
                void 0
              ),
              workspaceValue: Configuration.getValue(
                FullKey,
                2,
                void 0
              ),
              workspaceFolderValue: void 0
            };
          }, "inspect")
        };
      }, "GetConfiguration");
      const OnDidChangeWorkspaceFolders = /* @__PURE__ */ __name((listener) => {
        OnDidChangeWorkspaceFoldersListeners.add(listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeWorkspaceFoldersListeners.delete(listener);
          }, "dispose")
        };
      }, "OnDidChangeWorkspaceFolders");
      const OnDidChangeActiveTextEditor = /* @__PURE__ */ __name((listener) => {
        OnDidChangeActiveTextEditorListeners.add(listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeActiveTextEditorListeners.delete(listener);
          }, "dispose")
        };
      }, "OnDidChangeActiveTextEditor");
      const OnDidChangeVisibleTextEditors = /* @__PURE__ */ __name((listener) => {
        OnDidChangeVisibleTextEditorsListeners.add(listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeVisibleTextEditorsListeners.delete(listener);
          }, "dispose")
        };
      }, "OnDidChangeVisibleTextEditors");
      const OnDidChangeTextDocument = /* @__PURE__ */ __name((listener) => {
        OnDidChangeTextDocumentListeners.add(listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeTextDocumentListeners.delete(listener);
          }, "dispose")
        };
      }, "OnDidChangeTextDocument");
      const OnDidChangeConfiguration = /* @__PURE__ */ __name((listener) => {
        OnDidChangeConfigurationListeners.add(listener);
        return {
          dispose: /* @__PURE__ */ __name(() => {
            OnDidChangeConfigurationListeners.delete(listener);
          }, "dispose")
        };
      }, "OnDidChangeConfiguration");
      const ServiceImplementation = {
        get name() {
          return Effect4.runSync(Ref2.get(InternalWorkspaceRef))?.Name;
        },
        get workspaceFile() {
          return Effect4.runSync(Ref2.get(InternalWorkspaceRef))?.Configuration;
        },
        get workspaceFolders() {
          return Effect4.runSync(Ref2.get(InternalWorkspaceRef))?.Folders;
        },
        get isTrusted() {
          return true;
        },
        get activeTextEditor() {
          return Effect4.runSync(Ref2.get(ActiveTextEditorRef));
        },
        get visibleTextEditors() {
          return Effect4.runSync(Ref2.get(VisibleTextEditorsRef));
        },
        GetWorkspaceFolder,
        FindFiles,
        FindTextInFiles,
        OpenTextDocument,
        SaveAll,
        ApplyEdit,
        GetConfiguration,
        OnDidChangeWorkspaceFolders,
        OnDidChangeActiveTextEditor,
        OnDidChangeVisibleTextEditors,
        OnDidChangeTextDocument,
        OnDidChangeConfiguration
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "WorkspaceService");
  }
};
export {
  WorkspaceService
};
//# sourceMappingURL=Workspace.js.map
