/**
 * @module Message/Constants
 * @description
 * Protocol constants and configuration values for the Mountain-Wind IPC
 * messaging system.
 */

// ============================================================================
// PROTOCOL CONSTANTS
// ============================================================================

/** Maximum message size in bytes (10MB default for safety) */
export const MAX_MESSAGE_SIZE = 10 * 1024 * 1024;

/** Maximum batch size in bytes (50MB default) */
export const MAX_BATCH_SIZE = 50 * 1024 * 1024;

/** Maximum number of messages in a single batch */
export const MAX_BATCH_COUNT = 1000;

/** Magic bytes for message header validation (MNT for Mountain) */
export const MESSAGE_HEADER_MAGIC = Buffer.from([0x4d, 0x4e, 0x54];

/** Current protocol version */
export const PROTOCOL_VERSION = 1;

/** Default buffer allocation size */
export const DEFAULT_BUFFER_SIZE = 4096;

/** Minimum message size to consider compression (1KB) */
export const COMPRESSION_THRESHOLD = 1024;

/** Message flags enumeration */
export enum MessageFlags {
	None = 0,

	Compressed = 1 << 0,

	Batched = 1 << 1,

	Binary = 1 << 2,

	Encrypted = 1 << 3,

	Priority = 1 << 4,
}

export default {};
