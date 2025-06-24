/**
 * @module Command
 * @description Implements the CommandConverter. It handles the complex logic
 * of marshalling `vscode.Command` objects, their arguments, and handling command
 * delegation for functions passed as arguments.
 */

import { Effect } from "effect";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import { generateUuid } from "vs/base/common/uuid.js";
import type * as VSCode from "vscode";

/**
 * @interface APICommandArgument
 * @description Represents and validates a single argument for a built-in API command.
 */
export class APICommandArgument<V, D> {
	constructor(
		public readonly Name: string,
		public readonly Description: string,
		public readonly Validate: (Value: V) => boolean,
		public readonly Convert: (Value: V) => D,
	) {}
}

/**
 * @interface APICommandResult
 * @description Represents and converts the result of a built-in API command.
 */
export class APICommandResult<V, R> {
	constructor(
		public readonly Name: string,
		public readonly Convert: (Value: V) => R,
	) {}
}

/**
 * @interface APICommand
 * @description A descriptor for a built-in API command, detailing its signature.
 * This allows for automated marshalling and unmarshalling of command
 * arguments and results when communicating with the host.
 */
export class APICommand {
	constructor(
		public readonly Id: string,
		public readonly InternalId: string,
		public readonly Description: string,
		public readonly Arguments: readonly APICommandArgument<any, any>[],
		public readonly Result: APICommandResult<any, any>,
	) {}
}

/**
 * @interface InternalCommand
 * @description Represents the serializable DTO for a command sent over IPC.
 */
interface InternalCommand {
	id: string;
	title: string;
	tooltip?: string;
	arguments?: any[];
}

/**
 * @class Command
 * @description The CommandConverter implementation.
 */
export class Command {
	private readonly DelegatingCommandId: string;
	private readonly DelegatedCommands = new Map<string, VSCode.Command>();

	constructor(
		private readonly RegisterCommand: (
			Id: string,
			Handler: (...args: any[]) => any,
			ThisArgument: any,
		) => IDisposable,
		private readonly ExecuteCommand: <T>(
			command: string,
			...rest: any[]
		) => Effect.Effect<T, Error>,
		private readonly LookupAPICommand: (
			Id: string,
		) => APICommand | undefined,
	) {
		this.DelegatingCommandId = `_cocoon.delegate.${generateUuid()}`;
		this.RegisterCommand(
			this.DelegatingCommandId,
			this.ExecuteDelegatedCommand,
			this,
		);
	}

	private ExecuteDelegatedCommand(Id: string, ...ArgumentArray: any[]): any {
		const Command = this.DelegatedCommands.get(Id);
		if (!Command) throw new Error(`Unknown delegated command: ${Id}`);
		return Effect.runPromise(
			this.ExecuteCommand(
				Command.command,
				...[...(Command.arguments ?? []), ...ArgumentArray],
			),
		);
	}

	public ToInternal(
		Command: VSCode.Command,
		DisposableArray: IDisposable[],
	): InternalCommand | undefined {
		if (!Command) return undefined;
		const APICommandValue = this.LookupAPICommand(Command.command);
		if (APICommandValue) {
			const ConvertedArgumentArray =
				Command.arguments?.map((Argument, i) =>
					APICommandValue.Arguments[i].Convert(Argument),
				) ?? [];
			return {
				id: APICommandValue.InternalId,
				title: Command.title,
				arguments: ConvertedArgumentArray,
			};
		}
		if (
			Array.isArray(Command.arguments) &&
			Command.arguments.some((Argument) => typeof Argument === "function")
		) {
			const Id = generateUuid();
			this.DelegatedCommands.set(Id, Command);
			DisposableArray.push({
				dispose: () => this.DelegatedCommands.delete(Id),
			});
			return {
				id: this.DelegatingCommandId,
				title: Command.title,
				arguments: [Id, ...(Command.arguments ?? [])],
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
		if (!CommandDTO) return undefined;
		return {
			command: CommandDTO.id,
			title: CommandDTO.title,
			tooltip: CommandDTO.tooltip,
			arguments: CommandDTO.arguments,
		};
	}
}
