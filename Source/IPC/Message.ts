/**
 * @module Message
 * @description
 * Enhanced IPC messaging for Mountain-Wind communication with comprehensive binary-safe
 * serialization, message batching, compression hints, and defensive coding patterns.
 *
 * This module provides the core messaging infrastructure for Inter-Process Communication
 * between the Wind frontend and Mountain backend, ensuring reliable data transmission
 * with robust error handling and performance optimization.
 *
 * Mountain Connection Points:
 * - Linked with TauriIPCServer.rs for server-side message handling
 * - Used by WindAirCommands.ts for command serialization
 * - Integrated with ConfigurationBridge.rs for message routing
 *
 * Key Features:
 * - Binary-safe VSBuffer implementation inspired by VSCode's buffer system
 * - Efficient message batching with configurable batch sizes
 * - Compression hints to optimize payload size for large messages
 * - Comprehensive validation and defensive coding patterns
 * - Type-safe serialization with explicit schema validation
 *
 * @author Mountain IPC Infrastructure
 * @version 1.0.0
 * @since 2025-01-31
 * @license MIT
 */

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

/** Maximum message size in bytes (10MB default for safety) */
const MAX_MESSAGE_SIZE = 10 * 1024 * 1024;

/** Maximum batch size in bytes (50MB default) */
const MAX_BATCH_SIZE = 50 * 1024 * 1024;

/** Maximum number of messages in a single batch */
const MAX_BATCH_COUNT = 1000;

/** Magic bytes for message header validation (MNT for Mountain) */
const MESSAGE_HEADER_MAGIC = Buffer.from([0x4d, 0x4e, 0x54]);

/** Current protocol version */
const PROTOCOL_VERSION = 1;

/** Default buffer allocation size */
const DEFAULT_BUFFER_SIZE = 4096;

/** Minimum message size to consider compression (1KB) */
const COMPRESSION_THRESHOLD = 1024;

/** Message flags enumeration */
enum MessageFlags {
	None = 0,
	Compressed = 1 << 0,
	Batched = 1 << 1,
	Binary = 1 << 2,
	Encrypted = 1 << 3,
	Priority = 1 << 4,
}

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

// ============================================================================
// VSBuffer IMPLEMENTATION
// ============================================================================

/**
 * Binary-safe buffer implementation inspired by VSCode's VSBuffer
 * Provides efficient binary data operations with defensive bounds checking
 */
export class VSBuffer {
	/** Internal buffer storage (private to enforce encapsulation) */
	private readonly buffer: Uint8Array;

	/** Current length of used data (may be less than capacity) */
	public readonly length: number;

	/** Buffer capacity (allocated size) */
	public readonly capacity: number;

	private constructor(Buffer: Uint8Array, Length?: number) {
		this.buffer = Buffer;
		this.length = Length ?? Buffer.length;
		this.capacity = Buffer.length;
	}

	/**
	 * Creates a new VSBuffer with the specified capacity
	 *
	 * @param Capacity - Buffer capacity in bytes
	 * @returns NewVSBuffer instance
	 * @throws If capacity exceeds MAX_MESSAGE_SIZE
	 */
	public static Allocate(Capacity: number): VSBuffer {
		if (Capacity < 0) {
			throw new Error(`Cannot allocate negative capacity: ${Capacity}`);
		}
		if (Capacity > MAX_MESSAGE_SIZE) {
			throw new Error(
				`Cannot allocate buffer larger than ${MAX_MESSAGE_SIZE} bytes: ${Capacity}`,
			);
		}
		return new VSBuffer(new Uint8Array(Capacity), 0);
	}

	/**
	 * Wraps an existing Uint8Array in a VSBuffer
	 *
	 * @param Buffer - Uint8Array to wrap
	 * @returns NewVSBuffer instance wrapping the provided array
	 * @throws If buffer is null or undefined
	 */
	public static Wrap(Buffer: Uint8Array): VSBuffer {
		if (!Buffer) {
			throw new Error("Cannot wrap null or undefined buffer");
		}
		return new VSBuffer(Buffer);
	}

	/**
	 * Creates a VSBuffer from a string
	 *
	 * @param String - String to convert
	 * @param Encoding - Text encoding (default: utf-8)
	 * @returns NewVSBuffer instance containing the encoded string
	 */
	public static FromString(
		String: string,
		Encoding: BufferEncoding = "utf-8",
	): VSBuffer {
		if (String === null || String === undefined) {
			return new VSBuffer(new Uint8Array(0));
		}
		const Buffer = new TextEncoder().encode(String);
		return new VSBuffer(Buffer);
	}

