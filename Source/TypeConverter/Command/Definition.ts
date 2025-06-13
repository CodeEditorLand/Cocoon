/**
 * @module Definition (Commands/TypeConverter)
 * @description The class implementation of the CommandsConverter.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import { generateUuid } from "vs/base/common/uuid.js";
import type * as Vscode from "vscode";

import { Commands as CommandsService } from "../../Service/Command/mod.js";
import type { Interface } from "./Service.js";
import type { ApiCommand } from "./Type.js";

export class Definition implements Interface {
	private readonly DelegatingCommandId: string;
	private readonly DelegatedCommands = new Map<string, Vscode.Command>();

	constructor(
		private readonly Commands: CommandsService.Interface,
		private readonly LookupApiCommand: (
			Id: string,
		) => ApiCommand | undefined,
	) {
		this.DelegatingCommandId = `_cocoon.delegate.${generateUuid()}`;

		// Register the command that handles the delegated execution.
		this.Commands.RegisterCommand(
			this.DelegatingCommandId,
			this.executeDelegatedCommand,
			this,
		);
	}

	private executeDelegatedCommand(Id: string, ...Args: any[]): any {
		const command = this.DelegatedCommands.get(Id);
		if (!command) {
			throw new Error(`Unknown delegated command: ${Id}`);
		}
		return this.Commands.ExecuteCommand(
			command.command,
			...(command.arguments ?? []),
		);
	}

	public ToInternal(
		command: Vscode.Command,
		disposables: IDisposable[],
	): any {
		if (!command) {
			return undefined;
		}

		// If the command is a built-in API command, we validate and convert its arguments.
		const ApiCommand = this.LookupApiCommand(command.command);
		if (ApiCommand) {
			const ConvertedArgs =
				command.arguments?.map((arg, i) =>
					ApiCommand.Argument[i].Convert(arg),
				) ?? [];
			return {
				$ident: undefined,
				id: ApiCommand.InternalId,
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
			this.DelegatedCommands.set(Id, command);
			disposables.push({
				dispose: () => this.DelegatedCommands.delete(Id),
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

	public FromInternal(dto: any): Vscode.Command | undefined {
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
