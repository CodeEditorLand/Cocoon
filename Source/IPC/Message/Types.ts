/**
 * @module Message/Types
 * @description
 * Type definitions and interfaces for the Mountain-Wind IPC messaging system.
 * Pure type declarations — no runtime code.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Compression hint types for optimizing message payloads
 */
export enum CompressionHint {
	/** No compression recommended */
	None = "none",
	/** Use fast compression (speed optimized) */
	Fast = "fast",
	/** Use balanced compression (default) */
	Balanced = "balanced",
	/** Use maximum compression (size optimized) */
	Maximum = "maximum",
}

/**
 * Message metadata for tracking and debugging
 */
export interface MessageMetadata {
	/** Unique message identifier */
	readonly MessageID: string;
	/** Source endpoint (Wind/Mountain) */
	readonly Source: string;
	/** Destination endpoint */
	readonly Destination: string;
	/** Message timestamp */
	readonly Timestamp: number;
	/** Message type identifier */
	readonly MessageType: string;
	/** Correlation ID for request-response patterns */
	readonly CorrelationID?: string;
	/** Message sequence number */
	readonly SequenceNumber?: number;
	/** Total sequence count */
	readonly SequenceTotal?: number;
}

/**
 * Message structure for IPC communication
 */
export interface IMessage {
	/** Message payload data */
	readonly Data: Uint8Array;
	/** Message metadata */
	readonly Metadata: MessageMetadata;
	/** Compression hint for payload */
	readonly CompressionHint: CompressionHint;
	/** Custom message flags */
	readonly Flags: number;
	/** Optional error information */
	readonly Error?: {
		readonly Code: string;
		readonly Message: string;
		readonly Stack?: string;
	};
}

/**
 * Batched message containing multiple individual messages
 */
export interface IBatchMessage {
	/** Array of individual messages */
	readonly Messages: IMessage[];
	/** Batch metadata */
	readonly BatchMetadata: {
		readonly BatchID: string;
		readonly MessageCount: number;
		readonly TotalSize: number;
		readonly Timestamp: number;
	};
}

/**
 * Serialization result with success/failure information
 */
export interface ISerializationResult {
	/** Success flag */
	readonly Success: boolean;
	/** Serialized data or null if failed */
	readonly Data: Uint8Array | null;
	/** Error message if failed */
	readonly Error?: string;
	/** Original message size for compression ratio calculation */
	readonly OriginalSize: number;
	/** Final serialized size */
	readonly FinalSize: number;
}

/**
 * Deserialize result with message and metadata
 */
export interface IDeserializationResult {
	/** Success flag */
	readonly Success: boolean;
	/** Deserialized message or null if failed */
	readonly Message: IMessage | IBatchMessage | null;
	/** Error message if failed */
	readonly Error?: string;
	/** Validation warnings (non-blocking) */
	readonly Warnings: string[];
}

export default {};
