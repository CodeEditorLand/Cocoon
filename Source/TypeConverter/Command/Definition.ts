/**
 * @module Definition (Command/TypeConverter)
 * @description The class implementation of the CommandConverter.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import { generateUuid } from "vs/base/common/uuid.js";
import type * as VSCode from "vscode";

import { Command as CommandService } from "../../Service/Command.js";
import type { Interface } from "./Service.js";
import type { APICommand } from "./Type.js";

export class Definition implements Interface {
	private readonly DelegatingCommandId: string;
	private readonly DelegatedCommand = new Map<string, VSCode.Command>();

	constructor(
		private readonly Command: CommandService.Interface,
		private readonly LookupAPICommand: (
			Id: string,
		) => APICommand | undefined,
	) {
		this.DelegatingCommandId = `_cocoon.delegate.${generateUuid()}`;

		// Register the command that handles the delegated execution.
		this.Command.RegisterCommand(
			this.DelegatingCommandId,
			this.executeDelegatedCommand,
			this,
		);
	}

	private executeDelegatedCommand(Id: string, ...Args: any[]): any {
		const command = this.DelegatedCommand.get(Id);
		if (!command) {
			throw new Error(`Unknown delegated command: ${Id}`);
		}
		return this.Command.ExecuteCommand(
			command.command,
			...(command.arguments ?? []),
		);
	}

	public ToInternal(
		command: VSCode.Command,
		disposables: IDisposable[],
	): any {
		if (!command) {
			return undefined;
		}

		// If the command is a built-in API command, we validate and convert its arguments.
		const APICommand = this.LookupAPICommand(command.command);
		if (APICommand) {
			const ConvertedArgs =
				command.arguments?.map((arg, i) =>
					APICommand.Argument[i].Convert(arg),
				) ?? [];
			return {
				$ident: undefined,
				id: APICommand.InternalId,
				title: command.title,
				tooltip: command.tooltip,
				arguments: ConvertedArgs,
			};
		}

		// For other commands, we check if any argument is complex (e.g., a function).
		// If so, we use the delegation pattern.
		if (
			Array.isArray(command.arguments) &&
			command.arguments.some((arg) => typeof arg === "function")
		) {
			const Id = generateUuid();
			this.DelegatedCommand.set(Id, command);
			disposables.push({
				dispose: () => this.DelegatedCommand.delete(Id),
			});
			return {
				$ident: undefined,
				id: this.DelegatingCommandId,
				title: command.title,
				tooltip: command.tooltip,
				arguments: [Id],
			};
		}

		// Otherwise, we serialize it directly.
		return {
			$ident: undefined,
			id: command.command,
			title: command.title,
			tooltip: command.tooltip,
			arguments: command.arguments,
		};
	}

	public FromInternal(dto: any): VSCode.Command | undefined {
		if (!dto) {
			return undefined;
		}
		return {
			command: dto.id,
			title: dto.title,
			tooltip: dto.tooltip,
			arguments: dto.arguments,
		};
	}
}
