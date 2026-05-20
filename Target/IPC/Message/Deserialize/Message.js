var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/IPC/Message/Constants.ts
var MAX_MESSAGE_SIZE = 10 * 1024 * 1024;
var MAX_BATCH_SIZE = 50 * 1024 * 1024;
var MAX_BATCH_COUNT = 1e3;
var MESSAGE_HEADER_MAGIC = Buffer.from([77, 78, 84]);
var PROTOCOL_VERSION = 1;
var DEFAULT_BUFFER_SIZE = 4096;
var COMPRESSION_THRESHOLD = 1024;
var MessageFlags = /* @__PURE__ */ ((MessageFlags2) => {
  MessageFlags2[MessageFlags2["None"] = 0] = "None";
  MessageFlags2[MessageFlags2["Compressed"] = 1] = "Compressed";
  MessageFlags2[MessageFlags2["Batched"] = 2] = "Batched";
  MessageFlags2[MessageFlags2["Binary"] = 4] = "Binary";
  MessageFlags2[MessageFlags2["Encrypted"] = 8] = "Encrypted";
  MessageFlags2[MessageFlags2["Priority"] = 16] = "Priority";
  return MessageFlags2;
})(MessageFlags || {});
var Constants_default = {};

// Source/IPC/Message/Types.ts
var CompressionHint = /* @__PURE__ */ ((CompressionHint2) => {
  CompressionHint2["None"] = "none";
  CompressionHint2["Fast"] = "fast";
  CompressionHint2["Balanced"] = "balanced";
  CompressionHint2["Maximum"] = "maximum";
  return CompressionHint2;
})(CompressionHint || {});
var Types_default = {};

// Source/IPC/Message/Validation.ts
var ValidateMetadata = /* @__PURE__ */ __name((Metadata) => {
  if (!Metadata) {
    return false;
  }
  if (typeof Metadata.MessageID !== "string" || Metadata.MessageID.length === 0) {
    return false;
  }
  if (typeof Metadata.Source !== "string" || Metadata.Source.length === 0) {
    return false;
  }
  if (typeof Metadata.Destination !== "string" || Metadata.Destination.length === 0) {
    return false;
  }
  if (typeof Metadata.Timestamp !== "number" || Metadata.Timestamp <= 0) {
    return false;
  }
  if (typeof Metadata.MessageType !== "string" || Metadata.MessageType.length === 0) {
    return false;
  }
  return true;
}, "ValidateMetadata");
var ValidateMessage = /* @__PURE__ */ __name((Message) => {
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
}, "ValidateMessage");
var ValidateBatchMessage = /* @__PURE__ */ __name((Batch) => {
  if (!Batch) {
    return false;
  }
  if (!Array.isArray(Batch.Messages) || Batch.Messages.length === 0) {
    return false;
  }
  if (!Batch.BatchMetadata) {
    return false;
  }
  if (typeof Batch.BatchMetadata.BatchID !== "string" || Batch.BatchMetadata.BatchID.length === 0) {
    return false;
  }
  if (typeof Batch.BatchMetadata.MessageCount !== "number" || Batch.BatchMetadata.MessageCount <= 0) {
    return false;
  }
  if (Batch.BatchMetadata.MessageCount > MAX_BATCH_COUNT) {
    return false;
  }
  if (typeof Batch.BatchMetadata.TotalSize !== "number" || Batch.BatchMetadata.TotalSize <= 0) {
    return false;
  }
  if (Batch.BatchMetadata.TotalSize > MAX_BATCH_SIZE) {
    return false;
  }
  if (typeof Batch.BatchMetadata.Timestamp !== "number" || Batch.BatchMetadata.Timestamp <= 0) {
    return false;
  }
  for (const Message of Batch.Messages) {
    if (!ValidateMessage(Message)) {
      return false;
    }
  }
  return true;
}, "ValidateBatchMessage");
var Validation_default = { ValidateMetadata, ValidateMessage, ValidateBatchMessage };

