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
/** Message flags enumeration */
declare enum MessageFlags {
    None = 0,
    Compressed = 1,
    Batched = 2,
    Binary = 4,
    Encrypted = 8,
    Priority = 16
}
/**
 * Compression hint types for optimizing message payloads
 */
export declare enum CompressionHint {
    /** No compression recommended */
    None = "none",
    /** Use fast compression (speed optimized) */
    Fast = "fast",
    /** Use balanced compression (default) */
    Balanced = "balanced",
    /** Use maximum compression (size optimized) */
    Maximum = "maximum"
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
/**
 * Binary-safe buffer implementation inspired by VSCode's VSBuffer
 * Provides efficient binary data operations with defensive bounds checking
 */
export declare class VSBuffer {
    /** Internal buffer storage (private to enforce encapsulation) */
    private readonly buffer;
    /** Current length of used data (may be less than capacity) */
    readonly length: number;
    /** Buffer capacity (allocated size) */
    readonly capacity: number;
    private constructor();
    /**
     * Creates a new VSBuffer with the specified capacity
     *
     * @param Capacity - Buffer capacity in bytes
     * @returns NewVSBuffer instance
     * @throws If capacity exceeds MAX_MESSAGE_SIZE
     */
    static Allocate(Capacity: number): VSBuffer;
    /**
     * Wraps an existing Uint8Array in a VSBuffer
     *
     * @param Buffer - Uint8Array to wrap
     * @returns NewVSBuffer instance wrapping the provided array
     * @throws If buffer is null or undefined
     */
    static Wrap(Buffer: Uint8Array): VSBuffer;
    /**
     * Creates a VSBuffer from a string
     *
     * @param String - String to convert
     * @param Encoding - Text encoding (default: utf-8)
     * @returns NewVSBuffer instance containing the encoded string
     */
    static FromString(String: string, Encoding?: BufferEncoding): VSBuffer;
    /**
     * Creates a VSBuffer from a buffer
     *
     * @param Buffer - Node Buffer to convert
     * @returns NewVSBuffer instance
     */
    static FromBuffer(Buffer: Buffer): VSBuffer;
    /**
     * Concatenates multiple VSBuffers into one
     *
     * @param Buffers - Array of VSBuffers to concatenate
     * @returns NewVSBuffer containing all concatenated data
     */
    static Concat(Buffers: VSBuffer[]): VSBuffer;
    /**
     * Gets the underlying byte buffer
     *
     * @returns Uint8Array buffer
     */
    get byteBuffer(): Uint8Array;
    /**
     * Converts the VSBuffer to a Node Buffer
     *
     * @returns Node Buffer
     */
    toBuffer(): Buffer;
    /**
     * Converts the VSBuffer to a string
     *
     * @param Encoding - Text encoding (default: utf-8)
     * @returns String representation of the buffer
     */
    toString(Encoding?: BufferEncoding): string;
    /**
     * Gets a byte at the specified index
     *
     * @param Index - Byte index
     * @returns Byte value at index
     * @throws If index is out of bounds
     */
    getByte(Index: number): number;
    /**
     * Sets a byte at the specified index
     *
     * @param Index - Byte index
     * @param Value - Byte value to set (0-255)
     * @throws If index is out of bounds or value is invalid
     */
    setByte(Index: number, Value: number): void;
    /**
     * Sets multiple bytes from another buffer
     *
     * @param Offset - Starting offset in this buffer
     * @param Values - Uint8Array of values to set
     * @throws If offset is out of bounds or values won't fit
     */
    setBytes(Offset: number, Values: Uint8Array): void;
    /**
     * Reads a 32-bit unsigned integer at the specified offset (little-endian)
     *
     * @param Offset - Byte offset to read from
     * @returns 32-bit unsigned integer
     * @throws If offset is out of bounds
     */
    readUInt32LE(Offset: number): number;
    /**
     * Writes a 32-bit unsigned integer at the specified offset (little-endian)
     *
     * @param Offset - Byte offset to write to
     * @param Value - 32-bit unsigned integer to write
     * @throws If offset is out of bounds or value is invalid
     */
    writeUInt32LE(Offset: number, Value: number): void;
    /**
     * Slices the buffer creating a new VSBuffer
     *
     * @param Start - Starting index (inclusive)
     * @param End - Ending index (exclusive)
     * @returns NewVSBuffer containing the sliced data
     * @throws If indices are out of bounds
     */
    slice(Start: number, End?: number): VSBuffer;
}
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
export declare function SerializeMessage(Message: IMessage): ISerializationResult;
/**
 * Deserializes a binary message into an IMessage structure
 *
 * @param Data - Binary data to deserialize
 * @returns IDeserializationResult with message and validation information
 */
export declare function DeserializeMessage(Data: Uint8Array): IDeserializationResult;
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
export declare function BatchMessages(Messages: IMessage[], CompressionHint?: CompressionHint): ISerializationResult;
/**
 * Unbatches a serialized batch message into individual messages
 *
 * @param Data - Batched binary data
 * @returns IDeserializationResult with array of individual messages
 */
export declare function UnbatchMessages(Data: Uint8Array): IDeserializationResult & {
    readonly Messages: IMessage[];
};
/**
 * Generates a unique message ID
 *
 * @returns Unique message identifier string
 */
export declare function GenerateMessageID(): string;
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
export declare function CreateMessage(Data: Uint8Array | string, MessageType: string, Source: string, Destination: string, CompressionHint?: CompressionHint): IMessage;
/**
 * Gets the optimal compression hint based on message size and content
 *
 * @param Message - Message to analyze
 * @returns Recommended compression hint
 */
export declare function GetOptimalCompressionHint(Message: IMessage): CompressionHint;
export { VSBuffer, type IMessage, type IBatchMessage, type ISerializationResult, type IDeserializationResult, type MessageMetadata, MessageFlags, };
//# sourceMappingURL=Message.d.ts.map