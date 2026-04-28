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

// ../Output/Target/Microsoft/VSCode/vs/base/common/uuid.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value) {
  return _UUIDPattern.test(value);
}
__name(isUUID, "isUUID");
__name2(isUUID, "isUUID");
var generateUuid = (function() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID.bind(crypto);
  }
  const _data = new Uint8Array(16);
  const _hex = [];
  for (let i = 0; i < 256; i++) {
    _hex.push(i.toString(16).padStart(2, "0"));
  }
  return /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function generateUuid2() {
    crypto.getRandomValues(_data);
    _data[6] = _data[6] & 15 | 64;
    _data[8] = _data[8] & 63 | 128;
    let i = 0;
    let result = "";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += "-";
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    result += _hex[_data[i++]];
    return result;
  }, "generateUuid2"), "generateUuid");
})();
function prefixedUuid(namespace) {
  return `${namespace}-${generateUuid()}`;
}
__name(prefixedUuid, "prefixedUuid");
__name2(prefixedUuid, "prefixedUuid");

// Source/TypeConverter/Command.ts
var APICommandArgument = class {
  constructor(Name, Description, Validate, Convert) {
    this.Name = Name;
    this.Description = Description;
    this.Validate = Validate;
    this.Convert = Convert;
  }
  Name;
  Description;
  Validate;
  Convert;
  static {
    __name(this, "APICommandArgument");
  }
};
var APICommandResult = class {
  constructor(Name, Convert) {
    this.Name = Name;
    this.Convert = Convert;
  }
  Name;
  Convert;
  static {
    __name(this, "APICommandResult");
  }
};
var APICommand = class {
  constructor(Id, InternalId, Description, Arguments, Result) {
    this.Id = Id;
    this.InternalId = InternalId;
    this.Description = Description;
    this.Arguments = Arguments;
    this.Result = Result;
  }
  Id;
  InternalId;
  Description;
  Arguments;
  Result;
  static {
    __name(this, "APICommand");
  }
};
var Command = class {
  constructor(RegisterCommand, ExecuteCommand, LookupAPICommand) {
    this.RegisterCommand = RegisterCommand;
    this.ExecuteCommand = ExecuteCommand;
    this.LookupAPICommand = LookupAPICommand;
    this.DelegatingCommandId = `_cocoon.delegate.${generateUuid()}`;
    this.RegisterCommand(
      false,
      // Not a global command
      this.DelegatingCommandId,
      this.ExecuteDelegatedCommand.bind(this),
      this
    );
  }
  RegisterCommand;
  ExecuteCommand;
  LookupAPICommand;
  static {
    __name(this, "Command");
  }
  DelegatingCommandId;
  DelegatedCommands = /* @__PURE__ */ new Map();
  ExecuteDelegatedCommand(Id, ...ArgumentArray) {
    const Command2 = this.DelegatedCommands.get(Id);
    if (!Command2) {
      throw new Error(`Unknown delegated command: ${Id}`);
    }
    return this.ExecuteCommand(
      Command2.command,
      ...[...Command2.arguments ?? [], ...ArgumentArray]
    );
  }
  ToInternal(Command2, DisposableArray) {
    if (!Command2) return void 0;
    const APICommandValue = this.LookupAPICommand(Command2.command);
    if (APICommandValue) {
      const ConvertedArgumentArray = Command2.arguments?.map(
        (Argument, i) => APICommandValue.Arguments[i].Convert(Argument)
      ) ?? [];
      const result2 = {
        id: APICommandValue.InternalId,
        title: Command2.title
      };
      if (ConvertedArgumentArray.length > 0) {
        result2.arguments = ConvertedArgumentArray;
      }
      return result2;
    }
    if (Array.isArray(Command2.arguments) && Command2.arguments.some((Argument) => typeof Argument === "function")) {
      const Id = generateUuid();
      this.DelegatedCommands.set(Id, Command2);
      DisposableArray.push({
        dispose: /* @__PURE__ */ __name(() => this.DelegatedCommands.delete(Id), "dispose")
      });
      return {
        id: this.DelegatingCommandId,
        title: Command2.title,
        arguments: [Id, ...Command2.arguments ?? []]
      };
    }
    const result = {
      id: Command2.command,
      title: Command2.title
    };
    if (Command2.tooltip) {
      result.tooltip = Command2.tooltip;
    }
    if (Command2.arguments) {
      result.arguments = Command2.arguments;
    }
    return result;
  }
  FromInternal(CommandDTO) {
    if (!CommandDTO) return void 0;
    const result = {
      command: CommandDTO.id,
      title: CommandDTO.title
    };
    if (CommandDTO.tooltip) {
      result.tooltip = CommandDTO.tooltip;
    }
    if (CommandDTO.arguments) {
      result.arguments = CommandDTO.arguments;
    }
    return result;
  }
};

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

