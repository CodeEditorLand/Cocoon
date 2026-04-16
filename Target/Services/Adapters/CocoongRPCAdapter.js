var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Adapters/CocoongRPCAdapter.ts
var CocoongRPCAdapter = class {
  constructor(mountainClient) {
    this.mountainClient = mountainClient;
    console.log("[CocoongRPCAdapter] Initialized Spine Adapter");
  }
  mountainClient;
  static {
    __name(this, "CocoongRPCAdapter");
  }
  _onMessageCallback = null;
  /**
   * Called by IPCService when it wants to send a message to Mountain.
   * We interpret the buffer, wrap it in a Vine GenericRequest, and ship it via gRPC.
   */
  send(buffer) {
    try {
      const message = JSON.parse(buffer.toString());
      if (message.type === "request" || message.type === "call") {
        this.forwardRequestToMountain(message);
      } else if (message.type === "response") {
        console.log(
          "[CocoongRPCAdapter] Dropping outbound response (not implemented):",
          message
        );
      }
    } catch (error) {
      console.error(
        "[CocoongRPCAdapter] Failed to forward message:",
        error
      );
    }
  }
  /**
   * Subscribe to incoming messages (from Mountain -> Cocoon)
   */
  onMessage(callback) {
    this._onMessageCallback = callback;
  }
  /**
   * Internal: Forward the parsed IPC message to Mountain via gRPC
   */
  async forwardRequestToMountain(ipcMessage) {
    const vineMethod = `${ipcMessage.channel}.${ipcMessage.command}`;
    try {
      console.log(
        `[CocoongRPCAdapter]\u2001Forwarding ${vineMethod} to Spine...`
      );
      const result = await this.mountainClient.sendRequest(
        vineMethod,
        ipcMessage.arg
        // Pass arguments directly
      );
      const responseMessage = {
        type: "response",
        messageId: ipcMessage.messageId,
        success: true,
        result
      };
      if (this._onMessageCallback) {
        const responseBuffer = {
          buffer: Buffer.from(JSON.stringify(responseMessage)),
          byteLength: 0,
          // Mock
          toString: /* @__PURE__ */ __name(() => JSON.stringify(responseMessage), "toString"),
          slice: /* @__PURE__ */ __name(() => ({}), "slice")
        };
        this._onMessageCallback(responseBuffer);
      }
    } catch (error) {
      console.error(
        `[CocoongRPCAdapter]\u2001Spine call failed: ${vineMethod}`,
        error
      );
      const errorMessage = {
        type: "response",
        messageId: ipcMessage.messageId,
        success: false,
        error: error.message || "Unknown Spine Error"
      };
      if (this._onMessageCallback) {
        const errorBuffer = {
          buffer: Buffer.from(JSON.stringify(errorMessage)),
          toString: /* @__PURE__ */ __name(() => JSON.stringify(errorMessage), "toString")
        };
        this._onMessageCallback(errorBuffer);
      }
    }
  }
};
export {
  CocoongRPCAdapter
};
//# sourceMappingURL=CocoongRPCAdapter.js.map
