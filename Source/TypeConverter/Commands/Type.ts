/**
 * @module Type (Commands/TypeConverter)
 * @description Defines types for describing command signatures.
 */

export class ApiCommandArgument<V, D> {
	constructor(
		public readonly Name: string,
		public readonly Description: string,
		public readonly Validate: (v: V) => boolean,
		public readonly Convert: (v: V) => D,
	) {}
}

export class ApiCommandResult<V, R> {
	constructor(
		public readonly Name: string,
		public readonly Convert: (v: V) => R,
	) {}
}

export class ApiCommand {
	constructor(
		public readonly Id: string,
		public readonly InternalId: string,
		public readonly Description: string,
		public readonly Argument: ApiCommandArgument<any, any>[],
		public readonly Result: ApiCommandResult<any, any>,
	) {}
}
