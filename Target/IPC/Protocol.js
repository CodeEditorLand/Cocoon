var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/IPC/Protocol.ts
var ProtocolMessageType = /* @__PURE__ */ ((ProtocolMessageType2) => {
  ProtocolMessageType2["Request"] = "request";
  ProtocolMessageType2["Response"] = "response";
  ProtocolMessageType2["Notification"] = "notification";
  return ProtocolMessageType2;
})(ProtocolMessageType || {});
var DEFAULT_PROTOCOL_OPTIONS = {
  Timeout: 3e4,
  MaxMessageSize: 10485760,
  // 10MB
  EnableCompression: false,
  EnableEncryption: false
};
function CreateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
__name(CreateRequestId, "CreateRequestId");
function GetMessageType(message) {
  if ("Id" in message && "Channel" in message && "Method" in message) {
    return "request" /* Request */;
  }
  if ("Id" in message && "Success" in message) {
    return "response" /* Response */;
  }
  if ("Channel" in message && "Type" in message && !("Id" in message)) {
    return "notification" /* Notification */;
  }
  throw new Error("Invalid IPC protocol message");
}
__name(GetMessageType, "GetMessageType");
function ValidateMessage(message) {
  if (typeof message !== "object" || message === null) {
    return false;
  }
  const msg = message;
  if ("Channel" in msg && "Method" in msg && "Parameters" in msg) {
    return typeof msg.Channel === "string" && typeof msg.Method === "string" && Array.isArray(msg.Parameters) && "Id" in msg && typeof msg.Id === "string";
  }
  if ("Id" in msg && "Success" in msg) {
    return typeof msg.Id === "string" && typeof msg.Success === "boolean";
  }
  if ("Channel" in msg && "Type" in msg && !("Id" in msg)) {
    return typeof msg.Channel === "string" && typeof msg.Type === "string";
  }
  return false;
}
__name(ValidateMessage, "ValidateMessage");
function WrapMessage(message) {
  return {
    Type: GetMessageType(message),
    Message: message
  };
}
__name(WrapMessage, "WrapMessage");
function UnwrapMessage(envelope) {
  return envelope.Message;
}
__name(UnwrapMessage, "UnwrapMessage");
function CreateErrorResponse(id, message, code) {
  return {
    Id: id,
    Success: false,
    ErrorMessage: message,
    ErrorCode: code
  };
}
__name(CreateErrorResponse, "CreateErrorResponse");
function CreateSuccessResponse(id, data) {
  return {
    Id: id,
    Success: true,
    Data: data
  };
}
__name(CreateSuccessResponse, "CreateSuccessResponse");
function SerializeMessage(message) {
  const json = JSON.stringify(message);
  return VSBuffer.fromString(json);
}
__name(SerializeMessage, "SerializeMessage");
function DeserializeMessage(buffer) {
  try {
    const json = buffer.toString();
    const message = JSON.parse(json);
    if (!ValidateMessage(message.Message)) {
      throw new Error("Invalid message structure");
    }
    return message;
  } catch (error) {
    throw new Error(
      `Failed to deserialize IPC message: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
__name(DeserializeMessage, "DeserializeMessage");
function IsRequest(message) {
  return "Id" in message && "Channel" in message && "Method" in message && "Parameters" in message && !("Success" in message);
}
__name(IsRequest, "IsRequest");
function IsResponse(message) {
  return "Id" in message && "Success" in message && !("Method" in message) && !("Channel" in message);
}
__name(IsResponse, "IsResponse");
function IsNotification(message) {
  return "Channel" in message && "Type" in message && !("Id" in message) && !("Success" in message);
}
__name(IsNotification, "IsNotification");
export {
  CreateErrorResponse,
  CreateRequestId,
  CreateSuccessResponse,
  DEFAULT_PROTOCOL_OPTIONS,
  DeserializeMessage,
  GetMessageType,
  IsNotification,
  IsRequest,
  IsResponse,
  ProtocolMessageType,
  SerializeMessage,
  UnwrapMessage,
  ValidateMessage,
  WrapMessage
};
//# sourceMappingURL=Protocol.js.map
