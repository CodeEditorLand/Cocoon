var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { generateUuid } from "vs/base/common/uuid.js";
class Definition {
  constructor(CommandService, LookupAPICommand) {
    this.CommandService = CommandService;
    this.LookupAPICommand = LookupAPICommand;
    this.DelegatingCommandID = `_cocoon.delegate.${generateUuid()}`;
    this.CommandService.RegisterCommand(
      this.DelegatingCommandID,
      this.ExecuteDelegatedCommand,
      this
    );
  }
  static {
    __name(this, "Definition");
  }
  DelegatingCommandID;
  DelegatedCommands = /* @__PURE__ */ new Map();
  ExecuteDelegatedCommand(ID, ...Arguments) {
    const command = this.DelegatedCommands.get(ID);
    if (!command) {
      throw new Error(`Unknown delegated command: ${ID}`);
    }
    return this.CommandService.ExecuteCommand(
      command.command,
      ...command.arguments ?? []
    );
  }
  ToInternal(Command, Disposables) {
    if (!Command) {
      return void 0;
    }
    const APICommand = this.LookupAPICommand(Command.command);
    if (APICommand) {
      const ConvertedArguments = Command.arguments?.map(
        (argument, i) => APICommand.Arguments[i].Convert(argument)
      ) ?? [];
      return {
        id: APICommand.InternalID,
        title: Command.title,
        tooltip: Command.tooltip,
        arguments: ConvertedArguments
      };
    }
    if (Array.isArray(Command.arguments) && Command.arguments.some((argument) => typeof argument === "function")) {
      const ID = generateUuid();
      this.DelegatedCommands.set(ID, Command);
      Disposables.push({
        dispose: /* @__PURE__ */ __name(() => this.DelegatedCommands.delete(ID), "dispose")
      });
      return {
        id: this.DelegatingCommandID,
        title: Command.title,
        tooltip: Command.tooltip,
        arguments: [ID]
      };
    }
    return {
      id: Command.command,
      title: Command.title,
      tooltip: Command.tooltip,
      arguments: Command.arguments
    };
  }
  FromInternal(CommandDTO) {
    if (!CommandDTO) {
      return void 0;
    }
    return {
      command: CommandDTO.id,
      title: typeof CommandDTO.title === "string" ? CommandDTO.title : CommandDTO.title.value,
      tooltip: CommandDTO.tooltip,
      arguments: CommandDTO.arguments
    };
  }
}
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
