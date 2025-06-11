var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { generateUuid } from "vs/base/common/uuid.js";
import { Commands as CommandsService } from "../../Service/Commands/mod.js";
class Definition {
  constructor(Commands, LookupApiCommand) {
    this.Commands = Commands;
    this.LookupApiCommand = LookupApiCommand;
    this.DelegatingCommandId = `_cocoon.delegate.${generateUuid()}`;
    this.Commands.RegisterCommand(
      this.DelegatingCommandId,
      this.executeDelegatedCommand,
      this
    );
  }
  static {
    __name(this, "Definition");
  }
  DelegatingCommandId;
  DelegatedCommands = /* @__PURE__ */ new Map();
  executeDelegatedCommand(Id, ...Args) {
    const command = this.DelegatedCommands.get(Id);
    if (!command) {
      throw new Error(`Unknown delegated command: ${Id}`);
    }
    return this.Commands.ExecuteCommand(
      command.command,
      ...command.arguments ?? []
    );
  }
  ToInternal(command, disposables) {
    if (!command) {
      return void 0;
    }
    const ApiCommand = this.LookupApiCommand(command.command);
    if (ApiCommand) {
      const ConvertedArgs = command.arguments?.map(
        (arg, i) => ApiCommand.Argument[i].Convert(arg)
      ) ?? [];
      return {
        $ident: void 0,
        id: ApiCommand.InternalId,
        title: command.title,
        tooltip: command.tooltip,
        arguments: ConvertedArgs
      };
    }
    if (Array.isArray(command.arguments) && command.arguments.some((arg) => typeof arg === "function")) {
      const Id = generateUuid();
      this.DelegatedCommands.set(Id, command);
      disposables.push({
        dispose: /* @__PURE__ */ __name(() => this.DelegatedCommands.delete(Id), "dispose")
      });
      return {
        $ident: void 0,
        id: this.DelegatingCommandId,
        title: command.title,
        tooltip: command.tooltip,
        arguments: [Id]
      };
    }
    return {
      $ident: void 0,
      id: command.command,
      title: command.title,
      tooltip: command.tooltip,
      arguments: command.arguments
    };
  }
  FromInternal(dto) {
    if (!dto) {
      return void 0;
    }
    return {
      command: dto.id,
      title: dto.title,
      tooltip: dto.tooltip,
      arguments: dto.arguments
    };
  }
}
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
