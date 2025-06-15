var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { generateUuid } from "vs/base/common/uuid.js";
class Definition_default {
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
    __name(this, "default");
  }
  DelegatingCommandID;
  DelegatedCommands = /* @__PURE__ */ new Map();
  ExecuteDelegatedCommand(ID, ...ArgumentArray) {
    const Command = this.DelegatedCommands.get(ID);
    if (!Command) {
      throw new Error(`Unknown delegated command: ${ID}`);
    }
    return this.CommandService.ExecuteCommand(
      Command.command,
      ...[...Command.arguments ?? [], ...ArgumentArray]
    );
  }
  ToInternal(Command, DisposableArray) {
    if (!Command) {
      return void 0;
    }
    const APICommand = this.LookupAPICommand(Command.command);
    if (APICommand) {
      const ConvertedArgumentArray = Command.arguments?.map(
        (Argument, i) => APICommand.Arguments[i].Convert(Argument)
      ) ?? [];
      return {
        id: APICommand.InternalID,
        title: APICommand.ID,
        arguments: ConvertedArgumentArray
      };
    }
    if (Array.isArray(Command.arguments) && Command.arguments.some((Argument) => typeof Argument === "function")) {
      const ID = generateUuid();
      this.DelegatedCommands.set(ID, Command);
      DisposableArray.push({
        dispose: /* @__PURE__ */ __name(() => this.DelegatedCommands.delete(ID), "dispose")
      });
      return {
        id: this.DelegatingCommandID,
        title: Command.title,
        arguments: [ID, ...Command.arguments ?? []]
      };
    }
    return {
      id: Command.command,
      title: Command.title,
      arguments: Command.arguments
    };
  }
  FromInternal(CommandDTO) {
    if (!CommandDTO) {
      return void 0;
    }
    return {
      command: CommandDTO.id,
      title: CommandDTO.title ?? "",
      tooltip: CommandDTO.tooltip ?? "",
      arguments: CommandDTO.arguments ?? []
    };
  }
}
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
