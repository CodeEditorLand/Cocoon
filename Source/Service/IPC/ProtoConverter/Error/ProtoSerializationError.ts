/*
 * File: Cocoon/Source/Service/IPC/ProtoConverter/Error/ProtoSerializationError.ts
 * Responsibility: Defines custom errors for Protobuf serialization/deserialization.
 *
 * Last-Modified: 2025-06-18
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
	readonly Direction: "Encoding" | "Decoding";
}> {
	constructor(properties: {
		readonly cause: unknown;
		readonly Direction: "Encoding" | "Decoding";
	}) {
		super(properties);
		this.message = `Protobuf ${this.Direction} failed: ${this.cause}`;
	}
	public override readonly message: string;
}

export default ProtoSerializationError;
