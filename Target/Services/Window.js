var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

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

// Source/Utility/Event/Stream.ts
import {
  Emitter
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/event.js";
import { Effect as Effect2, PubSub } from "effect";
var CreateEventStream = /* @__PURE__ */ __name(() => {
  const VSCodeEmitter = new Emitter();
  const PubSubInstance = Effect2.runSync(PubSub.unbounded());
  const Fire = /* @__PURE__ */ __name((Data) => PubSub.publish(PubSubInstance, Data).pipe(
    Effect2.andThen(Effect2.sync(() => VSCodeEmitter.fire(Data))),
    Effect2.asVoid
  ), "Fire");
  const Shutdown = /* @__PURE__ */ __name(() => Effect2.all([
    PubSub.shutdown(PubSubInstance),
    Effect2.sync(() => VSCodeEmitter.dispose())
  ]).pipe(Effect2.asVoid), "Shutdown");
  return {
    Fire,
    PubSub: PubSubInstance,
    event: VSCodeEmitter.event,
    Shutdown
  };
}, "CreateEventStream");

// Source/Services/Logger.ts
import { Context, Effect as Effect3, Ref } from "effect";
var Logger = Context.Tag("Service/Logger");
var LoggerService = class extends Effect3.Service()(
  "Service/Logger",
  {
    effect: Effect3.gen(function* () {
      const ExtensionIdRef = yield* Ref.make(
        void 0
      );
      const LogLevelRef = yield* Ref.make("info");
      const FormatMessage = /* @__PURE__ */ __name((Message, Level, ExtensionId) => {
        const Timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const Prefix = `[${Level.toUpperCase()}${ExtensionId ? `:${ExtensionId}` : ""}]`;
        return `${Timestamp} ${Prefix} ${Message}`;
      }, "FormatMessage");
      const Trace = /* @__PURE__ */ __name((Message, ...Data) => Effect3.gen(function* () {
        const LogLevel = yield* Ref.get(LogLevelRef);
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        if (LogLevel === "trace") {
          const FormattedMessage = FormatMessage(
            Message,
            "trace",
            ExtensionId
          );
          return yield* Effect3.logTrace(Message).pipe(
            Effect3.annotateLogs({
              extensionId: ExtensionId,
              data: Data.length === 1 ? Data[0] : Data
            })
          );
        }
      }), "Trace");
      const Debug = /* @__PURE__ */ __name((Message, ...Data) => Effect3.gen(function* () {
        const LogLevel = yield* Ref.get(LogLevelRef);
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        if (LogLevel === "trace" || LogLevel === "debug") {
          const FormattedMessage = FormatMessage(
            Message,
            "debug",
            ExtensionId
          );
          return yield* Effect3.logDebug(Message).pipe(
            Effect3.annotateLogs({
              extensionId: ExtensionId,
              data: Data.length === 1 ? Data[0] : Data
            })
          );
        }
      }), "Debug");
      const Info = /* @__PURE__ */ __name((Message, ...Data) => Effect3.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        const FormattedMessage = FormatMessage(
          Message,
          "info",
          ExtensionId
        );
        return yield* Effect3.logInfo(Message).pipe(
          Effect3.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Info");
      const Warn = /* @__PURE__ */ __name((Message, ...Data) => Effect3.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return yield* Effect3.logWarning(Message).pipe(
          Effect3.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Warn");
      const Error2 = /* @__PURE__ */ __name((Message, ...Data) => Effect3.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return yield* Effect3.logError(Message).pipe(
          Effect3.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Error");
      const Fatal = /* @__PURE__ */ __name((Message, ...Data) => Effect3.gen(function* () {
        const ExtensionId = yield* Ref.get(ExtensionIdRef);
        return yield* Effect3.logFatal(Message).pipe(
          Effect3.annotateLogs({
            extensionId: ExtensionId,
            data: Data.length === 1 ? Data[0] : Data
          })
        );
      }), "Fatal");
      const SetExtensionId = /* @__PURE__ */ __name((ExtensionId) => Effect3.gen(function* () {
        yield* Ref.set(ExtensionIdRef, ExtensionId);
      }), "SetExtensionId");
      const GetExtensionId = /* @__PURE__ */ __name(() => Effect3.gen(function* () {
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

// Source/Services/Mountain/gRPC/Client.ts
import { Context as Context2, Effect as Effect4, Layer } from "effect";
var MountainGRPCClientService = Context2.GenericTag("Service/MountainGRPCClient");
var MountainGRPCClientLive = Layer.effect(
  MountainGRPCClientService,
  Effect4.gen(function* () {
    const mountainClient = yield* IMountainClientService;
    const logger = yield* Logger.Logger;
    const service = {
      _serviceBrand: void 0,
      // ==================== Window Operations ====================
      showTextDocument: /* @__PURE__ */ __name((uri, options = {}) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showTextDocument: ${uri}`
        );
        const result = yield* Effect4.tryPromise({
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
          return yield* Effect4.fail(
            new Error(`Failed to show text document: ${uri}`)
          );
        }
        return;
      }), "showTextDocument"),
      showInformationMessage: /* @__PURE__ */ __name((message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showInformationMessage: ${message}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showInformation", {
            message
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show information message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect4.fail(
            new Error(
              `Failed to show information message: ${message}`
            )
          );
        }
        return;
      }), "showInformationMessage"),
      showWarningMessage: /* @__PURE__ */ __name((message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showWarningMessage: ${message}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showWarning", {
            message
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show warning message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect4.fail(
            new Error(
              `Failed to show warning message: ${message}`
            )
          );
        }
        return;
      }), "showWarningMessage"),
      showErrorMessage: /* @__PURE__ */ __name((message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] showErrorMessage: ${message}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("showError", {
            message
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to show error message: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect4.fail(
            new Error(
              `Failed to show error message: ${message}`
            )
          );
        }
        return;
      }), "showErrorMessage"),
      createStatusBarItem: /* @__PURE__ */ __name((options) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] createStatusBarItem: ${options.id}`
        );
        const result = yield* Effect4.tryPromise({
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
          return yield* Effect4.fail(
            new Error(
              `Failed to create status bar item: ${options.id}`
            )
          );
        }
        return result.itemId;
      }), "createStatusBarItem"),
      setStatusBarText: /* @__PURE__ */ __name((itemId, text) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] setStatusBarText: ${itemId} = ${text}`
        );
        yield* Effect4.tryPromise({
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
      createWebviewPanel: /* @__PURE__ */ __name((options) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] createWebviewPanel: ${options.viewType}`
        );
        const result = yield* Effect4.tryPromise({
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
          return yield* Effect4.fail(
            new Error(
              `Failed to create webview panel: ${options.viewType}`
            )
          );
        }
        return result.handle;
      }), "createWebviewPanel"),
      setWebviewHtml: /* @__PURE__ */ __name((handle, html) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] setWebviewHtml: handle=${handle}`
        );
        yield* Effect4.tryPromise({
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
      postWebviewMessage: /* @__PURE__ */ __name((handle, message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] postWebviewMessage: handle=${handle}`
        );
        const isString = typeof message === "string";
        yield* Effect4.tryPromise({
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
      findFiles: /* @__PURE__ */ __name((pattern, include) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] findFiles: ${pattern}`
        );
        const result = yield* Effect4.tryPromise({
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
      findTextInFiles: /* @__PURE__ */ __name((pattern, include, exclude) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] findTextInFiles: ${pattern}`
        );
        const result = yield* Effect4.tryPromise({
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
      openDocument: /* @__PURE__ */ __name((uri, viewColumn) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] openDocument: ${uri}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("openDocument", {
            uri: { value: uri },
            viewColumn: viewColumn ? viewColumn - 2 : void 0
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to open document: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect4.fail(
            new Error(`Failed to open document: ${uri}`)
          );
        }
        return;
      }), "openDocument"),
      saveAll: /* @__PURE__ */ __name((includeUntitled = false) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] saveAll: includeUntitled=${includeUntitled}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("saveAll", {
            includeUntitled
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to save all: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect4.fail(
            new Error("Failed to save all documents")
          );
        }
        return;
      }), "saveAll"),
      applyEdit: /* @__PURE__ */ __name((uri, edits) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] applyEdit: ${uri}`
        );
        const SafeEdits = [];
        for (const edit of edits) {
          const Start = edit?.range?.start;
          const End = edit?.range?.end;
          if (!Start || !End || typeof Start.line !== "number" || typeof End.line !== "number") {
            continue;
          }
          SafeEdits.push({
            range: {
              // `+ 1` converts vscode.Range (0-based)
              // to the workbench's `IRange` (1-based).
              // Without this, every `workspace.applyEdit`
              // from an extension lands one row too high
              // and one column too far left - rename
              // refactors, quick fixes, snippet inserts
              // all shred the file silently.
              start: {
                line: Start.line + 1,
                character: (Start.character ?? 0) + 1
              },
              end: {
                line: End.line + 1,
                character: (End.character ?? 0) + 1
              }
            },
            newText: typeof edit.newText === "string" ? edit.newText : ""
          });
        }
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("applyEdit", {
            uri: { value: uri },
            edits: SafeEdits
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to apply edit: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.success) {
          return yield* Effect4.fail(
            new Error(`Failed to apply edit to: ${uri}`)
          );
        }
        return;
      }), "applyEdit"),
      // ==================== Command Operations ====================
      registerCommand: /* @__PURE__ */ __name((commandId, extensionId, title) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] registerCommand: ${commandId}`
        );
        yield* Effect4.tryPromise({
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
      executeCommand: /* @__PURE__ */ __name((commandId, ...args) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] executeCommand: ${commandId}`
        );
        const result = yield* Effect4.tryPromise({
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
          return yield* Effect4.fail(
            new Error(
              `Command execution failed: ${result.error.Message}`
            )
          );
        }
        return result?.value;
      }), "executeCommand"),
      unregisterCommand: /* @__PURE__ */ __name((commandId) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] unregisterCommand: ${commandId}`
        );
        yield* Effect4.tryPromise({
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
      getSecret: /* @__PURE__ */ __name((key) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] getSecret: ${key}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("getSecret", { key }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to get secret: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        return result?.value;
      }), "getSecret"),
      storeSecret: /* @__PURE__ */ __name((key, value) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] storeSecret: ${key}`
        );
        yield* Effect4.tryPromise({
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
      deleteSecret: /* @__PURE__ */ __name((key) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] deleteSecret: ${key}`
        );
        yield* Effect4.tryPromise({
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
      readFile: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] readFile: ${uri}`
        );
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("readFile", {
            uri: { value: uri }
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result?.content) {
          return yield* Effect4.fail(
            new Error(`Failed to read file: ${uri}`)
          );
        }
        return result.content;
      }), "readFile"),
      writeFile: /* @__PURE__ */ __name((uri, content, encoding = "utf8") => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClient] writeFile: ${uri}`
        );
        yield* Effect4.tryPromise({
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
      stat: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(`[MountainGRPCClient] stat: ${uri}`);
        const result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => mountainClient.sendRequest("stat", {
            uri: { value: uri }
          }), "try"),
          catch: /* @__PURE__ */ __name((error) => new Error(
            `Failed to stat file: ${error instanceof Error ? error.message : String(error)}`
          ), "catch")
        });
        if (!result) {
          return yield* Effect4.fail(
            new Error(`Failed to stat file: ${uri}`)
          );
        }
        return result;
      }), "stat"),
      readdir: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(`[MountainGRPCClient] readdir: ${uri}`);
        const result = yield* Effect4.tryPromise({
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
  Effect4.gen(function* () {
    const logger = yield* Logger.Logger;
    const mockSecrets = /* @__PURE__ */ new Map();
    const mockStatusBarItems = /* @__PURE__ */ new Map();
    const mockWebviewPanels = /* @__PURE__ */ new Map();
    let mockWebviewHandleCounter = 0;
    const service = {
      _serviceBrand: void 0,
      // Window Operations
      showTextDocument: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showTextDocument: ${uri}`
        );
        return;
      }), "showTextDocument"),
      showInformationMessage: /* @__PURE__ */ __name((message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showInformationMessage: ${message}`
        );
        return;
      }), "showInformationMessage"),
      showWarningMessage: /* @__PURE__ */ __name((message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showWarningMessage: ${message}`
        );
        return;
      }), "showWarningMessage"),
      showErrorMessage: /* @__PURE__ */ __name((message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] showErrorMessage: ${message}`
        );
        return;
      }), "showErrorMessage"),
      createStatusBarItem: /* @__PURE__ */ __name((options) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] createStatusBarItem: ${options.id}`
        );
        const itemId = `status-${options.id}`;
        mockStatusBarItems.set(itemId, options.text);
        return itemId;
      }), "createStatusBarItem"),
      setStatusBarText: /* @__PURE__ */ __name((itemId, text) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] setStatusBarText: ${itemId}`
        );
        mockStatusBarItems.set(itemId, text);
        return;
      }), "setStatusBarText"),
      createWebviewPanel: /* @__PURE__ */ __name((options) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] createWebviewPanel: ${options.viewType}`
        );
        const handle = mockWebviewHandleCounter++;
        mockWebviewPanels.set(handle, { html: options.html ?? "" });
        return handle;
      }), "createWebviewPanel"),
      setWebviewHtml: /* @__PURE__ */ __name((handle, html) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] setWebviewHtml: ${handle}`
        );
        const panel = mockWebviewPanels.get(handle);
        if (panel) {
          panel.html = html;
        }
        return;
      }), "setWebviewHtml"),
      postWebviewMessage: /* @__PURE__ */ __name((handle, message) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] postWebviewMessage: ${handle}`
        );
        return;
      }), "postWebviewMessage"),
      // Workspace Operations
      findFiles: /* @__PURE__ */ __name((pattern) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] findFiles: ${pattern}`
        );
        return [];
      }), "findFiles"),
      findTextInFiles: /* @__PURE__ */ __name((pattern) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] findTextInFiles: ${pattern}`
        );
        return [];
      }), "findTextInFiles"),
      openDocument: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] openDocument: ${uri}`
        );
        return;
      }), "openDocument"),
      saveAll: /* @__PURE__ */ __name(() => Effect4.gen(function* () {
        yield* logger.debug("[MountainGRPCClientMock] saveAll");
        return;
      }), "saveAll"),
      applyEdit: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] applyEdit: ${uri}`
        );
        return;
      }), "applyEdit"),
      // Command Operations
      registerCommand: /* @__PURE__ */ __name((commandId) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] registerCommand: ${commandId}`
        );
        return;
      }), "registerCommand"),
      executeCommand: /* @__PURE__ */ __name((commandId) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] executeCommand: ${commandId}`
        );
        return void 0;
      }), "executeCommand"),
      unregisterCommand: /* @__PURE__ */ __name((commandId) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] unregisterCommand: ${commandId}`
        );
        return;
      }), "unregisterCommand"),
      // Secret Storage
      getSecret: /* @__PURE__ */ __name((key) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] getSecret: ${key}`
        );
        return mockSecrets.get(key);
      }), "getSecret"),
      storeSecret: /* @__PURE__ */ __name((key, value) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] storeSecret: ${key}`
        );
        mockSecrets.set(key, value);
        return;
      }), "storeSecret"),
      deleteSecret: /* @__PURE__ */ __name((key) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] deleteSecret: ${key}`
        );
        mockSecrets.delete(key);
        return;
      }), "deleteSecret"),
      // File System Operations
      readFile: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] readFile: ${uri}`
        );
        return new Uint8Array(0);
      }), "readFile"),
      writeFile: /* @__PURE__ */ __name((uri, content) => Effect4.gen(function* () {
        yield* logger.debug(
          `[MountainGRPCClientMock] writeFile: ${uri}`
        );
        return;
      }), "writeFile"),
      stat: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
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
      readdir: /* @__PURE__ */ __name((uri) => Effect4.gen(function* () {
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

// Source/TypeConverter/Dialog/Filter.ts
var SerializeFilters = /* @__PURE__ */ __name((Filters) => {
  if (!Filters) {
    return void 0;
  }
  return Object.entries(Filters).map(([Name, Extensions]) => ({
    name: Name,
    extensions: Extensions
  }));
}, "SerializeFilters");

// Source/TypeConverter/Dialog/Open/Dialog/Option.ts
var ToDTO = /* @__PURE__ */ __name((Options) => {
  if (!Options) {
    return void 0;
  }
  return {
    ...Options,
    defaultUri: Options.defaultUri?.toJSON(),
    filters: SerializeFilters(Options.filters)
  };
}, "ToDTO");

// Source/TypeConverter/Dialog/Save/Dialog/Option.ts
var ToDTO2 = /* @__PURE__ */ __name((Options) => {
  if (!Options) {
    return void 0;
  }
  return {
    ...Options,
    defaultUri: Options.defaultUri?.toJSON(),
    filters: SerializeFilters(Options.filters)
  };
}, "ToDTO");

// Source/Services/Window/File/Dialogs.ts
import { Effect as Effect5 } from "effect";
var ShowOpenDialog = /* @__PURE__ */ __name((MountainClient, Logger3, Options) => Effect5.gen(function* () {
  yield* Logger3.Debug(`[WindowService] Showing open dialog`);
  const OptionsDTO = ToDTO(Options);
  const Result = yield* Effect5.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowOpenDialog",
        [OptionsDTO]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      const FilePaths = Response;
      const { Uri } = await import("vscode");
      return FilePaths.map((Path) => Uri.file(Path));
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show open dialog: ${Error_.message}`
      );
    }, "catch")
  });
  return Result;
}), "ShowOpenDialog");
var ShowSaveDialog = /* @__PURE__ */ __name((MountainClient, Logger3, Options) => Effect5.gen(function* () {
  yield* Logger3.Debug(`[WindowService] Showing save dialog`);
  const OptionsDTO = ToDTO2(Options);
  const ResultURI = yield* Effect5.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowSaveDialog",
        [OptionsDTO]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      const FilePath = Response;
      const { Uri } = await import("vscode");
      return Uri.file(FilePath);
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show save dialog: ${Error_.message}`
      );
    }, "catch")
  });
  return ResultURI ? await(async () => {
    const { Uri } = await import("vscode");
    return Uri.parse(ResultURI.toString());
  })() : void 0;
}), "ShowSaveDialog");

