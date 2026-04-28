/**
 * @module Message/SerializeMessage
 * @description
 * Serializes an IMessage into a binary-safe format with header and
 * compression hints.
 *
 * Binary Format:
 * - Header (8 bytes): Magic (3) + Version (1) + Flags (1) + Reserved (3)
 * - Metadata Length (4 bytes): Length of metadata JSON
 * - Metadata (variable): JSON string of metadata
 * - Data Length (4 bytes): Length of data payload
 * - Data (variable): Binary payload
 */

import {
	COMPRESSION_THRESHOLD,
	MAX_MESSAGE_SIZE,
	MESSAGE_HEADER_MAGIC,
	PROTOCOL_VERSION,
} from "./Constants.js";
import {
	CompressionHint,
	type IMessage,
	type ISerializationResult,
} from "./Types.js";
import { ValidateMessage } from "./Validation.js";
import VSBuffer from "./VSBuffer.js";

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serializes a message into a binary-safe format with header and
 * compression hints.
 *
 * @param Message - Message to serialize
 * @returns ISerializationResult with success/failure information
 */
export default (Message: IMessage): ISerializationResult => {
	const Warnings: string[] = [];
	let OriginalSize = 0;
	let FinalSize = 0;

	try {
		// Validate message structure
		if (!ValidateMessage(Message)) {
			return {
				Success: false,
				Data: null,
				Error: "Invalid message structure",
				OriginalSize: 0,
				FinalSize: 0,
			};
		}

		// Check message size
		if (Message.Data.length > MAX_MESSAGE_SIZE) {
			return {
				Success: false,
				Data: null,
				Error: `Message data size ${Message.Data.length} exceeds maximum ${MAX_MESSAGE_SIZE}`,
				OriginalSize: Message.Data.length,
				FinalSize: 0,
			};
		}

		// Serialize metadata to JSON
		const MetadataJSON = JSON.stringify(Message.Metadata);
		const MetadataBuffer = VSBuffer.FromString(MetadataJSON);

		// Calculate total required size
		OriginalSize =
			8 + // Header
			4 + // Metadata Length
			MetadataBuffer.length +
			4 + // Data Length
			Message.Data.length;

		// Check if compression should be applied
		let DataBuffer = Message.Data;
		let Flags = Message.Flags;

		if (
			Message.CompressionHint !== CompressionHint.None &&
			Message.Data.length >= COMPRESSION_THRESHOLD
		) {
			CompressionHint.Fast; // Simplified - in real implementation would apply compression
			Warnings.push("Compression support not fully implemented");
		}

		// Allocate buffer for serialization
		const Buffer = VSBuffer.Allocate(OriginalSize);
		let Offset = 0;

		// Write header (Magic + Version + Flags + Reserved)
		Buffer.setBytes(Offset, MESSAGE_HEADER_MAGIC);
		Offset += 3;
		Buffer.setByte(Offset, PROTOCOL_VERSION);
		Offset += 1;
		Buffer.setByte(Offset, Flags);
		Offset += 1;
		Buffer.setByte(Offset, 0); // Reserved
		Offset += 1;
		Buffer.setByte(Offset, 0); // Reserved
		Offset += 1;
		Buffer.setByte(Offset, 0); // Reserved
		Offset += 1;

		// Write metadata length
		Buffer.writeUInt32LE(Offset, MetadataBuffer.length);
		Offset += 4;

		// Write metadata
		Buffer.setBytes(Offset, MetadataBuffer.byteBuffer);
		Offset += MetadataBuffer.length;

		// Write data length
		Buffer.writeUInt32LE(Offset, DataBuffer.length);
		Offset += 4;

		// Write data
		Buffer.setBytes(Offset, DataBuffer);
		Offset += DataBuffer.length;

		FinalSize = Offset;

		// Validate final size
		if (FinalSize > MAX_MESSAGE_SIZE) {
			return {
				Success: false,
				Data: null,
				Error: `Serialized message size ${FinalSize} exceeds maximum ${MAX_MESSAGE_SIZE}`,
				OriginalSize,
				FinalSize,
			};
		}

		return {
			Success: true,
			Data: Buffer.slice(0, FinalSize).byteBuffer,
			Error: undefined,
			OriginalSize,
			FinalSize,
		};
	} catch (Error) {
		return {
			Success: false,
			Data: null,
			Error:
				Error instanceof globalThis.Error
					? Error.message
					: String(Error),
			OriginalSize,
			FinalSize,
		};
	}
};