// Source/Services/Command.ts
import { Context as Context3, Effect as Effect4, Ref as Ref2 } from "effect";
var CommandService = class extends Effect4.Service()(
  "Service/Command",
  {
    effect: Effect4.gen(function* () {
      yield* IMountainClientService;
      const Logger2 = yield* Context3.Tag("Service/Logger");
      const Window = yield* Context3.Tag("Service/Window");
      const CommandRegistry = yield* Ref2.make(
        /* @__PURE__ */ new Map()
      );
      void new Command(
        (_Global, Id, Callback, ThisArg) => {
          const Disposable = { dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") };
          Effect4.runSync(
            Ref2.update(
              CommandRegistry,
              (Registry2) => Registry2.set(Id, {
                Id,
                Callback,
                ThisArg,
                Extension: void 0,
                RegisteredAt: Date.now()
              })
            )
          );
          return Disposable;
        },
        (_Id, ..._Arguments) => {
          return Promise.resolve(void 0);
        },
        (_Id) => void 0
      );
      const ExecuteLocalCommand = /* @__PURE__ */ __name((Command2, Arguments) => Effect4.gen(function* () {
        const StartTime = Date.now();
        const {
          Callback,
          ThisArg,
          Extension: _Extension,
          Id
        } = Command2;
        yield* Logger2.Trace(
          `[CommandService] Executing local command '${Id}' with ${Arguments.length} arguments`
        );
        const Result = yield* Effect4.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(Callback.apply(ThisArg, Arguments)), "try"),
          catch: /* @__PURE__ */ __name((Cause) => {
            throw Cause;
          }, "catch")
        });
        const Duration = Date.now() - StartTime;
        yield* Logger2.Debug(
          `[CommandService] Command '${Id}' executed in ${Duration}ms`
        );
        return Result;
      }), "ExecuteLocalCommand");
      const ExecuteCommand = /* @__PURE__ */ __name((Id, ...Arguments) => Effect4.gen(function* () {
        const Registry2 = yield* Ref2.get(CommandRegistry);
        if (Registry2.has(Id)) {
          const Command2 = Registry2.get(Id);
          const Result = yield* ExecuteLocalCommand(
            Command2,
            Arguments
          );
          return Result;
        }
        yield* Logger2.Info(
          `[CommandService] Command '${Id}' not registered locally, executing via Mountain gRPC`
        );
        const mountainClient = yield* MountainGRPCClientService;
        const startTime = Date.now();
        try {
          const result = yield* mountainClient.executeCommand(
            Id,
            ...Arguments
          );
          this.trackCommandExecution(
            Id,
            "remote",
            Date.now() - startTime,
            true
          );
          return result;
        } catch (error) {
          this.trackCommandExecution(
            Id,
            "remote",
            Date.now() - startTime,
            false
          );
          yield* Logger2.Error(
            `[CommandService] Failed to execute remote command '${Id}'`,
            error
          );
          throw error;
        }
      }), "ExecuteCommand");
      const RegisterCommand = /* @__PURE__ */ __name((Id, Callback, ThisArg) => Effect4.gen(function* () {
        if (!Id || typeof Id !== "string") {
          yield* Logger2.Error(
            `[CommandService] Invalid command ID: ${Id}`
          );
          throw new Error(`Invalid command ID: ${Id}`);
        }
        const Metadata = {
          Id,
          Callback,
          ThisArg,
          Extension: void 0,
          RegisteredAt: Date.now()
        };
        yield* Ref2.update(
          CommandRegistry,
          (Registry2) => Registry2.set(Id, Metadata)
        );
        yield* Logger2.Info(
          `[CommandService] Command '${Id}' registered locally`
        );
        const mountainClient = yield* MountainGRPCClientService;
        const extensionId = this.getCallingExtension();
        try {
          yield* mountainClient.registerCommand(
            Id,
            extensionId,
            `Command: ${Id}`
          );
          yield* Logger2.Info(
            `[CommandService] Command '${Id}' registered with Mountain`
          );
        } catch (error) {
          yield* Logger2.Warn(
            `[CommandService] Failed to register command '${Id}' with Mountain:`,
            error
          );
        }
        return {
          dispose: /* @__PURE__ */ __name(() => {
            Effect4.runFork(
              Effect4.gen(function* () {
                yield* Ref2.update(
                  CommandRegistry,
                  (Registry2) => {
                    Registry2.delete(Id);
                    return Registry2;
                  }
                );
                yield* Logger2.Info(
                  `[CommandService] Command '${Id}' unregistered`
                );
              })
            );
          }, "dispose")
        };
      }), "RegisterCommand");
      const RegisterTextEditorCommand = /* @__PURE__ */ __name((Id, Callback, ThisArg) => Effect4.gen(function* () {
        const AdaptedCallback = /* @__PURE__ */ __name((...Args) => {
          const ActiveEditor = Window.activeTextEditor;
          if (!ActiveEditor) {
            Effect4.runSync(
              Logger2.Warn(
                `[CommandService] Cannot execute text editor command '${Id}' - no active text editor`
              )
            );
            return void 0;
          }
          return ActiveEditor.edit(
            (EditBuilder) => {
              Callback.apply(ThisArg, [
                ActiveEditor,
                EditBuilder,
                ...Args
              ]);
            }
          );
        }, "AdaptedCallback");
        return yield* RegisterCommand(Id, AdaptedCallback, ThisArg);
      }), "RegisterTextEditorCommand");
      const GetCommands = /* @__PURE__ */ __name((FilterInternal = false) => Effect4.gen(function* () {
        const Registry2 = yield* Ref2.get(CommandRegistry);
        const LocalCommandIds = Array.from(Registry2.keys());
        try {
          yield* MountainGRPCClientService;
          const RemoteCommands = [];
          yield* Logger2.Info(
            `[CommandService] Retrieved ${RemoteCommands.length} remote commands from Mountain`
          );
          const AllCommands = Array.from(
            /* @__PURE__ */ new Set([...LocalCommandIds, ...RemoteCommands])
          );
          if (FilterInternal) {
            return AllCommands.filter(
              (Id) => !Id.startsWith("_")
            );
          }
          return AllCommands;
        } catch (error) {
          yield* Logger2.Warn(
            `[CommandService] Error getting remote commands, using local only`,
            error
          );
          if (FilterInternal) {
            return LocalCommandIds.filter(
              (Id) => !Id.startsWith("_")
            );
          }
          return LocalCommandIds;
        }
      }), "GetCommands");
      const ServiceImplementation = {
        RegisterCommand,
        RegisterTextEditorCommand,
        ExecuteCommand,
        GetCommands
      };
      const Registry = yield* Ref2.get(CommandRegistry);
      yield* Logger2.Info(
        `[CommandService] CommandService initialized with ${Registry.size} registered commands`
      );
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "CommandService");
  }
};
export {
  CommandService
};
//# sourceMappingURL=Command.js.map
