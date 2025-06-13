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

		// Register the central command that handles the execution of all delegated commands.
		this.CommandService.RegisterCommand(
			this.DelegatingCommandID,
			this.ExecuteDelegatedCommand,
			this,
		);
	}

	private ExecuteDelegatedCommand(ID: string, ...Arguments: any[]): any {
		const command = this.DelegatedCommands.get(ID);
		if (!command) {
			throw new Error(`Unknown delegated command: ${ID}`);
		}
		return this.CommandService.ExecuteCommand(
			command.command,
			...(command.arguments ?? []),
		);
	}

	public ToInternal(
		Command: VSCode.Command,
		Disposables: IDisposable[],
	): ICommand {
		if (!Command) {
			return undefined;
		}

		// If the command is a built-in API command, we validate and convert its arguments.
		const APICommand = this.LookupAPICommand(Command.command);
		if (APICommand) {
			const ConvertedArguments =
				Command.arguments?.map((argument, i) =>
					APICommand.Arguments[i].Convert(argument),
				) ?? [];
			return {
				id: APICommand.InternalID,
				title: Command.title,
				tooltip: Command.tooltip,
				arguments: ConvertedArguments,
			};
		}

		// For other commands, we check if any argument is complex (e.g., a function).
		// If so, we use the delegation pattern to proxy its execution back to this host.
		if (
			Array.isArray(Command.arguments) &&
			Command.arguments.some((argument) => typeof argument === "function")
		) {
			const ID = generateUuid();
			this.DelegatedCommands.set(ID, Command);
			Disposables.push({
				dispose: () => this.DelegatedCommands.delete(ID),
			});
			return {
				id: this.DelegatingCommandID,
				title: Command.title,
				tooltip: Command.tooltip,
				arguments: [ID],
			};
		}

		// Otherwise, if arguments are simple, we serialize it directly.
		return {
			id: Command.command,
			title: Command.title,
			tooltip: Command.tooltip,
			arguments: Command.arguments,
		};
	}

	public FromInternal(CommandDTO: ICommand): VSCode.Command | undefined {
		if (!CommandDTO) {
			return undefined;
		}
		return {
			command: CommandDTO.id,
			title:
				typeof CommandDTO.title === "string"
					? CommandDTO.title
					: CommandDTO.title.value,
			tooltip: CommandDTO.tooltip,
			arguments: CommandDTO.arguments,
		};
	}
}
