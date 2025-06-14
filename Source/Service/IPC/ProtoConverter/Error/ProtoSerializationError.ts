/**
 * @module ProtoSerializationError (ProtoConverter/Error)
 * @description Defines custom errors for Protobuf serialization/deserialization.
 */

import { Data } from "effect";

/**
 * A tagged error representing a failure during the conversion between a
 * JavaScript value and a Google Protobuf `Value` type.
 */
export default class extends Data.TaggedError("ProtoSerializationError")<{
	readonly cause: unknown;
	readonly Direction: "Encoding" | "Decoding";
}> {
	constructor(Properties: {
		readonly cause: unknown;
		readonly Direction: "Encoding" | "Decoding";
	}) {
		super(Properties);
		this.message = `Protobuf ${this.Direction} failed: ${this.cause}`;
	}
	public override readonly message: string;
}