// Source/IPC/Message/VSBuffer.ts
var VSBuffer = class _VSBuffer {
  static {
    __name(this, "VSBuffer");
  }
  /** Internal buffer storage (private to enforce encapsulation) */
  buffer;
  /** Current length of used data (may be less than capacity) */
  length;
  /** Buffer capacity (allocated size) */
  capacity;
  constructor(Buffer2, Length) {
    this.buffer = Buffer2;
    this.length = Length ?? Buffer2.length;
    this.capacity = Buffer2.length;
  }
  /**
   * Creates a new VSBuffer with the specified capacity
   *
   * @param Capacity - Buffer capacity in bytes
   * @returns New VSBuffer instance
   * @throws If capacity exceeds MAX_MESSAGE_SIZE
   */
  static Allocate(Capacity) {
    if (Capacity < 0) {
      throw new Error(`Cannot allocate negative capacity: ${Capacity}`);
    }
    if (Capacity > MAX_MESSAGE_SIZE) {
      throw new Error(
        `Cannot allocate buffer larger than ${MAX_MESSAGE_SIZE} bytes: ${Capacity}`
      );
    }
    return new _VSBuffer(new Uint8Array(Capacity), 0);
  }
  /**
   * Wraps an existing Uint8Array in a VSBuffer
   *
   * @param Buffer - Uint8Array to wrap
   * @returns New VSBuffer instance wrapping the provided array
   * @throws If buffer is null or undefined
   */
  static Wrap(Buffer2) {
    if (!Buffer2) {
      throw new Error("Cannot wrap null or undefined buffer");
    }
    return new _VSBuffer(Buffer2);
  }
  /**
   * Creates a VSBuffer from a string
   *
   * @param String - String to convert
   * @param Encoding - Text encoding (default: utf-8)
   * @returns New VSBuffer instance containing the encoded string
   */
  static FromString(String2, _Encoding = "utf-8") {
    if (String2 === null || String2 === void 0) {
      return new _VSBuffer(new Uint8Array(0));
    }
    const Buffer2 = new TextEncoder().encode(String2);
    return new _VSBuffer(Buffer2);
  }
  /**
   * Creates a VSBuffer from a buffer
   *
   * @param Buffer - Node Buffer to convert
   * @returns New VSBuffer instance
   */
  static FromBuffer(Buffer2) {
    if (!Buffer2) {
      throw new Error("Cannot convert null or undefined buffer");
    }
    return new _VSBuffer(new Uint8Array(Buffer2));
  }
  /**
   * Concatenates multiple VSBuffers into one
   *
   * @param Buffers - Array of VSBuffers to concatenate
   * @returns New VSBuffer containing all concatenated data
   */
  static Concat(Buffers) {
    if (!Buffers || Buffers.length === 0) {
      return new _VSBuffer(new Uint8Array(0));
    }
    const TotalLength = Buffers.reduce(
      (Sum, Buffer2) => Sum + Buffer2.length,
      0
    );
    if (TotalLength > MAX_MESSAGE_SIZE) {
      throw new Error(
        `Concatenated buffer size ${TotalLength} exceeds maximum ${MAX_MESSAGE_SIZE}`
      );
    }
    const Result = new Uint8Array(TotalLength);
    let Offset = 0;
    for (const Buffer2 of Buffers) {
      Result.set(Buffer2.buffer, Offset);
      Offset += Buffer2.length;
    }
    return new _VSBuffer(Result);
  }
  /**
   * Gets the underlying byte buffer
   *
   * @returns Uint8Array buffer
   */
  get byteBuffer() {
    return this.buffer;
  }
  /**
   * Converts the VSBuffer to a Node Buffer
   *
   * @returns Node Buffer
   */
  toBuffer() {
    return Buffer.from(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.length
    );
  }
  /**
   * Converts the VSBuffer to a string
   *
   * @param Encoding - Text encoding (default: utf-8)
   * @returns String representation of the buffer
   */
  toString(Encoding = "utf-8") {
    return new TextDecoder(Encoding).decode(
      this.buffer.subarray(0, this.length)
    );
  }
  /**
   * Gets a byte at the specified index
   *
   * @param Index - Byte index
   * @returns Byte value at index
   * @throws If index is out of bounds
   */
  getByte(Index) {
    if (Index < 0 || Index >= this.length) {
      throw new Error(
        `Index ${Index} out of bounds for buffer of length ${this.length}`
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
  setByte(Index, Value) {
    if (Index < 0 || Index >= this.length) {
      throw new Error(
        `Index ${Index} out of bounds for buffer of length ${this.length}`
      );
    }
    if (Value < 0 || Value > 255 || !Number.isInteger(Value)) {
      throw new Error(
        `Invalid byte value: ${Value} (must be 0-255 integer)`
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
  setBytes(Offset, Values) {
    if (Offset < 0 || Offset >= this.length) {
      throw new Error(
        `Offset ${Offset} out of bounds for buffer of length ${this.length}`
      );
    }
    if (!Values) {
      throw new Error("Values buffer cannot be null or undefined");
    }
    if (Offset + Values.length > this.length) {
      throw new Error(
        `Cannot set ${Values.length} bytes at offset ${Offset} in buffer of length ${this.length}`
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
  readUInt32LE(Offset) {
    if (Offset < 0 || Offset + 4 > this.length) {
      throw new Error(
        `Cannot read UInt32LE at offset ${Offset} in buffer of length ${this.length}`
      );
    }
    return (this.buffer[Offset] | this.buffer[Offset + 1] << 8 | this.buffer[Offset + 2] << 16 | this.buffer[Offset + 3] << 24) >>> 0;
  }
  /**
   * Writes a 32-bit unsigned integer at the specified offset (little-endian)
   *
   * @param Offset - Byte offset to write to
   * @param Value - 32-bit unsigned integer to write
   * @throws If offset is out of bounds or value is invalid
   */
  writeUInt32LE(Offset, Value) {
    if (Offset < 0 || Offset + 4 > this.length) {
      throw new Error(
        `Cannot write UInt32LE at offset ${Offset} in buffer of length ${this.length}`
      );
    }
    if (Value < 0 || Value > 4294967295 || !Number.isInteger(Value)) {
      throw new Error(`Invalid UInt32 value: ${Value}`);
    }
    this.buffer[Offset] = Value & 255;
    this.buffer[Offset + 1] = Value >> 8 & 255;
    this.buffer[Offset + 2] = Value >> 16 & 255;
    this.buffer[Offset + 3] = Value >> 24 & 255;
  }
  /**
   * Slices the buffer creating a new VSBuffer
   *
   * @param Start - Starting index (inclusive)
   * @param End - Ending index (exclusive)
   * @returns New VSBuffer containing the sliced data
   * @throws If indices are out of bounds
   */
  slice(Start, End) {
    if (Start < 0 || Start > this.length) {
      throw new Error(
        `Invalid start index ${Start} for buffer of length ${this.length}`
      );
    }
    const ActualEnd = End ?? this.length;
    if (ActualEnd < Start || ActualEnd > this.length) {
      throw new Error(
        `Invalid end index ${ActualEnd} for buffer of length ${this.length}`
      );
    }
    return new _VSBuffer(this.buffer.slice(Start, ActualEnd));
  }
};

// Source/IPC/Message/Deserialize/Message.ts
var Message_default = /* @__PURE__ */ __name((Data) => {
  const Warnings = [];
  try {
    if (!Data || !(Data instanceof Uint8Array)) {
      return {
        Success: false,
        Message: null,
        Error: "Input data must be a Uint8Array",
        Warnings
      };
    }
    if (Data.length < 16) {
      return {
        Success: false,
        Message: null,
        Error: `Input data too short: ${Data.length} bytes (minimum 16)`,
        Warnings
      };
    }
    if (Data.length > MAX_MESSAGE_SIZE) {
      return {
        Success: false,
        Message: null,
        Error: `Input data too large: ${Data.length} bytes (maximum ${MAX_MESSAGE_SIZE})`,
        Warnings
      };
    }
    const Buffer2 = VSBuffer.Wrap(Data);
    let Offset = 0;
    const Magic = Buffer2.slice(Offset, Offset + 3).byteBuffer;
    Offset += 3;
    if (Magic[0] !== MESSAGE_HEADER_MAGIC[0] || Magic[1] !== MESSAGE_HEADER_MAGIC[1] || Magic[2] !== MESSAGE_HEADER_MAGIC[2]) {
      return {
        Success: false,
        Message: null,
        Error: `Invalid magic bytes in header: [${Magic.join(", ")}]`,
        Warnings
      };
    }
    const Version = Buffer2.getByte(Offset);
    Offset += 1;
    if (Version !== PROTOCOL_VERSION) {
      Warnings.push(
        `Protocol version mismatch: expected ${PROTOCOL_VERSION}, got ${Version}`
      );
    }
    const Flags = Buffer2.getByte(Offset);
    Offset += 1;
    Offset += 3;
    const MetadataLength = Buffer2.readUInt32LE(Offset);
    Offset += 4;
    if (MetadataLength > MAX_MESSAGE_SIZE) {
      return {
        Success: false,
        Message: null,
        Error: `Metadata length ${MetadataLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,
        Warnings
      };
    }
    if (Offset + MetadataLength > Data.length) {
      return {
        Success: false,
        Message: null,
        Error: `Metadata extends beyond buffer: offset ${Offset}, length ${MetadataLength}, total ${Data.length}`,
        Warnings
      };
    }
    const MetadataBuffer = Buffer2.slice(Offset, Offset + MetadataLength);
    Offset += MetadataLength;
    let Metadata;
    try {
      Metadata = JSON.parse(MetadataBuffer.toString());
    } catch (Error2) {
      return {
        Success: false,
        Message: null,
        Error: `Failed to parse metadata JSON: ${Error2 instanceof globalThis.Error ? Error2.message : String(Error2)}`,
        Warnings
      };
    }
    if (!ValidateMetadata(Metadata)) {
      Warnings.push("Metadata validation failed, continuing anyway");
    }
    const DataLength = Buffer2.readUInt32LE(Offset);
    Offset += 4;
    if (DataLength > MAX_MESSAGE_SIZE) {
      return {
        Success: false,
        Message: null,
        Error: `Data length ${DataLength} exceeds maximum ${MAX_MESSAGE_SIZE}`,
        Warnings
      };
    }
    if (Offset + DataLength > Data.length) {
      return {
        Success: false,
        Message: null,
        Error: `Data extends beyond buffer: offset ${Offset}, length ${DataLength}, total ${Data.length}`,
        Warnings
      };
    }
    const MessageData = Buffer2.slice(
      Offset,
      Offset + DataLength
    ).byteBuffer;
    Offset += DataLength;
    if (Offset < Data.length) {
      Warnings.push(
        `Extra data at end of message: ${Data.length - Offset} bytes`
      );
    }
    let Hint = "none" /* None */;
    if (Flags & 1 /* Compressed */) {
      Hint = "balanced" /* Balanced */;
      Warnings.push(
        "Message is compressed but decompression not implemented"
      );
    }
    const Message = {
      Data: MessageData,
      Metadata,
      CompressionHint: Hint,
      Flags
    };
    return {
      Success: true,
      Message,
      Error: void 0,
      Warnings
    };
  } catch (Error2) {
    return {
      Success: false,
      Message: null,
      Error: Error2 instanceof globalThis.Error ? Error2.message : String(Error2),
      Warnings
    };
  }
}, "default");
export {
  Message_default as default
};
//# sourceMappingURL=Message.js.map