// Source/Services/Window/Output/Channel.ts
import { Effect as Effect6 } from "effect";
var CreateOutputChannel = /* @__PURE__ */ __name((MountainClient, Logger3, Name) => Effect6.gen(function* () {
  const ChannelId = `output-${crypto.randomUUID()}`;
  yield* Logger3.Info(
    `[WindowService] Creating output channel: ${Name} (${ChannelId})`
  );
  yield* Effect6.tryPromise({
    try: /* @__PURE__ */ __name(() => MountainClient.sendNotification("output.create", {
      id: ChannelId,
      name: Name
    }), "try"),
    catch: /* @__PURE__ */ __name(() => new Error("Failed to create output channel"), "catch")
  });
  return yield* Effect6.succeed({
    name: Name,
    append(Value) {
      MountainClient.sendNotification("output.append", {
        channel: ChannelId,
        value: Value
      }).catch(() => {
      });
    },
    appendLine(Value) {
      MountainClient.sendNotification("output.appendLine", {
        channel: ChannelId,
        value: Value
      }).catch(() => {
      });
    },
    clear() {
      MountainClient.sendNotification("output.clear", {
        channel: ChannelId
      }).catch(() => {
      });
    },
    show(_ColumnOrPreserveFocus, _PreserveFocus) {
      MountainClient.sendNotification("output.show", {
        channel: ChannelId
      }).catch(() => {
      });
    },
    hide() {
      MountainClient.sendNotification("output.show", {
        channel: ChannelId,
        visible: false
      }).catch(() => {
      });
    },
    dispose() {
      MountainClient.sendNotification("output.dispose", {
        channel: ChannelId
      }).catch(() => {
      });
    },
    replace(_Value) {
      MountainClient.sendNotification("output.replace", {
        channel: ChannelId,
        value: _Value
      }).catch(() => {
      });
    }
  });
}), "CreateOutputChannel");

