var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { generateUuid } from "vs/base/common/uuid.js";
class APICommandArgument {
  constructor(Name, Description, Validate, Convert) {
    this.Name = Name;
    this.Description = Description;
    this.Validate = Validate;
    this.Convert = Convert;
  }
  static {
    __name(this, "APICommandArgument");
  }
}
class APICommandResult {
  constructor(Name, Convert) {
    this.Name = Name;
    this.Convert = Convert;
  }
  static {
    __name(this, "APICommandResult");
  }
}
class APICommand {
  constructor(Id, InternalId, Description, Arguments, Result) {
    this.Id = Id;
    this.InternalId = InternalId;
    this.Description = Description;
    this.Arguments = Arguments;
    this.Result = Result;
  }
  static {
    __name(this, "APICommand");
  }
}
class Command {
  constructor(RegisterCommand, ExecuteCommand, LookupAPICommand) {
    this.RegisterCommand = RegisterCommand;
    this.ExecuteCommand = ExecuteCommand;
    this.LookupAPICommand = LookupAPICommand;
    this.DelegatingCommandId = `_cocoon.delegate.${generateUuid()}`;
    this.RegisterCommand(
      this.DelegatingCommandId,
      this.ExecuteDelegatedCommand.bind(this),
      this
    );
  }
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
      return {
        id: APICommandValue.InternalId,
        title: Command2.title,
        arguments: ConvertedArgumentArray
      };
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
    return {
      id: Command2.command,
      title: Command2.title,
      arguments: Command2.arguments
    };
  }
  FromInternal(CommandDTO) {
    if (!CommandDTO) return void 0;
    return {
      command: CommandDTO.id,
      title: CommandDTO.title,
      tooltip: CommandDTO.tooltip,
      arguments: CommandDTO.arguments
    };
  }
}
export {
  APICommand,
  APICommandArgument,
  APICommandResult,
  Command
};
//# sourceMappingURL=Command.js.map
