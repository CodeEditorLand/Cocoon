/*
 * File: Cocoon/Source/TypeConverter/Command/Definition.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./Type.js, vs/base/common/lifecycle.js, vs/base/common/uuid.js, vs/platform/commands/common/commands.js, vscode
 */

/**
 * @module Definition (Command/TypeConverter)
 * @description The class implementation of the CommandConverter. It handles the
 * complex logic of marshalling commands, their arguments, and handling command
 * delegation for functions passed as arguments.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import { generateUuid } from "vs/base/common/uuid.js";
// Do not import ICommand from platform, it is not the DTO.
// import type { ICommand } from "vs/platform/commands/common/commands.js";
import type * as VSCode from "vscode";

import type { APICommand } from "./Type.js";

/**
 * Represents the serializable DTO for a command sent over IPC.
 * This is distinct from the rich `ICommand` object from `vs/platform` which includes a handler function.
 */
interface InternalCommand {
	id: string;
	title: string;
	tooltip?: string;
	arguments?: any[];
}

export default class {
	private readonly DelegatingCommandID: string;
	private readonly DelegatedCommands = new Map<string, VSCode.Command>();

	constructor(
		private readonly RegisterCommand: (
			ID: string,
			Handler: (...args: any[]) => any,
			ThisArgument: any,
		) => IDisposable,
		private readonly ExecuteCommand: <T>(
			command: string,
			...rest: any[]
		) => Promise<T | undefined>,
		private readonly LookupAPICommand: (
			ID: string,
		) => APICommand | undefined,
	) {
		this.DelegatingCommandID = `_cocoon.delegate.${generateUuid()}`;

		this.RegisterCommand(
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
		return this.ExecuteCommand(
			Command.command,
			...[...(Command.arguments ?? []), ...ArgumentArray],
		);
	}

	public ToInternal(
		Command: VSCode.Command,
		DisposableArray: IDisposable[],
	): InternalCommand | undefined {
		if (!Command) {
			return undefined;
		}

		const APICommandValue = this.LookupAPICommand(Command.command);
		if (APICommandValue) {
			const ConvertedArgumentArray =
				Command.arguments?.map((Argument, i) =>
					APICommandValue.Arguments[i].Convert(Argument),
				) ?? [];
			return {
				id: APICommandValue.InternalID,
				title: Command.title,
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
				arguments: [ID, ...(Command.arguments ?? [])],
			};
		}

		return {
			id: Command.command,
			title: Command.title,
			arguments: Command.arguments,
		};
	}

	public FromInternal(
		CommandDTO: InternalCommand,
	): VSCode.Command | undefined {
		if (!CommandDTO) {
			return undefined;
		}
		return {
			command: CommandDTO.id,
			title: CommandDTO.title,
			tooltip: CommandDTO.tooltip,
			arguments: CommandDTO.arguments,
		};
	}
}
