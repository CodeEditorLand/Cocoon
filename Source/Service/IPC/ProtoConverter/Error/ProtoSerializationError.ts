/*
 * File: Cocoon/Source/Service/IPC/ProtoConverter/Error/ProtoSerializationError.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:02 UTC
 * Dependency: effect
 * Export: extends
 */

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