// Source/Services/Window/Progress.ts
import { Effect as Effect7 } from "effect";
var WithProgress = /* @__PURE__ */ __name((MountainClient, Logger3, Options, Task) => Effect7.gen(function* () {
  const ProgressId = `progress-${crypto.randomUUID()}`;
  yield* Logger3.Info(
    `[WindowService] Starting progress: ${Options.location} (${ProgressId})`
  );
  const CancellationToken2 = {
    isCancellationRequested: false,
    onCancellationRequested: /* @__PURE__ */ __name((_Listener) => ({
      dispose: /* @__PURE__ */ __name(() => {
      }, "dispose")
    }), "onCancellationRequested")
  };
  const ProgressReporter = {
    report(Value) {
      MountainClient.sendNotification("progress.update", {
        id: ProgressId,
        message: Value.message,
        increment: Value.increment
      }).catch(() => {
      });
    }
  };
  yield* Effect7.tryPromise({
    try: /* @__PURE__ */ __name(() => MountainClient.sendNotification("progress.start", {
      id: ProgressId,
      location: Options.location,
      title: Options.title,
      cancellable: Options.cancellable ?? false
    }), "try"),
    catch: /* @__PURE__ */ __name(() => new Error("Failed to start progress"), "catch")
  });
  const Result = yield* Effect7.tryPromise({
    try: /* @__PURE__ */ __name(() => Task(ProgressReporter, CancellationToken2), "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Progress task failed: ${Error_.message}`
      );
    }, "catch")
  });
  yield* Effect7.tryPromise({
    try: /* @__PURE__ */ __name(() => MountainClient.sendNotification("progress.complete", {
      id: ProgressId
    }), "try"),
    catch: /* @__PURE__ */ __name(() => new Error("Failed to complete progress"), "catch")
  });
  return Result;
}), "WithProgress");

