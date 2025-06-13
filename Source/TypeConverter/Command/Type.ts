/**
 * @module Type (Command/TypeConverter)
 * @description Defines types for describing command signatures.
 */

export class APICommandArgument<V, D> {
	constructor(
		public readonly Name: string,
		public readonly Description: string,
		public readonly Validate: (v: V) => boolean,
		public readonly Convert: (v: V) => D,
	) {}
}

export class APICommandResult<V, R> {
	constructor(
		public readonly Name: string,
		public readonly Convert: (v: V) => R,
	) {}
}

export class APICommand {
	constructor(
		public readonly Id: string,
		public readonly InternalId: string,
		public readonly Description: string,
		public readonly Argument: APICommandArgument<any, any>[],
		public readonly Result: APICommandResult<any, any>,
	) {}
}
