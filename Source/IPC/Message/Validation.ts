/**
 * @module Message/Validation
 * @description
 * Validation functions for IPC message structures.
 */

import {
	MAX_BATCH_COUNT,
	MAX_BATCH_SIZE,
	MAX_MESSAGE_SIZE,
} from "./Constants.js";

import {
	CompressionHint,
	type IBatchMessage,
	type IMessage,
	type MessageMetadata,
} from "./Types.js";

// ============================================================================
// ENVELOPE LIMITS AND KNOWN KINDS (D16-I3)
// ============================================================================

/**
 * Named ceiling on the byte length of a single IPC payload.
 * Mirrors `MAX_MESSAGE_SIZE` (Constants.ts:13) so existing traffic is unchanged;
 * kept local to this validator so the ceiling is explicit on the validation path.
 */
export const PAYLOAD_LENGTH_CEILING_BYTES = MAX_MESSAGE_SIZE;

/**
 * Envelope kinds that actually exist in the Cocoon protocol. No new kind is
 * invented here - both spellings below are already emitted in-tree.
 * Sources:
 *   Element/Cocoon/Source/IPC/Channel.ts:174,188,211
 *     (RequestMessage/ResponseMessage/EventMessage discriminators:
 *      "request" | "response" | "event")
 *   Element/Cocoon/Source/IPC/Protocol.ts:83-90
 *     (ProtocolMessageType: "request" | "response" | "notification")
 */
export const KNOWN_MESSAGE_TYPES = [

	"request",

	"response",

	"event",

	"notification",
] as const;

export type KnownMessageType = (typeof KNOWN_MESSAGE_TYPES)[number];

/**
 * Flood-safe notice log: each distinct rejection reason warns at most once.
 * Keeps "visible failure" without letting a hostile peer fill the log.
 */
const _WarnedOnce = new Set<string>();

const _WarnValidationOnce = (Key: string, Message: string): void => {

	if (_WarnedOnce.has(Key)) return;

	_WarnedOnce.add(Key);

	try {
		console.warn(Message);
	} catch (_LoggingError) {}
};

/**
 * Additive check: payload byte length must not exceed the named ceiling.
 * A non-Uint8Array payload is rejected here as well.
 */
export const ValidatePayloadLength = (Data: Uint8Array): boolean => {

	if (!(Data instanceof Uint8Array)) {

		_WarnValidationOnce("payload-kind", "[Cocoon/Validation] payload is not a Uint8Array; rejecting");

		return false;
	}

	if (Data.length > PAYLOAD_LENGTH_CEILING_BYTES) {

		_WarnValidationOnce(

			"payload-length",

			`[Cocoon/Validation] payload length ${Data.length} exceeds ceiling ${PAYLOAD_LENGTH_CEILING_BYTES}; rejecting`,
		);

		return false;
	}

	return true;
};

/**
 * Additive check: metadata MessageType must be one of the known protocol kinds.
 * Keeps the existing non-empty-string rule and adds the enum membership test.
 */
export const ValidateMessageType = (MessageType: string): boolean => {

	if (typeof MessageType !== "string" || MessageType.length === 0) {

		_WarnValidationOnce("message-type-empty", "[Cocoon/Validation] empty message type; rejecting");

		return false;
	}

	if (!(KNOWN_MESSAGE_TYPES as readonly string[]).includes(MessageType)) {

		_WarnValidationOnce(

			"message-type-unknown",

			`[Cocoon/Validation] unknown message type '${MessageType.slice(0, 64)}'; rejecting`,
		);

		return false;
	}

	return true;
};

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

	if (!ValidateMessageType(Metadata.MessageType)) {
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

	if (!ValidatePayloadLength(Message.Data)) {
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

export default {
	ValidateMetadata,
	ValidateMessage,
	ValidateBatchMessage,
	ValidatePayloadLength,
	ValidateMessageType,
};
