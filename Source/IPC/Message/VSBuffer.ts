/**
 * @module Message/VSBuffer
 * @description
 * Binary-safe buffer implementation inspired by VSCode's VSBuffer.
 * Provides efficient binary data operations with defensive bounds checking.
 */

import { MAX_MESSAGE_SIZE } from "./Constants.js";

// ============================================================================
// VSBuffer IMPLEMENTATION
// ============================================================================

/**
 * Binary-safe buffer implementation inspired by VSCode's VSBuffer
 * Provides efficient binary data operations with defensive bounds checking
 */
export default class VSBuffer {
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
	 * @returns New VSBuffer instance
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
	 * @returns New VSBuffer instance wrapping the provided array
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
	 * @returns New VSBuffer instance containing the encoded string
	 */
	public static FromString(
		String: string,

		_Encoding: BufferEncoding = "utf-8",
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
	 * @returns New VSBuffer instance
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
	 * @returns New VSBuffer containing all concatenated data
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
			(this.buffer[Offset]! |
				(this.buffer[Offset + 1]! << 8) |
				(this.buffer[Offset + 2]! << 16) |
				(this.buffer[Offset + 3]! << 24)) >>>
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
	 * @returns New VSBuffer containing the sliced data
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
