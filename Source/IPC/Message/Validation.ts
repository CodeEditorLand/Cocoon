/**
 * @module Message/Validation
 * @description
 * Validation functions for IPC message structures.
 */

import type { IBatchMessage, IMessage, MessageMetadata } from "./Types.js";
import { CompressionHint } from "./Types.js";
import { MAX_BATCH_COUNT, MAX_BATCH_SIZE, MAX_MESSAGE_SIZE } from "./Constants.js";

// ============================================================================
// MESSAGE VALIDATION
// ============================================================================

/**
 * Validates message metadata structure
 *
 * @param Metadata - Metadata to validate
 * @returns True if valid, false otherwise
 */
export const ValidateMetadata = (Metadata: MessageMetadata): boolean => {
	if (!Metadata) {
		return false;
	}
	if (
		typeof Metadata.MessageID !== "string" ||
		Metadata.MessageID.length === 0
	) {
		return false;
	}
	if (typeof Metadata.Source !== "string" || Metadata.Source.length === 0) {
		return false;
	}
	if (
		typeof Metadata.Destination !== "string" ||
		Metadata.Destination.length === 0
	) {
		return false;
	}
	if (typeof Metadata.Timestamp !== "number" || Metadata.Timestamp <= 0) {
		return false;
	}
	if (
		typeof Metadata.MessageType !== "string" ||
		Metadata.MessageType.length === 0
	) {
		return false;
	}
	return true;
};

/**
 * Validates message structure
 *
 * @param Message - Message to validate
 * @returns True if valid, false otherwise
 */
export const ValidateMessage = (Message: IMessage): boolean => {
	if (!Message) {
		return false;
	}
	if (!ValidateMetadata(Message.Metadata)) {
		return false;
	}
	if (!(Message.Data instanceof Uint8Array)) {
		return false;
	}
	if (Message.Data.length > MAX_MESSAGE_SIZE) {
		return false;
	}
	if (!Object.values(CompressionHint).includes(Message.CompressionHint)) {
		return false;
	}
	if (typeof Message.Flags !== "number" || Message.Flags < 0) {
		return false;
	}
	return true;
};

/**
 * Validates batched message structure
 *
 * @param Batch - Batched message to validate
 * @returns True if valid, false otherwise
 */
export const ValidateBatchMessage = (Batch: IBatchMessage): boolean => {
	if (!Batch) {
		return false;
	}
	if (!Array.isArray(Batch.Messages) || Batch.Messages.length === 0) {
		return false;
	}
	if (!Batch.BatchMetadata) {
		return false;
	}
	if (
		typeof Batch.BatchMetadata.BatchID !== "string" ||
		Batch.BatchMetadata.BatchID.length === 0
	) {
		return false;
	}
	if (
		typeof Batch.BatchMetadata.MessageCount !== "number" ||
		Batch.BatchMetadata.MessageCount <= 0
	) {
		return false;
	}
	if (Batch.BatchMetadata.MessageCount > MAX_BATCH_COUNT) {
		return false;
	}
	if (
		typeof Batch.BatchMetadata.TotalSize !== "number" ||
		Batch.BatchMetadata.TotalSize <= 0
	) {
		return false;
	}
	if (Batch.BatchMetadata.TotalSize > MAX_BATCH_SIZE) {
		return false;
	}
	if (
		typeof Batch.BatchMetadata.Timestamp !== "number" ||
		Batch.BatchMetadata.Timestamp <= 0
	) {
		return false;
	}

	// Validate all messages in batch
	for (const Message of Batch.Messages) {
		if (!ValidateMessage(Message)) {
			return false;
		}
	}

	return true;
};

export default { ValidateMetadata, ValidateMessage, ValidateBatchMessage };
