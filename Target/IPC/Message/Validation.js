var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/IPC/Message/Types.ts
var CompressionHint = /* @__PURE__ */ ((CompressionHint2) => {
  CompressionHint2["None"] = "none";
  CompressionHint2["Fast"] = "fast";
  CompressionHint2["Balanced"] = "balanced";
  CompressionHint2["Maximum"] = "maximum";
  return CompressionHint2;
})(CompressionHint || {});
var Types_default = {};

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
export {
  ValidateBatchMessage,
  ValidateMessage,
  ValidateMetadata,
  Validation_default as default
};
//# sourceMappingURL=Validation.js.map
