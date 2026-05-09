/**
 * @module ProtoSerializationProblem
 * @description Defines a custom, tagged error for failures during conversion between
 * JavaScript values and Google Protobuf `Value` types.
 */

import { Data } from "effect";

/**
 * @class ProtoSerializationProblem
 * @description A tagged error representing a failure during the conversion between a
 * JavaScript value and a Google Protobuf `Value` type.
 */
export class ProtoSerializationProblem extends Data.TaggedError(
	"ProtoSerializationProblem",
)<{
	readonly Cause: unknown;

	readonly Direction: "Encoding" | "Decoding";
}> {
	public override readonly message: string;

	constructor(Properties: {
		readonly Cause: unknown;
		readonly Direction: "Encoding" | "Decoding";
	}) {
		super(Properties);

		this.message = `Protobuf ${this.Direction} failed: ${this.Cause}`;
	}
}
