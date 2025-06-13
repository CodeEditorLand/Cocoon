/**
 * @module Error (ProtoConverter)
 * @description Defines custom errors for Protobuf serialization/deserialization.
 */

import { Data } from "effect";

/**
 * A tagged error representing a failure during the conversion between a
 * JavaScript value and a Google Protobuf `Value` type.
 */
export class ProtoSerializationError extends Data.TaggedError(
	"ProtoSerializationError",
)<{
	readonly cause: unknown;
	readonly direction: "Encoding" | "Decoding";
}> {
	get message() {
		return `Protobuf ${this.direction} failed: ${this.cause}`;
	}
}
