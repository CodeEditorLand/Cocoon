/**
 * @module Definition (Command/TypeConverter)
 * @description The class implementation of the CommandConverter. It handles the
 * complex logic of marshalling commands, their arguments, and handling command
 * delegation for functions passed as arguments.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import { generateUuid } from "vs/base/common/uuid.js";
import type { ICommand } from "vs/platform/commands/common/commands.js";
import type * as VSCode from "vscode";

import type { Command as CommandService } from "../../Service/Command.js";
import type { Interface } from "./Service.js";
import type { APICommand } from "./Type.js";

export class Definition implements Interface {
	private readonly DelegatingCommandID: string;
	private readonly DelegatedCommands = new Map<string, VSCode.Command>();

	constructor(
		private readonly CommandService: CommandService.Interface,
		private readonly LookupAPICommand: (
			ID: string,
		) => APICommand | undefined,
	) {
		this.DelegatingCommandID = `_cocoon.delegate.${generateUuid()}`;

		this.CommandService.RegisterCommand(
			this.DelegatingCommandID,
			this.ExecuteDelegatedCommand,
			this,
		);
	}

	private ExecuteDelegatedCommand(ID: string, ...ArgumentArray: any[]): any {
		const Command = this.DelegatedCommands.get(ID);
		if (!Command) {
			throw new Error(`Unknown delegated command: ${ID}`);
		}
		return this.CommandService.ExecuteCommand(
			Command.command,
			...(Command.arguments ?? []),
		);
	}

	public ToInternal(
		Command: VSCode.Command,
		DisposableArray: IDisposable[],
	): ICommand {
		if (!Command) {
			return undefined as any;
		}

		const APICommand = this.LookupAPICommand(Command.command);
		if (APICommand) {
			const ConvertedArgumentArray =
				Command.arguments?.map((Argument, i) =>
					APICommand.Arguments[i].Convert(Argument),
				) ?? [];
			return {
				id: APICommand.InternalID,
				title: APICommand.ID,
				arguments: ConvertedArgumentArray,
			};
		}

		if (
			Array.isArray(Command.arguments) &&
			Command.arguments.some((Argument) => typeof Argument === "function")
		) {
			const ID = generateUuid();
			this.DelegatedCommands.set(ID, Command);
			DisposableArray.push({
				dispose: () => this.DelegatedCommands.delete(ID),
			});
			return {
				id: this.DelegatingCommandID,
				title: Command.title,
				arguments: [ID],
			};
		}

		return {
			id: Command.command,
			title: Command.title,
			arguments: Command.arguments,
		};
	}

	public FromInternal(CommandDTO: ICommand): VSCode.Command | undefined {
		if (!CommandDTO) {
			return undefined;
		}
		return {
			command: CommandDTO.id,
			title: CommandDTO.title ?? "",
			tooltip: (CommandDTO as any).tooltip ?? "",
			arguments: CommandDTO.arguments ?? [],
		};
	}
}
