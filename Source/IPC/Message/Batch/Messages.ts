/**
 * @module Message/BatchMessages
 * @description
 * Batches multiple IMessage instances into a single serialized binary payload.
 *
 * Binary Format:
 * - Message Count (4 bytes): Number of messages in batch
 * - Batch Metadata Length (4 bytes): Length of batch metadata JSON
 * - Batch Metadata (variable): JSON string of batch metadata
 * - Message Headers (variable * message count): Each message's length (4 bytes)
 * - Message Data (variable): Concatenated message data
 */

import { MAX_BATCH_COUNT, MAX_BATCH_SIZE } from "../Constants.js";

import SerializeMessage from "../Serialize/Message.js";

import {
	CompressionHint,
	type IMessage,
	type ISerializationResult,
} from "../Types.js";

import { ValidateMessage } from "../Validation.js";

import VSBuffer from "../VSBuffer.js";

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batches multiple messages into a single IBatchMessage structure
 *
 * @param Messages - Array of messages to batch
 * @param Hint - Compression hint for batch metadata
 * @returns ISerializationResult with batched data
 */
export default (
	Messages: IMessage[],

	Hint: CompressionHint = CompressionHint.Balanced,
): ISerializationResult => {

	const Warnings: string[] = [];

	let OriginalSize = 0;

	let FinalSize = 0;

	try {
		// Validate input
		if (!Array.isArray(Messages) || Messages.length === 0) {
			return {
				Success: false,

				Data: null,

				Error: "Messages array is empty or invalid",

				OriginalSize: 0,

				FinalSize: 0,
			};
		}

		if (Messages.length > MAX_BATCH_COUNT) {
			return {
				Success: false,

				Data: null,

				Error: `Message count ${Messages.length} exceeds maximum ${MAX_BATCH_COUNT}`,

				OriginalSize: 0,

				FinalSize: 0,
			};
		}

		// Validate all messages
		for (let Index = 0; Index < Messages.length; Index++) {
			if (!ValidateMessage(Messages[Index])) {
				return {
					Success: false,

					Data: null,

					Error: `Invalid message at index ${Index}`,

					OriginalSize: 0,

					FinalSize: 0,
				};
			}
		}

		// Serialize individual messages
		const SerializedMessages: Uint8Array[] = [];

		let TotalMessageSize = 0;

		for (const Message of Messages) {
			const Result = SerializeMessage(Message;

			if (!Result.Success) {
				return {
					Success: false,

					Data: null,

					Error: `Failed to serialize message: ${Result.Error}`,

					OriginalSize: 0,

					FinalSize: 0,
				};
			}

			SerializedMessages.push(Result.Data!;

			TotalMessageSize += Result.Data!.length;
		}

		// Check total batch size
		if (TotalMessageSize > MAX_BATCH_SIZE) {
			return {
				Success: false,

				Data: null,

				Error: `Total batch size ${TotalMessageSize} exceeds maximum ${MAX_BATCH_SIZE}`,

				OriginalSize: TotalMessageSize,

				FinalSize: 0,
			};
		}

		// Create batch metadata
		const BatchMetadata = {
			BatchID: `batch-${Date.now()}-${Math.random().toString(36).substring(2)}`,

			MessageCount: Messages.length,

			TotalSize: TotalMessageSize,

			Timestamp: Date.now(),

			CompressionHint: Hint,
		};

		const BatchMetadataJSON = JSON.stringify(BatchMetadata;

		const BatchMetadataBuffer = VSBuffer.FromString(BatchMetadataJSON;

		// Calculate total buffer size
		OriginalSize =
			4 + // Message count
			4 + // Metadata length
			BatchMetadataBuffer.length +
			Messages.length * 4 + // Message headers
			TotalMessageSize;

		// Allocate buffer
		const Buffer = VSBuffer.Allocate(OriginalSize;

		let Offset = 0;

		// Write message count
		Buffer.writeUInt32LE(Offset, Messages.length;

		Offset += 4;

		// Write metadata length
		Buffer.writeUInt32LE(Offset, BatchMetadataBuffer.length;

		Offset += 4;

		// Write metadata
		Buffer.setBytes(Offset, BatchMetadataBuffer.byteBuffer;

		Offset += BatchMetadataBuffer.length;

		// Write message headers (lengths)
		for (const SerializedMessage of SerializedMessages) {
			Buffer.writeUInt32LE(Offset, SerializedMessage.length;

			Offset += 4;
		}

		// Write message data
		for (const MessageData of SerializedMessages) {
			Buffer.setBytes(Offset, MessageData;

			Offset += MessageData.length;
		}

		FinalSize = Offset;

		const ResultData = Buffer.slice(0, FinalSize).byteBuffer;

		Warnings.push(`Successfully batched ${Messages.length} messages`;

		return {
			Success: true,

			Data: ResultData,

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
