var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Interfaces/IIPCService.ts
import { Context } from "effect";
var IIPCService = Context.Tag("IIPCService");

// Source/Services/IPCService.ts
import { Effect, Layer } from "effect";
var CocoonVSBuffer = class _CocoonVSBuffer {
  constructor(_buffer) {
    this._buffer = _buffer;
  }
  _buffer;
  static {
    __name(this, "CocoonVSBuffer");
  }
  get buffer() {
    return this._buffer;
  }
  get byteLength() {
    return this._buffer.byteLength;
  }
  toString() {
    return new TextDecoder().decode(this._buffer);
  }
  slice(start, end) {
    return new _CocoonVSBuffer(this._buffer.slice(start, end));
  }
  static fromString(data) {
    return new _CocoonVSBuffer(new TextEncoder().encode(data));
  }
  static wrap(buffer) {
    return new _CocoonVSBuffer(buffer);
  }
};
var CocoonMessagePassingProtocol = class {
  constructor(_sendCallback) {
    this._sendCallback = _sendCallback;
  }
  _sendCallback;
  static {
    __name(this, "CocoonMessagePassingProtocol");
  }
  _onMessage = new Emitter();
  onMessage = this._onMessage.event;
  send(buffer) {
    if (this._sendCallback) {
      this._sendCallback(buffer);
    }
  }
  // Internal method for simulating message reception
  simulateMessage(buffer) {
    this._onMessage.fire(buffer);
  }
};
var IPCService = class {
  static {
    __name(this, "IPCService");
  }
  _serviceBrand;
  _protocol = null;
  _channels = /* @__PURE__ */ new Map();
  _isConnected = false;
  _connectionStartTime = 0;
  _messageCount = 0;
  _errorCount = 0;
  _lastPing = 0;
  _latencySamples = [];
  // Channel client for making requests
  _channelClient = null;
  constructor() {
    this._serviceBrand = void 0;
    console.log("[IPCService] Initializing advanced IPC service");
  }
  /**
   * Initialize IPC service with protocol
   */
  async initialize(protocol) {
    console.log("[IPCService] Initializing with protocol");
    this._protocol = protocol;
    protocol.onMessage((buffer) => {
      this._handleMessage(buffer);
    });
    await this._establishConnection();
    this._isConnected = true;
    this._connectionStartTime = Date.now();
    this._lastPing = Date.now();
    console.log("[IPCService] Advanced IPC service initialized");
  }
  /**
   * Establish connection with Mountain
   */
  async _establishConnection() {
    console.log("[IPCService] Establishing connection with Mountain");
    const handshakeBuffer = CocoonVSBuffer.fromString(
      JSON.stringify({
        type: "handshake",
        timestamp: Date.now(),
        version: "1.0.0"
      })
    );
    this._protocol.send(handshakeBuffer);
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Handshake timeout"));
      }, 5e3);
      const handler = this._protocol.onMessage((buffer) => {
        try {
          const data = JSON.parse(buffer.toString());
          if (data.type === "handshake-response") {
            clearTimeout(timeout);
            resolve(buffer);
          }
        } catch (error) {
        }
      });
    });
    console.log("[IPCService] Connection established with Mountain");
  }
  /**
   * Get channel for specific service
   */
  getChannel(channelName) {
    return {
      call: /* @__PURE__ */ __name(async (command, arg, cancellationToken) => {
        if (!this._isConnected) {
          throw new Error("Not connected to Mountain");
        }
        const startTime = Date.now();
        try {
          const message = {
            type: "call",
            channel: channelName,
            command,
            arg,
            timestamp: startTime,
            messageId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          };
          const buffer = CocoonVSBuffer.fromString(
            JSON.stringify(message)
          );
          this._protocol.send(buffer);
          this._messageCount++;
          const response = await this._waitForResponse(
            message.messageId,
            cancellationToken
          );
          const latency = Date.now() - startTime;
          this._latencySamples.push(latency);
          return response;
        } catch (error) {
          this._errorCount++;
          throw error;
        }
      }, "call"),
      listen: /* @__PURE__ */ __name((event, arg) => {
        const emitter = new Emitter();
        return emitter.event;
      }, "listen")
    };
  }
  /**
   * Register server channel for handling requests
   */
  registerChannel(channelName, channel) {
    console.log(`[IPCService] Registering channel: ${channelName}`);
    this._channels.set(channelName, channel);
  }
  /**
   * Wait for response with cancellation support
   */
  async _waitForResponse(messageId, cancellationToken) {
    return new Promise((resolve, reject) => {
      if (cancellationToken?.isCancellationRequested) {
        reject(new Error("Request cancelled"));
        return;
      }
      const timeout = setTimeout(() => {
        reject(new Error("Response timeout"));
      }, 3e4);
      const handler = this._protocol.onMessage((buffer) => {
        try {
          const data = JSON.parse(buffer.toString());
          if (data.messageId === messageId) {
            clearTimeout(timeout);
            if (data.success) {
              resolve(data.result);
            } else {
              reject(new Error(data.error || "Request failed"));
            }
          }
        } catch (error) {
        }
      });
      if (cancellationToken) {
        cancellationToken.onCancellationRequested(() => {
          clearTimeout(timeout);
          reject(new Error("Request cancelled"));
        });
      }
    });
  }
  /**
   * Handle incoming messages
   */
  _handleMessage(buffer) {
    try {
      const data = JSON.parse(buffer.toString());
      if (data.type === "handshake-response") {
        console.log("[IPCService] Received handshake response");
        return;
      }
      if (data.type === "call" && data.channel) {
        this._handleCall(data);
        return;
      }
      console.log("[IPCService] Unhandled message type:", data.type);
    } catch (error) {
      console.error("[IPCService] Failed to handle message:", error);
    }
  }
  /**
   * Handle incoming call requests
   */
  async _handleCall(data) {
    const channel = this._channels.get(data.channel);
    if (!channel) {
      console.error(`[IPCService] Channel not found: ${data.channel}`);
      return;
    }
    try {
      const result = await channel.call(data.command, data.arg);
      const response = {
        type: "response",
        messageId: data.messageId,
        success: true,
        result,
        timestamp: Date.now()
      };
      const buffer = CocoonVSBuffer.fromString(JSON.stringify(response));
      this._protocol.send(buffer);
    } catch (error) {
      const response = {
        type: "response",
        messageId: data.messageId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
      const buffer = CocoonVSBuffer.fromString(JSON.stringify(response));
      this._protocol.send(buffer);
    }
  }
  /**
   * Get connection status
   */
  getConnectionStatus() {
    const now = Date.now();
    const connectionUptime = this._isConnected ? now - this._connectionStartTime : 0;
    const averageLatency = this._latencySamples.length > 0 ? this._latencySamples.reduce((a, b) => a + b, 0) / this._latencySamples.length : void 0;
    return {
      connected: this._isConnected,
      lastPing: this._lastPing,
      errorCount: this._errorCount,
      connectionUptime,
      messageCount: this._messageCount,
      averageLatency
    };
  }
  /**
   * Reconnect to Mountain
   */
  async reconnect() {
    console.log("[IPCService] Reconnecting to Mountain");
    await this.dispose();
    if (this._protocol) {
      await this.initialize(this._protocol);
    }
    console.log("[IPCService] Reconnected to Mountain");
  }
  /**
   * Cleanup IPC service
   */
  dispose() {
    console.log("[IPCService] Disposing IPC service");
    this._isConnected = false;
    this._channels.clear();
    this._protocol = null;
    this._channelClient = null;
    console.log("[IPCService] IPC service disposed");
  }
};
var IPCServiceLayer = Layer.effect(
  IIPCService,
  Effect.sync(() => new IPCService())
);
var IPCServiceLive = Layer.effect(
  IIPCService,
  Effect.sync(() => new IPCService())
);
export {
  CocoonMessagePassingProtocol,
  IPCService,
  IPCServiceLayer,
  IPCServiceLive
};
//# sourceMappingURL=IPCService.js.map
