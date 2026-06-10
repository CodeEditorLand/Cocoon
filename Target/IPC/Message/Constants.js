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
export {
  COMPRESSION_THRESHOLD,
  DEFAULT_BUFFER_SIZE,
  MAX_BATCH_COUNT,
  MAX_BATCH_SIZE,
  MAX_MESSAGE_SIZE,
  MESSAGE_HEADER_MAGIC,
  MessageFlags,
  PROTOCOL_VERSION,
  Constants_default as default
};
//# sourceMappingURL=Constants.js.map
