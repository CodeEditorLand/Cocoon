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
			return undefined as any; // To satisfy ICommand which might not be nullable
		}

		const APICommand = this.LookupAPICommand(Command.command);
		if (APICommand) {
			const ConvertedArguments =
				Command.arguments?.map((argument, i) =>
					APICommand.Arguments[i].Convert(argument),
				) ?? [];
			return {
				id: APICommand.InternalID,
				arguments: ConvertedArguments,
				id: "",
				handler: undefined,
			};
		}

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
				arguments: [ID],
			};
		}

		return {
			arguments: Command.arguments,
			id: Command.command,
			// Type 'never[]' is not assignable to type 'ICommandHandler'.
			// Type 'never[]' provides no match for the signature '(accessor: ServicesAccessor, ...args: any[]): void'.ts(2322)
			// @ts-expect-error for now
			handler: [],
		};
	}

	public FromInternal(CommandDTO: ICommand): VSCode.Command | undefined {
		if (!CommandDTO) {
			return undefined;
		}
		// The DTO only has `id` and `arguments`. Title/tooltip are part of the UI representation,
		// not the core command execution payload. We construct a minimal command object.
		return {
			command: CommandDTO.id,
			title: CommandDTO["title"] ?? "", // title is not part of the DTO
			tooltip: CommandDTO["tooltip"] ?? "", // tooltip is not part of the DTO
			arguments: CommandDTO["arguments"] ?? [], // arguments is not part of the DTO
		};
	}
}