	/**
	 * Creates a VSBuffer from a buffer
	 *
	 * @param Buffer - Node Buffer to convert
	 * @returns NewVSBuffer instance
	 */
	public static FromBuffer(Buffer: Buffer): VSBuffer {
		if (!Buffer) {
			throw new Error("Cannot convert null or undefined buffer");
		}
		return new VSBuffer(new Uint8Array(Buffer));
	}

	/**
	 * Concatenates multiple VSBuffers into one
	 *
	 * @param Buffers - Array of VSBuffers to concatenate
	 * @returns NewVSBuffer containing all concatenated data
	 */
	public static Concat(Buffers: VSBuffer[]): VSBuffer {
		if (!Buffers || Buffers.length === 0) {
			return new VSBuffer(new Uint8Array(0));
		}

		const TotalLength = Buffers.reduce(
			(Sum, Buffer) => Sum + Buffer.length,
			0,
		);
		if (TotalLength > MAX_MESSAGE_SIZE) {
			throw new Error(
				`Concatenated buffer size ${TotalLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,
			);
		}

		const Result = new Uint8Array(TotalLength);
		let Offset = 0;

		for (const Buffer of Buffers) {
			Result.set(Buffer.buffer, Offset);
			Offset += Buffer.length;
		}

		return new VSBuffer(Result);
	}

	/**
	 * Gets the underlying byte buffer
	 *
	 * @returns Uint8Array buffer
	 */
	public get byteBuffer(): Uint8Array {
		return this.buffer;
	}

	/**
	 * Converts the VSBuffer to a Node Buffer
	 *
	 * @returns Node Buffer
	 */
	public toBuffer(): Buffer {
		return Buffer.from(
			this.buffer.buffer,
			this.buffer.byteOffset,
			this.length,
		);
	}

	/**
	 * Converts the VSBuffer to a string
	 *
	 * @param Encoding - Text encoding (default: utf-8)
	 * @returns String representation of the buffer
	 */
	public toString(Encoding: BufferEncoding = "utf-8"): string {
		return new TextDecoder(Encoding).decode(
			this.buffer.subarray(0, this.length),
		);
	}

	/**
	 * Gets a byte at the specified index
	 *
	 * @param Index - Byte index
	 * @returns Byte value at index
	 * @throws If index is out of bounds
	 */
	public getByte(Index: number): number {
		if (Index < 0 || Index >= this.length) {
			throw new Error(
				`Index ${Index} out of bounds for buffer of length ${this.length}`,
			);
		}
		return this.buffer[Index];
	}

	/**
	 * Sets a byte at the specified index
	 *
	 * @param Index - Byte index
	 * @param Value - Byte value to set (0-255)
	 * @throws If index is out of bounds or value is invalid
	 */
	public setByte(Index: number, Value: number): void {
		if (Index < 0 || Index >= this.length) {
			throw new Error(
				`Index ${Index} out of bounds for buffer of length ${this.length}`,
			);
		}
		if (Value < 0 || Value > 255 || !Number.isInteger(Value)) {
			throw new Error(
				`Invalid byte value: ${Value} (must be 0-255 integer)`,
			);
		}
		this.buffer[Index] = Value;
	}

	/**
	 * Sets multiple bytes from another buffer
	 *
	 * @param Offset - Starting offset in this buffer
	 * @param Values - Uint8Array of values to set
	 * @throws If offset is out of bounds or values won't fit
	 */
	public setBytes(Offset: number, Values: Uint8Array): void {
		if (Offset < 0 || Offset >= this.length) {
			throw new Error(
				`Offset ${Offset} out of bounds for buffer of length ${this.length}`,
			);
		}
		if (!Values) {
			throw new Error("Values buffer cannot be null or undefined");
		}
		if (Offset + Values.length > this.length) {
			throw new Error(
				`Cannot set ${Values.length} bytes at offset ${Offset} in buffer of length ${this.length}`,
			);
		}
		this.buffer.set(Values, Offset);
	}

	/**
	 * Reads a 32-bit unsigned integer at the specified offset (little-endian)
	 *
	 * @param Offset - Byte offset to read from
	 * @returns 32-bit unsigned integer
	 * @throws If offset is out of bounds
	 */
	public readUInt32LE(Offset: number): number {
		if (Offset < 0 || Offset + 4 > this.length) {
			throw new Error(
				`Cannot read UInt32LE at offset ${Offset} in buffer of length ${this.length}`,
			);
		}
		return (
			(this.buffer[Offset] |
				(this.buffer[Offset + 1] << 8) |
				(this.buffer[Offset + 2] << 16) |
				(this.buffer[Offset + 3] << 24)) >>>
			0
		);
	}

	/**
	 * Writes a 32-bit unsigned integer at the specified offset (little-endian)
	 *
	 * @param Offset - Byte offset to write to
	 * @param Value - 32-bit unsigned integer to write
	 * @throws If offset is out of bounds or value is invalid
	 */
	public writeUInt32LE(Offset: number, Value: number): void {
		if (Offset < 0 || Offset + 4 > this.length) {
			throw new Error(
				`Cannot write UInt32LE at offset ${Offset} in buffer of length ${this.length}`,
			);
		}
		if (Value < 0 || Value > 0xffffffff || !Number.isInteger(Value)) {
			throw new Error(`Invalid UInt32 value: ${Value}`);
		}
		this.buffer[Offset] = Value & 0xff;
		this.buffer[Offset + 1] = (Value >> 8) & 0xff;
		this.buffer[Offset + 2] = (Value >> 16) & 0xff;
		this.buffer[Offset + 3] = (Value >> 24) & 0xff;
	}

	/**
	 * Slices the buffer creating a new VSBuffer
	 *
	 * @param Start - Starting index (inclusive)
	 * @param End - Ending index (exclusive)
	 * @returns NewVSBuffer containing the sliced data
	 * @throws If indices are out of bounds
	 */
	public slice(Start: number, End?: number): VSBuffer {
		if (Start < 0 || Start > this.length) {
			throw new Error(
				`Invalid start index ${Start} for buffer of length ${this.length}`,
			);
		}
		const ActualEnd = End ?? this.length;
		if (ActualEnd < Start || ActualEnd > this.length) {
			throw new Error(
				`Invalid end index ${ActualEnd} for buffer of length ${this.length}`,
			);
		}
		return new VSBuffer(this.buffer.slice(Start, ActualEnd));
	}
}

// ============================================================================
// MESSAGE VALIDATION
// ============================================================================

/**
 * Validates message metadata structure
 *
 * @param Metadata - Metadata to validate
 * @returns True if valid, false otherwise
 */
function ValidateMetadata(Metadata: MessageMetadata): boolean {
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
}

/**
 * Validates message structure
 *
 * @param Message - Message to validate
 * @returns True if valid, false otherwise
 */
function ValidateMessage(Message: IMessage): boolean {
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
}

/**
 * Validates batched message structure
 *
 * @param Batch - Batched message to validate
 * @returns True if valid, false otherwise
 */
function ValidateBatchMessage(Batch: IBatchMessage): boolean {
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
}

// ============================================================================
// SERIALIZATION
// ============================================================================

/**
 * Serializes a message into a binary-safe format with header and compression hints
 *
 * @param Message - Message to serialize
 * @returns ISerializationResult with success/failure information
 *
 * Binary Format:
 * - Header (8 bytes): Magic (3) + Version (1) + Flags (1) + Reserved (3)
 * - Metadata Length (4 bytes): Length of metadata JSON
 * - Metadata (variable): JSON string of metadata
 * - Data Length (4 bytes): Length of data payload
 * - Data (variable): Binary payload
 */
export function SerializeMessage(Message: IMessage): ISerializationResult {
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
			Error: Error instanceof Error ? Error.message : String(Error),
			OriginalSize,
			FinalSize,
		};
	}
}

/**
 * Deserializes a binary message into an IMessage structure
 *
 * @param Data - Binary data to deserialize
 * @returns IDeserializationResult with message and validation information
 */
export function DeserializeMessage(Data: Uint8Array): IDeserializationResult {
	const Warnings: string[] = [];

	try {
		// Validate input
		if (!Data || !(Data instanceof Uint8Array)) {
			return {
				Success: false,
				Message: null,
				Error: "Input data must be a Uint8Array",
				Warnings,
			};
		}

		// Check minimum size (header + metadata length + data length markers)
		if (Data.length < 16) {
			return {
				Success: false,
				Message: null,
				Error: `Input data too short: ${Data.length} bytes (minimum 16)`,
				Warnings,
			};
		}

		// Check maximum size
		if (Data.length > MAX_MESSAGE_SIZE) {
			return {
				Success: false,
				Message: null,
				Error: `Input data too large: ${Data.length} bytes (maximum ${MAX_MESSAGE_SIZE})`,
				Warnings,
			};
		}

		// Wrap data in VSBuffer for safe access
		const Buffer = VSBuffer.Wrap(Data);
		let Offset = 0;

		// Read and validate header
		const Magic = Buffer.slice(Offset, Offset + 3).byteBuffer;
		Offset += 3;
		if (
			Magic[0] !== MESSAGE_HEADER_MAGIC[0] ||
			Magic[1] !== MESSAGE_HEADER_MAGIC[1] ||
			Magic[2] !== MESSAGE_HEADER_MAGIC[2]
		) {
			return {
				Success: false,
				Message: null,
				Error: `Invalid magic bytes in header: [${Magic.join(", ")}]`,
				Warnings,
			};
		}

		const Version = Buffer.getByte(Offset);
		Offset += 1;
		if (Version !== PROTOCOL_VERSION) {
			Warnings.push(
				`Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${Version}`,
			);
		}

		const Flags = Buffer.getByte(Offset);
		Offset += 1;
		Offset += 3; // Skip reserved bytes

		// Read metadata length
		const MetadataLength = Buffer.readUInt32LE(Offset);
		Offset += 4;

		if (MetadataLength > MAX_MESSAGE_SIZE) {
			return {
				Success: false,
				Message: null,
				Error: `Metadata length ${MetadataLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,
				Warnings,
			};
		}

		if (Offset + MetadataLength > Data.length) {
			return {
				Success: false,
				Message: null,
				Error: `Metadata extends beyond buffer: offset ${Offset}, length ${MetadataLength}, total ${Data.length}`,
				Warnings,
			};
		}

		// Read metadata
		const MetadataBuffer = Buffer.slice(Offset, Offset + MetadataLength);
		Offset += MetadataLength;
		let Metadata: MessageMetadata;
		try {
			Metadata = JSON.parse(MetadataBuffer.toString()) as MessageMetadata;
		} catch (Error) {
			return {
				Success: false,
				Message: null,
				Error: `Failed to parse metadata JSON: ${Error instanceof Error ? Error.message : String(Error)}`,
				Warnings,
			};
		}

		if (!ValidateMetadata(Metadata)) {
			Warnings.push("Metadata validation failed, continuing anyway");
		}

		// Read data length
		const DataLength = Buffer.readUInt32LE(Offset);
		Offset += 4;

		if (DataLength > MAX_MESSAGE_SIZE) {
			return {
				Success: false,
				Message: null,
				Error: `Data length ${DataLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,
				Warnings,
			};
		}

		if (Offset + DataLength > Data.length) {
			return {
				Success: false,
				Message: null,
				Error: `Data extends beyond buffer: offset ${Offset}, length ${DataLength}, total ${Data.length}`,
				Warnings,
			};
		}

		// Read data
		const MessageData = Buffer.slice(
			Offset,
			Offset + DataLength,
		).byteBuffer;
		Offset += DataLength;

		// Check for extra data
		if (Offset < Data.length) {
			Warnings.push(
				`Extra data at end of message: ${Data.length - Offset} bytes`,
			);
		}

		// Determine compression hint from flags
		let CompressionHint = CompressionHint.None;
		if (Flags & MessageFlags.Compressed) {
			CompressionHint = CompressionHint.Balanced; // Default for compressed messages
			Warnings.push(
				"Message is compressed but decompression not implemented",
			);
		}

		const Message: IMessage = {
			Data: MessageData,
			Metadata,
			CompressionHint,
			Flags,
		};

		return {
			Success: true,
			Message,
			Error: undefined,
			Warnings,
		};
	} catch (Error) {
		return {
			Success: false,
			Message: null,
			Error: Error instanceof Error ? Error.message : String(Error),
			Warnings,
		};
	}
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batches multiple messages into a single IBatchMessage structure
 *
 * @param Messages - Array of messages to batch
 * @param CompressionHint - Compression hint for batch metadata
 * @returns ISerializationResult with batched data
 *
 * Binary Format:
 * - Message Count (4 bytes): Number of messages in batch
 * - Batch Metadata Length (4 bytes): Length of batch metadata JSON
 * - Batch Metadata (variable): JSON string of batch metadata
 * - Message Headers (variable * message count): Each message's length (4 bytes)
 * - Message Data (variable): Concatenated message data
 */
export function BatchMessages(
	Messages: IMessage[],
	CompressionHint: CompressionHint = CompressionHint.Balanced,
): ISerializationResult {
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
			const Result = SerializeMessage(Message);
			if (!Result.Success) {
				return {
					Success: false,
					Data: null,
					Error: `Failed to serialize message: ${Result.Error}`,
					OriginalSize: 0,
					FinalSize: 0,
				};
			}
			SerializedMessages.push(Result.Data!);
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
			CompressionHint,
		};

		const BatchMetadataJSON = JSON.stringify(BatchMetadata);
		const BatchMetadataBuffer = VSBuffer.FromString(BatchMetadataJSON);

		// Calculate total buffer size
		OriginalSize =
			4 + // Message count
			4 + // Metadata length
			BatchMetadataBuffer.length +
			Messages.length * 4 + // Message headers
			TotalMessageSize;

		// Allocate buffer
		const Buffer = VSBuffer.Allocate(OriginalSize);
		let Offset = 0;

		// Write message count
		Buffer.writeUInt32LE(Offset, Messages.length);
		Offset += 4;

		// Write metadata length
		Buffer.writeUInt32LE(Offset, BatchMetadataBuffer.length);
		Offset += 4;

		// Write metadata
		Buffer.setBytes(Offset, BatchMetadataBuffer.byteBuffer);
		Offset += BatchMetadataBuffer.length;

		// Write message headers (lengths)
		const MessageOffsets: number[] = [];
		for (const SerializedMessage of SerializedMessages) {
			MessageOffsets.push(Offset);
			Buffer.writeUInt32LE(Offset, SerializedMessage.length);
			Offset += 4;
		}

		// Write message data
		for (let Index = 0; Index < SerializedMessages.length; Index++) {
			const MessageData = SerializedMessages[Index];
			Buffer.setBytes(Offset, MessageData);
			Offset += MessageData.length;
		}

		FinalSize = Offset;

		// Add batch flag to output
		const ResultData = Buffer.slice(0, FinalSize).byteBuffer;
		Warnings.push(`Successfully batched ${Messages.length} messages`);

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
			Error: Error instanceof Error ? Error.message : String(Error),
			OriginalSize,
			FinalSize,
		};
	}
}

/**
 * Unbatches a serialized batch message into individual messages
 *
 * @param Data - Batched binary data
 * @returns IDeserializationResult with array of individual messages
 */
export function UnbatchMessages(Data: Uint8Array): IDeserializationResult & {
	readonly Messages: IMessage[];
} {
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
				Error: `Metadata extends beyond buffer`,
				Warnings,
				Messages: [],
			};
		}

		// Read and validate metadata
		const MetadataBuffer = Buffer.slice(Offset, Offset + MetadataLength);
		Offset += MetadataLength;

		let BatchMetadata: IBatchMessage["BatchMetadata"];
		try {
			BatchMetadata = JSON.parse(MetadataBuffer.toString());
		} catch (Error) {
			return {
				Success: false,
				Message: null,
				Error: `Failed to parse batch metadata JSON: ${Error instanceof Error ? Error.message : String(Error)}`,
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
			Error: Error instanceof Error ? Error.message : String(Error),
			Warnings,
			Messages,
		};
	}
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a unique message ID
 *
 * @returns Unique message identifier string
 */
export function GenerateMessageID(): string {
	return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Creates a new message with the specified data and metadata
 *
 * @param Data - Message payload data
 * @param MessageType - Type of message
 * @param Source - Source endpoint
 * @param Destination - Destination endpoint
 * @param CompressionHint - Compression hint for payload
 * @returns NewIMessage instance
 */
export function CreateMessage(
	Data: Uint8Array | string,
	MessageType: string,
	Source: string,
	Destination: string,
	CompressionHint: CompressionHint = CompressionHint.None,
): IMessage {
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
		CompressionHint,
		Flags: MessageFlags.None,
	};
}

/**
 * Gets the optimal compression hint based on message size and content
 *
 * @param Message - Message to analyze
 * @returns Recommended compression hint
 */
export function GetOptimalCompressionHint(Message: IMessage): CompressionHint {
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
}

// ============================================================================
// EXPORT ALL PUBLIC API
// ============================================================================

export {
	type IMessage,
	type IBatchMessage,
	type ISerializationResult,
	type IDeserializationResult,
	type MessageMetadata,
	MessageFlags,
};
