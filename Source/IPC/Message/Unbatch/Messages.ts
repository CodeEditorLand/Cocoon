/**
 * @module Message/UnbatchMessages
 * @description
 * Unbatches a serialized batch binary payload into individual IMessage
 * instances.
 */

import { MAX_BATCH_COUNT } from "../Constants.js";
import DeserializeMessage from "../Deserialize/Message.js";
import type {
	IBatchMessage,
	IDeserializationResult,
	IMessage,
} from "../Types.js";
import VSBuffer from "../VSBuffer.js";

// ============================================================================
// UNBATCH OPERATION
// ============================================================================

/**
 * Unbatches a serialized batch message into individual messages
 *
 * @param Data - Batched binary data
 * @returns IDeserializationResult extended with a Messages array
 */
export default (
	Data: Uint8Array,
): IDeserializationResult & { readonly Messages: IMessage[] } => {
	const Warnings: string[] = [];

	let Messages: IMessage[] = [];

	try {
		// Validate input
		if (!Data || !(Data instanceof Uint8Array)) {
			return {
				Success: false,

				Message: null,

				Error: "Input data must be a Uint8Array",

				Warnings,

				Messages: [],
			};
		}

		if (Data.length < 8) {
			return {
				Success: false,

				Message: null,

				Error: `Batch data too short: ${Data.length} bytes (minimum 8)`,

				Warnings,

				Messages: [],
			};
		}

		// Wrap data in VSBuffer
		const Buffer = VSBuffer.Wrap(Data);

		let Offset = 0;

		// Read message count
		const MessageCount = Buffer.readUInt32LE(Offset);

		Offset += 4;

		if (MessageCount > MAX_BATCH_COUNT) {
			return {
				Success: false,

				Message: null,

				Error: `Message count ${MessageCount} exceeds maximum ${MAX_BATCH_COUNT}`,

				Warnings,

				Messages: [],
			};
		}

		if (MessageCount === 0) {
			return {
				Success: false,

				Message: null,

				Error: "Message count is zero",

				Warnings,

				Messages: [],
			};
		}

		// Read metadata length
		const MetadataLength = Buffer.readUInt32LE(Offset);

		Offset += 4;

		if (Offset + MetadataLength > Data.length) {
			return {
				Success: false,

				Message: null,

				Error: "Metadata extends beyond buffer",

				Warnings,

				Messages: [],
			};
		}

		// Read and validate metadata
		const MetadataBuffer = Buffer.slice(Offset, Offset + MetadataLength);

		Offset += MetadataLength;

		try {
			JSON.parse(MetadataBuffer.toString());
		} catch (Error) {
			return {
				Success: false,

				Message: null,

				Error: `Failed to parse batch metadata JSON: ${Error instanceof globalThis.Error ? Error.message : String(Error)}`,

				Warnings,

				Messages: [],
			};
		}

		// Read message headers
		const MessageHeaders: Array<{ length: number; offset: number }> = [];

		for (let Index = 0; Index < MessageCount; Index++) {
			if (Offset + 4 > Data.length) {
				return {
					Success: false,

					Message: null,

					Error: `Message header ${Index} extends beyond buffer`,

					Warnings,

					Messages: [],
				};
			}

			const MessageLength = Buffer.readUInt32LE(Offset);

			Offset += 4;

			MessageHeaders.push({ length: MessageLength, offset: Offset });

			if (Offset + MessageLength > Data.length) {
				return {
					Success: false,

					Message: null,

					Error: `Message data ${Index} extends beyond buffer`,

					Warnings,

					Messages: [],
				};
			}
		}

		// Read and deserialize individual messages
		for (let Index = 0; Index < MessageCount; Index++) {
			const Header = MessageHeaders[Index];

			const MessageData = Buffer.slice(
				Header.offset,

				Header.offset + Header.length,
			).byteBuffer;

			const Result = DeserializeMessage(MessageData);

			if (!Result.Success) {
				Warnings.push(
					`Failed to deserialize message ${Index}: ${Result.Error}`,
				);

				continue;
			}

			// Ensure Result.Message is IMessage (not IBatchMessage)
			if (Result.Message && "Messages" in Result.Message) {
				Warnings.push(
					`Unexpected batch message found at index ${Index}`,
				);

				continue;
			}

			Messages.push(Result.Message as IMessage);
		}

		if (Messages.length !== MessageCount) {
			Warnings.push(
				`Expected ${MessageCount} messages, successfully deserialized ${Messages.length}`,
			);
		}

		return {
			Success: true,

			Message: null,

			Error: undefined,

			Warnings,

			Messages,
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

			Messages,
		};
	}
};
