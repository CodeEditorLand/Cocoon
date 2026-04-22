/**
 * @module Message/Index
 * @description
 * Barrel re-export for the Message module. Re-exports all public API so that
 * imports from "…/IPC/Message.js" continue to resolve correctly after the
 * directory split.
 */

// Types
export { CompressionHint } from "./Types.js";
export type {
	IBatchMessage,
	IDeserializationResult,
	IMessage,
	ISerializationResult,
	MessageMetadata,
} from "./Types.js";

// Constants
export { MessageFlags } from "./Constants.js";
export {
	COMPRESSION_THRESHOLD,
	DEFAULT_BUFFER_SIZE,
	MAX_BATCH_COUNT,
	MAX_BATCH_SIZE,
	MAX_MESSAGE_SIZE,
	MESSAGE_HEADER_MAGIC,
	PROTOCOL_VERSION,
} from "./Constants.js";

// VSBuffer class
export { default as VSBuffer } from "./VSBuffer.js";

// Validation helpers
export {
	ValidateBatchMessage,
	ValidateMessage,
	ValidateMetadata,
} from "./Validation.js";

// Core operations
export { default as SerializeMessage } from "./SerializeMessage.js";
export { default as DeserializeMessage } from "./DeserializeMessage.js";
export { default as BatchMessages } from "./BatchMessages.js";
export { default as UnbatchMessages } from "./UnbatchMessages.js";

// Utility functions
export {
	CreateMessage,
	GenerateMessageID,
	GetOptimalCompressionHint,
} from "./Utility.js";
