/**
 * @module Message/DeserializeMessage
 * @description
 * Deserializes a binary message into an IMessage structure.
 */

import {
	MAX_MESSAGE_SIZE,
	MESSAGE_HEADER_MAGIC,
	MessageFlags,
	PROTOCOL_VERSION,
} from "../Constants.js";

import {
	CompressionHint,
	type IDeserializationResult,
	type IMessage,
	type MessageMetadata,
} from "../Types.js";

import { ValidateMetadata } from "../Validation.js";

import VSBuffer from "../VSBuffer.js";

// ============================================================================
// DESERIALIZATION
// ============================================================================
/**
 * Deserializes a binary message into an IMessage structure
 *
 * @param Data - Binary data to deserialize
 * @returns IDeserializationResult with message and validation information
 */
export default (Data: Uint8Array): IDeserializationResult => {

	const Warnings: string[] = [];

	try {
		// Validate input
		if (!Data || !(Data instanceof Uint8Array)) {
			return {
				Success: false,

				Message: null,

				Error: "Input data must be a Uint8Array",

				Warnings,
			};
		}

		// Check minimum size (header + metadata length + data length markers)
		if (Data.length < 16) {
			return {
				Success: false,

				Message: null,

				Error: `Input data too short: ${Data.length} bytes (minimum 16)`,

				Warnings,
			};
		}

		// Check maximum size
		if (Data.length > MAX_MESSAGE_SIZE) {
			return {
				Success: false,

				Message: null,

				Error: `Input data too large: ${Data.length} bytes (maximum ${MAX_MESSAGE_SIZE})`,

				Warnings,
			};
		}

		// Wrap data in VSBuffer for safe access
		const Buffer = VSBuffer.Wrap(Data;

		let Offset = 0;

		// Read and validate header
		const Magic = Buffer.slice(Offset, Offset + 3).byteBuffer;

		Offset += 3;

		if (
			Magic[0] !== MESSAGE_HEADER_MAGIC[0] ||
			Magic[1] !== MESSAGE_HEADER_MAGIC[1] ||
			Magic[2] !== MESSAGE_HEADER_MAGIC[2]
		) {
			return {
				Success: false,

				Message: null,

				Error: `Invalid magic bytes in header: [${Magic.join(", ")}]`,

				Warnings,
			};
		}

		const Version = Buffer.getByte(Offset;

		Offset += 1;

		if (Version !== PROTOCOL_VERSION) {
			Warnings.push(
				`Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${Version}`,
			;
		}

		const Flags = Buffer.getByte(Offset;

		Offset += 1;

		Offset += 3; // Skip reserved bytes

		// Read metadata length
		const MetadataLength = Buffer.readUInt32LE(Offset;

		Offset += 4;

		if (MetadataLength > MAX_MESSAGE_SIZE) {
			return {
				Success: false,

				Message: null,

				Error: `Metadata length ${MetadataLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,

				Warnings,
			};
		}

		if (Offset + MetadataLength > Data.length) {
			return {
				Success: false,

				Message: null,

				Error: `Metadata extends beyond buffer: offset ${Offset}, length ${MetadataLength}, total ${Data.length}`,

				Warnings,
			};
		}

		// Read metadata
		const MetadataBuffer = Buffer.slice(Offset, Offset + MetadataLength;

		Offset += MetadataLength;

		let Metadata: MessageMetadata;

		try {
			Metadata = JSON.parse(MetadataBuffer.toString()) as MessageMetadata;
		} catch (Error) {
			return {
				Success: false,

				Message: null,

				Error: `Failed to parse metadata JSON: ${Error instanceof globalThis.Error ? Error.message : String(Error)}`,

				Warnings,
			};
		}

		if (!ValidateMetadata(Metadata)) {
			Warnings.push("Metadata validation failed, continuing anyway";
		}

		// Read data length
		const DataLength = Buffer.readUInt32LE(Offset;

		Offset += 4;

		if (DataLength > MAX_MESSAGE_SIZE) {
			return {
				Success: false,

				Message: null,

				Error: `Data length ${DataLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,

				Warnings,
			};
		}

		if (Offset + DataLength > Data.length) {
			return {
				Success: false,

				Message: null,

				Error: `Data extends beyond buffer: offset ${Offset}, length ${DataLength}, total ${Data.length}`,

				Warnings,
			};
		}

		// Read data
		const MessageData = Buffer.slice(
			Offset,

			Offset + DataLength,
		).byteBuffer;

		Offset += DataLength;

		// Check for extra data
		if (Offset < Data.length) {
			Warnings.push(
				`Extra data at end of message: ${Data.length - Offset} bytes`,
			;
		}

		// Determine compression hint from flags
		let Hint = CompressionHint.None;

		if (Flags & MessageFlags.Compressed) {
			Hint = CompressionHint.Balanced; // Default for compressed messages

			Warnings.push(
				"Message is compressed but decompression not implemented",
			;
		}

		const Message: IMessage = {
			Data: MessageData,

			Metadata,

			CompressionHint: Hint,

			Flags,
		};

		return {
			Success: true,

			Message,

			Error: undefined,

			Warnings,
		};
	} catch (Error) {
		return {
			Success: false,

			Message: null,

			Error:
				Error instanceof globalThis.Error
					? Error.message
					: String(Error),

			Warnings,
		};
	}
};
