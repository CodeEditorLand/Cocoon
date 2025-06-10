/**
 * @module Error (ProtoConverter)
 * @description Defines custom errors for Protobuf serialization/deserialization.
 */

import { Data } from "effect";

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
