/*
 * File: Cocoon/Source/TypeConverter/Command/Type.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:43 UTC
 * Export: APICommand, APICommandArgument, APICommandResult
 */

/**
 * @module Type (Command/TypeConverter)
 * @description Defines types for describing command signatures, enabling
 * validation and conversion of arguments and results for built-in API commands.
 */

/**
 * Represents and validates a single argument for a built-in API command.
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
 * Represents and converts the result of a built-in API command.
 */
export class APICommandResult<V, R> {
	constructor(
		public readonly Name: string,
		public readonly Convert: (Value: V) => R,
	) {}
}

/**
 * A descriptor for a built-in API command, detailing its signature.
 * This allows for automated marshalling and unmarshalling of command
 * arguments and results when communicating with the host.
 */
export class APICommand {
	constructor(
		public readonly ID: string,
		public readonly InternalID: string,
		public readonly Description: string,
		public readonly Arguments: readonly APICommandArgument<any, any>[],
		public readonly Result: APICommandResult<any, any>,
	) {}
}