// Source/TypeConverter/Quick/Input.ts
var SerializeItems = /* @__PURE__ */ __name((Items) => {
  return Items.map((Item, Index) => {
    const Base = typeof Item === "string" ? { label: Item } : Item;
    return { ...Base, handle: Index };
  });
}, "SerializeItems");
var SerializeButtons = /* @__PURE__ */ __name((Buttons) => {
  return Buttons?.map((Button, Index) => {
    const iconPath = Button.iconPath;
    return {
      iconPath: iconPath ? "dark" in iconPath && "light" in iconPath ? {
        dark: iconPath.dark.toJSON(),
        light: iconPath.light.toJSON()
      } : iconPath.toJSON() : void 0,
      tooltip: Button.tooltip,
      handle: Index
    };
  });
}, "SerializeButtons");

// Source/Services/Window/Quick/Input.ts
import { Effect as Effect8 } from "effect";
var ShowQuickPick = /* @__PURE__ */ __name((MountainClient, Logger3, Items, Options) => Effect8.gen(function* () {
  yield* Logger3.Debug(
    `[WindowService] Showing quick pick with ${Items.length} items`
  );
  const ItemsDTO = SerializeItems(Items);
  const ButtonsDTO = Options?.buttons ? SerializeButtons(Options.buttons) : void 0;
  const RequestPayload = {
    items: ItemsDTO,
    options: Options ? {
      placeHolder: Options.placeHolder,
      matchOnDescription: Options.matchOnDescription,
      matchOnDetail: Options.matchOnDetail,
      ignoreFocusLost: Options.ignoreFocusLost,
      canPickMany: Options.canPickMany
    } : void 0,
    buttons: ButtonsDTO
  };
  const SelectedItems = yield* Effect8.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowQuickPick",
        [RequestPayload.items, RequestPayload.options]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      return Response;
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show quick pick: ${Error_.message}`
      );
    }, "catch")
  });
  if (!SelectedItems || SelectedItems.length === 0) {
    return void 0;
  }
  const SelectedValue = SelectedItems[0];
  if (typeof Items[0] === "string") {
    return SelectedValue;
  }
  return Items.find(
    (Item) => Item.label === SelectedValue
  );
}), "ShowQuickPick");
var ShowInputBox = /* @__PURE__ */ __name((MountainClient, Logger3, Options) => Effect8.gen(function* () {
  yield* Logger3.Debug(
    `[WindowService] Showing input box${Options ? ` with placeholder: ${Options.placeholder}` : ""}`
  );
  const RequestPayload = Options ? {
    title: Options.title,
    value: Options.value,
    valueSelection: Options.valueSelection,
    prompt: Options.prompt,
    placeHolder: Options.placeHolder,
    password: Options.password,
    ignoreFocusLost: Options.ignoreFocusLost,
    validateInput: Options.validateInput ? Options.validateInput.toString() : void 0
  } : void 0;
  const Result = yield* Effect8.tryPromise({
    try: /* @__PURE__ */ __name(async () => {
      const Response = await MountainClient.sendRequest(
        "UserInterface.ShowInputBox",
        [RequestPayload]
      );
      if (Response === null || Response === void 0) {
        return void 0;
      }
      return Response;
    }, "try"),
    catch: /* @__PURE__ */ __name((Error_) => {
      throw new Error(
        `Failed to show input box: ${Error_.message}`
      );
    }, "catch")
  });
  return Result;
}), "ShowInputBox");

// Source/Services/Window/Status/Bar.ts
import { Effect as Effect9 } from "effect";
var CreateStatusBarItem = /* @__PURE__ */ __name((MountainClient, GRPCClient, Logger3, Id, Alignment, Priority) => Effect9.gen(function* () {
  const ItemId = Id ?? `statusbar-${crypto.randomUUID()}`;
  yield* Logger3.Info(
    `[WindowService] Creating status bar item with id '${ItemId}'`
  );
  const State = {
    id: ItemId,
    name: void 0,
    text: "",
    tooltip: void 0,
    command: void 0,
    alignment: Alignment ?? 1,
    // Left = 1
    priority: Priority,
    backgroundColor: void 0,
    color: void 0,
    isVisible: false
  };
  yield* GRPCClient.createStatusBarItem({
    id: ItemId,
    text: "",
    tooltip: void 0
  });
  return yield* Effect9.succeed({
    get id() {
      return State.id;
    },
    get name() {
      return State.name;
    },
    set name(Value) {
      State.name = Value;
    },
    get alignment() {
      return State.alignment;
    },
    get priority() {
      return State.priority;
    },
    get text() {
      return State.text;
    },
    set text(Value) {
      State.text = Value;
      MountainClient.sendNotification("setStatusBarText", {
        itemId: ItemId,
        text: Value
      }).catch(() => {
      });
    },
    get tooltip() {
      return State.tooltip;
    },
    set tooltip(Value) {
      State.tooltip = Value;
    },
    get command() {
      return State.command;
    },
    set command(Value) {
      State.command = Value;
    },
    get backgroundColor() {
      return State.backgroundColor;
    },
    set backgroundColor(Value) {
      State.backgroundColor = Value;
    },
    get color() {
      return State.color;
    },
    set color(Value) {
      State.color = Value;
    },
    show() {
      State.isVisible = true;
      MountainClient.sendNotification("setStatusBarText", {
        itemId: ItemId,
        text: State.text,
        visible: true
      }).catch(() => {
      });
    },
    hide() {
      State.isVisible = false;
      MountainClient.sendNotification("setStatusBarText", {
        itemId: ItemId,
        text: State.text,
        visible: false
      }).catch(() => {
      });
    },
    dispose() {
      State.isVisible = false;
      MountainClient.sendNotification("disposeStatusBarItem", {
        itemId: ItemId
      }).catch(() => {
      });
    },
    accessibilityInformation: void 0
  });
}), "CreateStatusBarItem");

// Source/TypeConverter/Main/View/Column.ts
var { ViewColumn: VSCodeViewColumn } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
var ActiveEditorGroup = -1;
var SideGroup = -2;
var FromAPI = /* @__PURE__ */ __name((ViewColumn) => {
  if (typeof ViewColumn !== "number") {
    return void 0;
  }
  switch (ViewColumn) {
    case VSCodeViewColumn.Active:
      return ActiveEditorGroup;
    case VSCodeViewColumn.Beside:
      return SideGroup;
    default:
      if (ViewColumn >= VSCodeViewColumn.One) {
        return ViewColumn - 1;
      }
  }
  return void 0;
}, "FromAPI");

// Source/Services/Window/Text/Document.ts
import { Effect as Effect10 } from "effect";
var ShowTextDocument = /* @__PURE__ */ __name((GRPCClient, Logger3, Workspace_, DocumentOrUri, ColumnOrOptions, PreserveFocus) => Effect10.gen(function* () {
  const Uri = "uri" in DocumentOrUri ? DocumentOrUri.uri : DocumentOrUri;
  yield* Logger3.Info(
    `[WindowService] Showing text document: ${Uri.toString()}` + (ColumnOrOptions ? ` with options` : "")
  );
  let ViewColumnDTO;
  let PreserveFocusValue = PreserveFocus ?? false;
  let Selection = void 0;
  let Preview;
  if (typeof ColumnOrOptions === "number") {
    ViewColumnDTO = FromAPI(ColumnOrOptions);
  } else if (ColumnOrOptions) {
    const Options = ColumnOrOptions;
    ViewColumnDTO = FromAPI(Options.viewColumn);
    PreserveFocusValue = Options.preserveFocus ?? false;
    Preview = Options.preview;
    if (Options.selection) {
      Selection = Options.selection;
    }
  }
  yield* GRPCClient.showTextDocument(Uri.toString(), {
    viewColumn: ViewColumnDTO ? ViewColumnDTO + 2 : void 0,
    preserveFocus: PreserveFocusValue === true,
    preview: Preview === true,
    selection: Selection ? {
      line: Selection.start.line,
      character: Selection.start.character
    } : void 0
  });
  const EditorId = "editor-" + Uri.toString().slice(-8);
  yield* Logger3.Debug(
    `[WindowService] Showed text document with ID: ${EditorId}`
  );
  const Editor = Workspace_.visibleTextEditors.find(
    (E) => E.id === EditorId
  );
  if (!Editor) {
    return yield* Effect10.fail(
      new Error(
        `[WindowService] Could not find text editor with ID ${EditorId} after Mountain confirmation`
      )
    );
  }
  return Editor;
}), "ShowTextDocument");
var ShowInformationMessage = /* @__PURE__ */ __name((GRPCClient, Logger3, Message, ...Items) => Effect10.gen(function* () {
  yield* Logger3.Debug(
    `[WindowService] Showing information message: ${Message}`
  );
  const InfoResponse = yield* Effect10.tryPromise({
    try: /* @__PURE__ */ __name(() => GRPCClient.sendRequest("Window.ShowMessage", [
      {
        message: Message,
        level: "info",
        items: Items.map((I) => ({ title: I })),
        options: {}
      }
    ]), "try"),
    catch: /* @__PURE__ */ __name(() => null, "catch")
  });
  const InfoSelected = typeof InfoResponse === "string" ? InfoResponse : InfoResponse?.title ?? null;
  return InfoSelected ? Items.find((I) => I === InfoSelected) ?? InfoSelected : void 0;
}), "ShowInformationMessage");
var ShowWarningMessage = /* @__PURE__ */ __name((GRPCClient, Logger3, Message, ...Items) => Effect10.gen(function* () {
  yield* Logger3.Debug(
    `[WindowService] Showing warning message: ${Message}`
  );
  const WarnResponse = yield* Effect10.tryPromise({
    try: /* @__PURE__ */ __name(() => GRPCClient.sendRequest("Window.ShowMessage", [
      {
        message: Message,
        level: "warn",
        items: Items.map((I) => ({ title: I })),
        options: {}
      }
    ]), "try"),
    catch: /* @__PURE__ */ __name(() => null, "catch")
  });
  const WarnSelected = typeof WarnResponse === "string" ? WarnResponse : WarnResponse?.title ?? null;
  return WarnSelected ? Items.find((I) => I === WarnSelected) ?? WarnSelected : void 0;
}), "ShowWarningMessage");
var ShowErrorMessage = /* @__PURE__ */ __name((GRPCClient, Logger3, Message, ...Items) => Effect10.gen(function* () {
  yield* Logger3.Debug(
    `[WindowService] Showing error message: ${Message}`
  );
  const ErrorResponse = yield* Effect10.tryPromise({
    try: /* @__PURE__ */ __name(() => GRPCClient.sendRequest("Window.ShowMessage", [
      {
        message: Message,
        level: "error",
        items: Items.map((I) => ({ title: I })),
        options: {}
      }
    ]), "try"),
    catch: /* @__PURE__ */ __name(() => null, "catch")
  });
  const ErrorSelected = typeof ErrorResponse === "string" ? ErrorResponse : ErrorResponse?.title ?? null;
  return ErrorSelected ? Items.find(
    (I) => (typeof I === "string" ? I : I.title) === ErrorSelected
  ) ?? void 0 : void 0;
}), "ShowErrorMessage");

// Source/Platform/VSCode/Type.ts
var Type_exports = {};
__export(Type_exports, {
  CancellationToken: () => CancellationToken,
  CancellationTokenSource: () => CancellationTokenSource,
  URI: () => URI
});
__reExport(Type_exports, extHostTypes_star);
import * as extHostTypes_star from "@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
import {
  CancellationToken,
  CancellationTokenSource
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";

// Source/TypeConverter/Main/URI.ts
var FromAPI2 = /* @__PURE__ */ __name((TheURI) => TheURI.toJSON(), "FromAPI");
var ToAPI = /* @__PURE__ */ __name((DTO) => URI.revive(DTO), "ToAPI");

// Source/TypeConverter/Webview/Convert/Show/Option/To/DTO.ts
var ConvertShowOptionToDTO = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  const DTO = {
    preserveFocus: PreserveFocus
  };
  const ViewColumnValue = FromAPI(ViewColumn);
  if (ViewColumnValue !== void 0) {
    DTO.viewColumn = ViewColumnValue;
  }
  return DTO;
}, "ConvertShowOptionToDTO");

// Source/TypeConverter/Webview/Convert/Content/Option/To/DTO.ts
var ConvertContentOptionToDTO = /* @__PURE__ */ __name((ExtensionDescription, Options) => {
  return {
    enableCommandUris: Options.enableCommandUris,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    localResourceRoots: Options.localResourceRoots ?? [
      ExtensionDescription.extensionLocation
    ],
    portMapping: Options.portMapping
  };
}, "ConvertContentOptionToDTO");

// Source/WebviewPanel/Webview/Implementation.ts
import { Schemas } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/network.js";
import { Effect as Effect11 } from "effect";
var WebviewImplementation = class {
  constructor(Handle, IPCService, Extension, InitialOptions) {
    this.Handle = Handle;
    this.IPCService = IPCService;
    this.Extension = Extension;
    this._options = InitialOptions;
    this.onDidReceiveMessage = this.OnDidReceiveMessageEmitter.event;
  }
  Handle;
  IPCService;
  Extension;
  static {
    __name(this, "WebviewImplementation");
  }
  IsDisposed = false;
  _html = "";
  _options;
  OnDidReceiveMessageEmitter = CreateEventStream();
  onDidReceiveMessage;
  get html() {
    return this._html;
  }
  set html(Value) {
    if (this.IsDisposed || this._html === Value) return;
    this._html = Value;
    const UpdateEffect = this.IPCService.SendNotification(
      "$setWebviewHtml",
      [this.Handle, Value]
    );
    Effect11.runFork(UpdateEffect);
  }
  get options() {
    return this._options;
  }
  set options(NewOptions) {
    if (this.IsDisposed) return;
    this._options = NewOptions;
    const OptionsDTO = ConvertContentOptionToDTO(
      this.Extension,
      NewOptions
    );
    const UpdateEffect = this.IPCService.SendNotification(
      "$setWebviewOptions",
      [this.Handle, OptionsDTO]
    );
    Effect11.runFork(UpdateEffect);
  }
  get cspSource() {
    return "vscode-file: vscode-resource: vscode-webview-resource: https: *";
  }
  postMessage(Message) {
    if (this.IsDisposed) return Promise.resolve(false);
    const PostEffect = this.IPCService.SendRequest(
      "$postMessageToWebview",
      [this.Handle, Message]
    ).pipe(Effect11.catchAll(() => Effect11.succeed(false)));
    return Effect11.runPromise(PostEffect);
  }
  asWebviewUri(LocalResource) {
    const Authority = this.Extension.identifier.value.toLowerCase();
    return LocalResource.with({
      scheme: Schemas.vscodeFileResource,
      authority: Authority
    });
  }
  fireDidReceiveMessage(Message) {
    if (!this.IsDisposed) {
      Effect11.runFork(this.OnDidReceiveMessageEmitter.Fire(Message));
    }
  }
  dispose() {
    if (!this.IsDisposed) {
      this.IsDisposed = true;
      this.OnDidReceiveMessageEmitter.Shutdown();
    }
  }
};

// Source/WebviewPanel/Webview/Panel/Implementation.ts
import { Effect as Effect12 } from "effect";
var WebviewPanelImplementation = class {
  constructor(Handle, IPC, Extension, OnDidDisposeCallback, InitialViewType, InitialTitle, InitialOptions, InitialViewColumn) {
    this.Handle = Handle;
    this.IPC = IPC;
    this.OnDidDisposeCallback = OnDidDisposeCallback;
    this.viewType = InitialViewType;
    this.options = InitialOptions;
    this.webview = new WebviewImplementation(
      Handle,
      IPC,
      Extension,
      InitialOptions
    );
    this._title = InitialTitle;
    this._viewColumn = InitialViewColumn;
    this._active = true;
    this._visible = true;
    this._iconPath = void 0;
    this.onDidDispose = this.OnDidDisposeEmitter.event;
    this.onDidChangeViewState = this.OnDidChangeViewStateEmitter.event;
  }
  Handle;
  IPC;
  OnDidDisposeCallback;
  static {
    __name(this, "WebviewPanelImplementation");
  }
  IsDisposed = false;
  _title;
  // FIX: The error indicates the interface expects a non-optional property.
  // We will manage an internal `undefined` state but the public property will conform.
  _iconPath;
  _active;
  _visible;
  _viewColumn;
  OnDidDisposeEmitter = CreateEventStream();
  onDidDispose;
  OnDidChangeViewStateEmitter = CreateEventStream();
  onDidChangeViewState;
  webview;
  viewType;
  options;
  get viewColumn() {
    return this._viewColumn;
  }
  get active() {
    return this._active;
  }
  get visible() {
    return this._visible;
  }
  get title() {
    return this._title;
  }
  set title(Value) {
    if (this.IsDisposed || this._title === Value) return;
    this._title = Value;
    Effect12.runFork(
      this.IPC.SendNotification("$setWebviewTitle", [this.Handle, Value])
    );
  }
  // FIX: The public property must conform to the interface, even if the
  // internal state can be undefined. We will cast this in the getter/setter.
  get iconPath() {
    return this._iconPath;
  }
  set iconPath(Value) {
    const internalValue = Value;
    if (this.IsDisposed || this._iconPath === internalValue) return;
    this._iconPath = internalValue;
    const IconPathDTO = internalValue ? "light" in internalValue && "dark" in internalValue ? {
      light: FromAPI2(internalValue.light),
      dark: FromAPI2(internalValue.dark)
    } : {
      light: FromAPI2(internalValue),
      dark: FromAPI2(internalValue)
    } : void 0;
    Effect12.runFork(
      this.IPC.SendNotification("$setWebviewIconPath", [
        this.Handle,
        IconPathDTO
      ])
    );
  }
  reveal(ViewColumn, PreserveFocus) {
    if (this.IsDisposed) return;
    const ViewColumnDTO = ViewColumn ? ConvertShowOptionToDTO(ViewColumn, PreserveFocus ?? false) : void 0;
    Effect12.runFork(
      this.IPC.SendNotification("$revealWebviewPanel", [
        this.Handle,
        ViewColumnDTO,
        PreserveFocus
      ])
    );
  }
  dispose() {
    if (this.IsDisposed) {
      return;
    }
    this.IsDisposed = true;
    this.OnDidDisposeEmitter.Fire();
    this.OnDidDisposeCallback();
    this.webview.dispose();
    Effect12.runFork(
      this.IPC.SendNotification("$disposeWebview", [this.Handle])
    );
  }
  fireDidReceiveMessage(Message) {
    this.webview.fireDidReceiveMessage(Message);
  }
  updateViewState(NewState) {
    if (this.IsDisposed) return;
    const Changed = this._active !== NewState.active || this._visible !== NewState.visible || this._viewColumn !== NewState.viewColumn;
    this._active = NewState.active;
    this._visible = NewState.visible;
    this._viewColumn = NewState.viewColumn;
    if (Changed) {
      this.OnDidChangeViewStateEmitter.Fire({
        webviewPanel: this
      });
    }
  }
};

// Source/Services/Window/Webview/Panel.ts
import { Effect as Effect13 } from "effect";
var CreateWebviewPanel = /* @__PURE__ */ __name((MountainClient, GRPCClient, Logger3, ViewType, Title, ShowOptions, Options) => Effect13.gen(function* () {
  const PanelId = `webview-${crypto.randomUUID()}`;
  yield* Logger3.Info(
    `[WindowService] Creating webview panel: ${ViewType} - ${Title} (${PanelId})`
  );
  const ViewColumn = typeof ShowOptions === "number" ? ShowOptions : ShowOptions.viewColumn;
  const PreserveFocus = typeof ShowOptions === "object" ? ShowOptions.preserveFocus ?? false : false;
  const PanelOptionsDTO = Options ? {
    enableFindWidget: Options.enableFindWidget,
    enableScripts: Options.enableScripts,
    enableForms: Options.enableForms,
    enableCommandUris: Options.enableCommandUris,
    portMapping: Options.portMapping,
    localResourceRoots: Options.localResourceRoots,
    retainContextWhenHidden: Options.retainContextWhenHidden
  } : void 0;
  const ViewColumnDTO = FromAPI(ViewColumn);
  yield* GRPCClient.createWebviewPanel({
    viewType: ViewType,
    title: Title ?? "",
    iconPath: void 0,
    viewColumn: ViewColumn ? ViewColumn - 2 : void 0,
    preserveFocus: PreserveFocus ?? true,
    enableFindWidget: Options?.enableFindWidget ?? true,
    retainContextWhenHidden: Options?.retainContextWhenHidden ?? false,
    localResourceRoots: Options?.localResourceRoots?.map(
      (Uri) => Uri.toString()
    )
  });
  const IPCProxy = {
    SendNotification: /* @__PURE__ */ __name((Method, Params) => Effect13.gen(function* () {
      yield* Logger3.Debug(
        `[WindowService] Webview notification: ${Method}`
      );
      MountainClient.sendNotification("webview.postMessage", {
        panelId: PanelId,
        method: Method,
        params: Params
      }).catch(() => {
      });
    }), "SendNotification"),
    SendRequest: /* @__PURE__ */ __name((_Method, _Params) => Effect13.gen(function* () {
      return void 0;
    }), "SendRequest")
  };
  const ExtensionDescription = {
    identifier: { value: "extension-placeholder" },
    extensionLocation: { scheme: "file", path: "/tmp/extension" }
  };
  const WebviewPanel = new WebviewPanelImplementation(
    PanelId,
    IPCProxy,
    ExtensionDescription,
    () => {
      MountainClient.sendNotification("webview.dispose", {
        panelId: PanelId
      }).catch(() => {
      });
    },
    ViewType,
    Title,
    PanelOptionsDTO ?? {},
    ViewColumn
  );
  return yield* Effect13.succeed(WebviewPanel);
}), "CreateWebviewPanel");

// Source/Services/Window/Index.ts
import { Context as Context3, Effect as Effect14, Ref as Ref2 } from "effect";
var WindowService = class extends Effect14.Service()(
  "Service/Window",
  {
    effect: Effect14.gen(function* () {
      const MountainClient = yield* IMountainClientService;
      const Workspace_ = yield* Context3.Tag("Service/Workspace");
      const Logger_ = yield* Context3.Tag("Service/Logger");
      const MountainGRPC = yield* MountainGRPCClientService;
      const WindowStateRef = yield* Ref2.make({
        focused: true,
        active: true
      });
      const OnDidChangeWindowStateStream = CreateEventStream();
      const AcceptWindowStateChange = /* @__PURE__ */ __name((State) => Effect14.gen(function* () {
        const CurrentState = yield* Ref2.get(WindowStateRef);
        if (CurrentState.focused !== State.focused || CurrentState.active !== State.active) {
          yield* Ref2.set(WindowStateRef, State);
          yield* Logger_.Debug(
            `[WindowService] Window state changed: focused=${State.focused}, active=${State.active}`
          );
          yield* OnDidChangeWindowStateStream.Fire(State);
        }
      }), "AcceptWindowStateChange");
      const ServiceImplementation = {
        get state() {
          return Effect14.runSync(Ref2.get(WindowStateRef));
        },
        get activeTextEditor() {
          return Workspace_.activeTextEditor;
        },
        get visibleTextEditors() {
          return Workspace_.visibleTextEditors;
        },
        get onDidChangeWindowState() {
          return OnDidChangeWindowStateStream.event;
        },
        ShowTextDocument: /* @__PURE__ */ __name((DocumentOrUri, ColumnOrOptions, PreserveFocus) => ShowTextDocument(
          MountainGRPC,
          Logger_,
          Workspace_,
          DocumentOrUri,
          ColumnOrOptions,
          PreserveFocus
        ), "ShowTextDocument"),
        ShowInformationMessage: /* @__PURE__ */ __name((Message, ...Items) => ShowInformationMessage(
          MountainClient,
          Logger_,
          Message,
          ...Items
        ), "ShowInformationMessage"),
        ShowWarningMessage: /* @__PURE__ */ __name((Message, ...Items) => ShowWarningMessage(
          MountainClient,
          Logger_,
          Message,
          ...Items
        ), "ShowWarningMessage"),
        ShowErrorMessage: /* @__PURE__ */ __name((Message, ...Items) => ShowErrorMessage(
          MountainClient,
          Logger_,
          Message,
          ...Items
        ), "ShowErrorMessage"),
        ShowQuickPick: /* @__PURE__ */ __name((Items, Options) => ShowQuickPick(
          MountainClient,
          Logger_,
          Items,
          Options
        ), "ShowQuickPick"),
        ShowInputBox: /* @__PURE__ */ __name((Options) => ShowInputBox(MountainClient, Logger_, Options), "ShowInputBox"),
        ShowOpenDialog: /* @__PURE__ */ __name((Options) => ShowOpenDialog(MountainClient, Logger_, Options), "ShowOpenDialog"),
        ShowSaveDialog: /* @__PURE__ */ __name((Options) => ShowSaveDialog(MountainClient, Logger_, Options), "ShowSaveDialog"),
        WithProgress: /* @__PURE__ */ __name((Options, Task) => WithProgress(MountainClient, Logger_, Options, Task), "WithProgress"),
        CreateStatusBarItem: /* @__PURE__ */ __name((Id, Alignment, Priority) => CreateStatusBarItem(
          MountainClient,
          MountainGRPC,
          Logger_,
          Id,
          Alignment,
          Priority
        ), "CreateStatusBarItem"),
        CreateOutputChannel: /* @__PURE__ */ __name((Name) => CreateOutputChannel(MountainClient, Logger_, Name), "CreateOutputChannel"),
        CreateWebviewPanel: /* @__PURE__ */ __name((ViewType, Title, ShowOptions, Options) => CreateWebviewPanel(
          MountainClient,
          MountainGRPC,
          Logger_,
          ViewType,
          Title,
          ShowOptions,
          Options
        ), "CreateWebviewPanel")
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "WindowService");
  }
};
var Index_default = WindowService;
export {
  WindowService,
  Index_default as default
};
//# sourceMappingURL=Window.js.map
