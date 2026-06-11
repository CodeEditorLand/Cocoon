var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

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

// ../Output/Target/Microsoft/VSCode/vs/base/common/uuid.js
var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value) {
  return _UUIDPattern.test(value);
}
__name(isUUID, "isUUID");
var generateUuid = (function() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID.bind(crypto);
  }
  const _data = new Uint8Array(16);
  const _hex = [];
  for (let i = 0; i < 256; i++) {
    _hex.push(i.toString(16).padStart(2, "0"));
  }
  return /* @__PURE__ */ __name(function generateUuid2() {
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
  }, "generateUuid");
})();
function prefixedUuid(namespace) {
  return `${namespace}-${generateUuid()}`;
}
__name(prefixedUuid, "prefixedUuid");

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

// Source/Services/Command.ts
import { Context, Effect as Effect2 } from "effect";
var CommandService = class extends Effect2.Service()(
  "Service/Command",
  {
    effect: Effect2.gen(function* () {
      const MountainClient = yield* IMountainClientService;
      const Logger = yield* Context.Tag("Service/Logger");
      const Window = yield* Context.Tag("Service/Window");
      const _commandRegistry = /* @__PURE__ */ new Map();
      const TrackCommandExecution = /* @__PURE__ */ __name((Id, Mode, DurationMs, Success) => {
        CocoonDevLog(
          "command-telemetry",
          `execute id=${Id} mode=${Mode} duration_ms=${DurationMs} ok=${Success}`
        );
      }, "TrackCommandExecution");
      void new Command(
        (_Global, Id, Callback, ThisArg) => {
          const Disposable = { dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") };
          _commandRegistry.set(Id, {
            Id,
            Callback,
            ThisArg,
            Extension: void 0,
            RegisteredAt: Date.now()
          });
          return Disposable;
        },
        (_Id, ..._Arguments) => {
          return Promise.resolve(void 0);
        },
        (_Id) => void 0
      );
      const ExecuteLocalCommand = /* @__PURE__ */ __name((Command2, Arguments) => Effect2.gen(function* () {
        const StartTime = Date.now();
        const {
          Callback,
          ThisArg,
          Extension: _Extension,
          Id
        } = Command2;
        yield* Logger.Trace(
          `[CommandService] Executing local command '${Id}' with ${Arguments.length} arguments`
        );
        const Result = yield* Effect2.tryPromise({
          try: /* @__PURE__ */ __name(() => Promise.resolve(Callback.apply(ThisArg, Arguments)), "try"),
          catch: /* @__PURE__ */ __name((Cause) => {
            TrackCommandExecution(
              Id,
              "local",
              Date.now() - StartTime,
              false
            );
            throw Cause;
          }, "catch")
        });
        const Duration = Date.now() - StartTime;
        TrackCommandExecution(Id, "local", Duration, true);
        yield* Logger.Debug(
          `[CommandService] Command '${Id}' executed in ${Duration}ms`
        );
        return Result;
      }), "ExecuteLocalCommand");
      const ExecuteCommand = /* @__PURE__ */ __name((Id, ...Arguments) => Effect2.gen(function* () {
        const Registry2 = _commandRegistry;
        if (Registry2.has(Id)) {
          const Command2 = Registry2.get(Id);
          const Result = yield* ExecuteLocalCommand(
            Command2,
            Arguments
          );
          return Result;
        }
        yield* Logger.Info(
          `[CommandService] Command '${Id}' not registered locally, executing via Mountain gRPC`
        );
        const startTime = Date.now();
        try {
          const result = yield* Effect2.tryPromise({
            try: /* @__PURE__ */ __name(() => MountainClient.sendRequest("Command.Execute", [
              Id,
              ...Arguments
            ]), "try"),
            catch: /* @__PURE__ */ __name((Cause) => Cause instanceof Error ? Cause : new Error(String(Cause)), "catch")
          });
          TrackCommandExecution(
            Id,
            "remote",
            Date.now() - startTime,
            true
          );
          return result;
        } catch (error) {
          TrackCommandExecution(
            Id,
            "remote",
            Date.now() - startTime,
            false
          );
          yield* Logger.Error(
            `[CommandService] Failed to execute remote command '${Id}'`,
            error
          );
          throw error;
        }
      }), "ExecuteCommand");
      const RegisterCommand = /* @__PURE__ */ __name((Id, Callback, ThisArg) => Effect2.gen(function* () {
        if (!Id || typeof Id !== "string") {
          yield* Logger.Error(
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
        _commandRegistry.set(Id, Metadata);
        yield* Logger.Info(
          `[CommandService] Command '${Id}' registered locally`
        );
        void MountainClient.sendNotification("registerCommand", {
          commandId: Id
        }).catch(() => {
        });
        return {
          dispose: /* @__PURE__ */ __name(() => {
            _commandRegistry.delete(Id);
            void MountainClient.sendNotification(
              "unregisterCommand",
              { commandId: Id }
            ).catch(() => {
            });
          }, "dispose")
        };
      }), "RegisterCommand");
      const RegisterTextEditorCommand = /* @__PURE__ */ __name((Id, Callback, ThisArg) => Effect2.gen(function* () {
        const AdaptedCallback = /* @__PURE__ */ __name((...Args) => {
          const ActiveEditor = Window.activeTextEditor;
          if (!ActiveEditor) {
            Logger.Warn(
              `[CommandService] Cannot execute text editor command '${Id}' - no active text editor`
            ).catch?.(() => {
            });
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
      const GetCommands = /* @__PURE__ */ __name((FilterInternal = false) => Effect2.gen(function* () {
        const Registry2 = _commandRegistry;
        const LocalCommandIds = Array.from(Registry2.keys());
        try {
          const Response = yield* Effect2.tryPromise({
            try: /* @__PURE__ */ __name(() => MountainClient.sendRequest("Command.GetAll", [
              FilterInternal
            ]), "try"),
            catch: /* @__PURE__ */ __name((Cause) => Cause instanceof Error ? Cause : new Error(String(Cause)), "catch")
          });
          const RemoteCommands = Array.isArray(Response) ? Response : [];
          yield* Logger.Info(
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
          yield* Logger.Warn(
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
      const Registry = _commandRegistry;
      yield* Logger.Info(
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
