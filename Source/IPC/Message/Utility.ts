/**
 * @module Message/Utility
 * @description
 * Utility functions for creating and analyzing IPC messages.
 */

import type { IMessage } from "./Types.js";
import { CompressionHint } from "./Types.js";
import { COMPRESSION_THRESHOLD, MessageFlags } from "./Constants.js";
import VSBuffer from "./VSBuffer.js";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a unique message ID
 *
 * @returns Unique message identifier string
 */
export const GenerateMessageID = (): string =>
	`msg-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;

/**
 * Creates a new message with the specified data and metadata
 *
 * @param Data - Message payload data
 * @param MessageType - Type of message
 * @param Source - Source endpoint
 * @param Destination - Destination endpoint
 * @param Hint - Compression hint for payload
 * @returns New IMessage instance
 */
export const CreateMessage = (
	Data: Uint8Array | string,
	MessageType: string,
	Source: string,
	Destination: string,
	Hint: CompressionHint = CompressionHint.None,
): IMessage => {
	const DataBytes =
		typeof Data === "string" ? VSBuffer.FromString(Data).byteBuffer : Data;

	return {
		Data: DataBytes,
		Metadata: {
			MessageID: GenerateMessageID(),
			Source,
			Destination,
			Timestamp: Date.now(),
			MessageType,
		},
		CompressionHint: Hint,
		Flags: MessageFlags.None,
	};
};

/**
 * Gets the optimal compression hint based on message size and content
 *
 * @param Message - Message to analyze
 * @returns Recommended compression hint
 */
export const GetOptimalCompressionHint = (Message: IMessage): CompressionHint => {
	if (Message.Data.length < COMPRESSION_THRESHOLD) {
		return CompressionHint.None;
	}

	if (Message.Data.length < 10 * 1024) {
		return CompressionHint.Fast;
	}

	if (Message.Data.length < 1024 * 1024) {
		return CompressionHint.Balanced;
	}

	return CompressionHint.Maximum;
};

export default { GenerateMessageID, CreateMessage, GetOptimalCompressionHint };
