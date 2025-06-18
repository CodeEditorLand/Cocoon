var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { generateUuid } from "vs/base/common/uuid.js";
class CommandConverterDefinition {
  constructor(RegisterCommand, ExecuteCommand, LookupAPICommand) {
    this.RegisterCommand = RegisterCommand;
    this.ExecuteCommand = ExecuteCommand;
    this.LookupAPICommand = LookupAPICommand;
    this.DelegatingCommandID = `_cocoon.delegate.${generateUuid()}`;
    this.RegisterCommand(
      this.DelegatingCommandID,
      this.ExecuteDelegatedCommand,
      this
    );
  }
  static {
    __name(this, "CommandConverterDefinition");
  }
  DelegatingCommandID;
  DelegatedCommands = /* @__PURE__ */ new Map();
  ExecuteDelegatedCommand(ID, ...ArgumentArray) {
    const Command = this.DelegatedCommands.get(ID);
    if (!Command) {
      throw new Error(`Unknown delegated command: ${ID}`);
    }
    return Effect.runPromise(
      this.ExecuteCommand(
        Command.command,
        ...[...Command.arguments ?? [], ...ArgumentArray]
      )
    );
  }
  ToInternal(Command, DisposableArray) {
    if (!Command) {
      return void 0;
    }
    const APICommandValue = this.LookupAPICommand(Command.command);
    if (APICommandValue) {
      const ConvertedArgumentArray = Command.arguments?.map(
        (Argument, i) => APICommandValue.Arguments[i].Convert(Argument)
      ) ?? [];
      return {
        id: APICommandValue.InternalID,
        title: Command.title,
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
      title: CommandDTO.title,
      tooltip: CommandDTO.tooltip,
      arguments: CommandDTO.arguments
    };
  }
}
export {
  CommandConverterDefinition as default
};
//# sourceMappingURL=Definition.js.map
