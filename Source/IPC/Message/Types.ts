/**
 * @module Message/Types
 * @description
 * Type definitions and interfaces for the Mountain-Wind IPC messaging system.
 * Pure type declarations - no runtime code.
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
 * Serialization result with success/failure information.
 *
 * `Error` is declared as `string | undefined` (not `string?`) so call sites
 * can emit `Error: undefined` on the success branch without tripping TS's
 * `exactOptionalPropertyTypes` guard (which rejects assigning `undefined`
 * to an optional field that's declared without `| undefined`).
 */
export interface ISerializationResult {
	/** Success flag */
	readonly Success: boolean;
	/** Serialized data or null if failed */
	readonly Data: Uint8Array | null;
	/** Error message if failed, `undefined` otherwise */
	readonly Error: string | undefined;
	/** Original message size for compression ratio calculation */
	readonly OriginalSize: number;
	/** Final serialized size */
	readonly FinalSize: number;
}

/**
 * Deserialize result with message and metadata.
 *
 * See `ISerializationResult` for the `Error: string | undefined` rationale.
 */
export interface IDeserializationResult {
	/** Success flag */
	readonly Success: boolean;
	/** Deserialized message or null if failed */
	readonly Message: IMessage | IBatchMessage | null;
	/** Error message if failed, `undefined` otherwise */
	readonly Error: string | undefined;
	/** Validation warnings (non-blocking) */
	readonly Warnings: string[];
}

export default {};
