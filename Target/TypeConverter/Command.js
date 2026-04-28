var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../Output/Target/Microsoft/VSCode/vs/base/common/uuid.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
function isUUID(value) {
  return _UUIDPattern.test(value);
}
__name(isUUID, "isUUID");
function prefixedUuid(namespace) {
  return `${namespace}-${generateUuid()}`;
}
__name(prefixedUuid, "prefixedUuid");
var _UUIDPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
export {
  APICommand,
  APICommandArgument,
  APICommandResult,
  Command
};
//# sourceMappingURL=Command.js.map
