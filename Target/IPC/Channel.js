var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/IPC/Channel.ts
var MessagePriority = /* @__PURE__ */ ((MessagePriority2) => {
  MessagePriority2[MessagePriority2["Low"] = 0] = "Low";
  MessagePriority2[MessagePriority2["Normal"] = 1] = "Normal";
  MessagePriority2[MessagePriority2["High"] = 2] = "High";
  MessagePriority2[MessagePriority2["Critical"] = 3] = "Critical";
  return MessagePriority2;
})(MessagePriority || {});
var ChannelDirection = /* @__PURE__ */ ((ChannelDirection2) => {
  ChannelDirection2["SendOnly"] = "send-only";
  ChannelDirection2["ReceiveOnly"] = "receive-only";
  ChannelDirection2["Bidirectional"] = "bidirectional";
  return ChannelDirection2;
})(ChannelDirection || {});
var SystemComponent = /* @__PURE__ */ ((SystemComponent2) => {
  SystemComponent2["Mountain"] = "mountain";
  SystemComponent2["Wind"] = "wind";
  SystemComponent2["Sky"] = "sky";
  SystemComponent2["Grove"] = "grove";
  SystemComponent2["Air"] = "air";
  return SystemComponent2;
})(SystemComponent || {});
var DeliveryStatus = /* @__PURE__ */ ((DeliveryStatus2) => {
  DeliveryStatus2["Queued"] = "queued";
  DeliveryStatus2["Pending"] = "pending";
  DeliveryStatus2["Delivered"] = "delivered";
  DeliveryStatus2["Failed"] = "failed";
  DeliveryStatus2["Timeout"] = "timeout";
  return DeliveryStatus2;
})(DeliveryStatus || {});
var DEFAULT_MAX_MESSAGE_SIZE = 1024 * 1024;
var DEFAULT_MAX_PENDING = 1e3;
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_RATE_LIMIT = 0;
var MAX_CHANNEL_NAME_LENGTH = 128;
var CHANNEL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
var MESSAGE_ID_PREFIX = "msg";
var CORRELATION_ID_PREFIX = "corr";
var DELIVERY_ID_PREFIX = "delv";
var CHANNEL_ID_PREFIX = "chan";
var ChannelRegistry = class {
  static {
    __name(this, "ChannelRegistry");
  }
  /** Map of channel name to channel configuration */
  channels = /* @__PURE__ */ new Map();
  /** Map of correlation ID to pending requests */
  pendingRequests = /* @__PURE__ */ new Map();
  /** Registry statistics */
  stats = {
    totalChannels: 0,
    totalMessages: 0,
    totalErrors: 0
  };
  /**
   * Register a new RPC channel.
   * @param options Channel configuration options
   * @throws {Error} If channel name is invalid or already exists
   */
  RegisterChannel(options) {
    if (!options.name) {
      throw new Error("Channel name cannot be empty");
    }
    if (options.name.length > MAX_CHANNEL_NAME_LENGTH) {
      throw new Error(
        `Channel name exceeds maximum length of ${MAX_CHANNEL_NAME_LENGTH}`
      );
    }
    if (!CHANNEL_NAME_PATTERN.test(options.name)) {
      throw new Error(
        "Channel name must contain only alphanumeric characters, hyphens, and underscores"
      );
    }
    if (this.channels.has(options.name)) {
      throw new Error(`Channel '${options.name}' is already registered`);
    }
    const channel = {
      id: this.GenerateChannelId(options.name),
      name: options.name,
      direction: options.direction,
      maxMessageSize: options.maxMessageSize || DEFAULT_MAX_MESSAGE_SIZE,
      maxPending: options.maxPending || DEFAULT_MAX_PENDING,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      requireAuth: options.requireAuth || false,
      rateLimit: options.rateLimit || DEFAULT_RATE_LIMIT,
      validator: options.validator || this.DefaultMessageValidator,
      handlers: /* @__PURE__ */ new Map(),
      queue: [],
      active: true,
      createdAt: Date.now(),
      metrics: {
        sentCount: 0,
        receivedCount: 0,
        errorCount: 0,
        queueSize: 0,
        lastActivity: Date.now(),
        totalLatency: 0,
        messagesProcessed: 0,
        messagesByPriority: {
          [0 /* Low */]: 0,
          [1 /* Normal */]: 0,
          [2 /* High */]: 0,
          [3 /* Critical */]: 0
        }
      }
    };
    this.channels.set(options.name, channel);
    this.stats.totalChannels++;
  }
  /**
   * Unregister a channel and clean up its resources.
   * @param name Channel name to unregister
   * @returns true if channel was unregistered, false if not found
   */
  UnregisterChannel(name) {
    const channel = this.channels.get(name);
    if (!channel) {
      return false;
    }
    channel.active = false;
    for (const [correlationId, pending] of this.pendingRequests) {
      if (pending.channel === name) {
        clearTimeout(pending.timeoutHandle);
        this.pendingRequests.delete(correlationId);
      }
    }
    this.channels.delete(name);
    this.stats.totalChannels--;
    return true;
  }
  /**
   * Get channel by name.
   * @param name Channel name
   * @returns Registered channel or undefined if not found
   */
  GetChannel(name) {
    return this.channels.get(name);
  }
  /**
   * Check if a channel exists.
   * @param name Channel name
   * @returns true if channel exists
   */
  HasChannel(name) {
    return this.channels.has(name);
  }
  /**
   * Get all channel names.
   * @returns Array of channel names
   */
  GetAllChannelNames() {
    return Array.from(this.channels.keys());
  }
  /**
   * Get all channel states.
   * @returns Array of channel states
   */
  GetAllChannelStates() {
    const states = [];
    for (const channel of this.channels.values()) {
      states.push(this.ExtractChannelState(channel));
    }
    return states;
  }
  /**
   * Get registry statistics.
   * @returns Registry statistics object
   */
  GetStatistics() {
    return { ...this.stats };
  }
  /**
   * Clear all channels (for testing/shutdown).
   */
  ClearAll() {
    for (const name of this.channels.keys()) {
      this.UnregisterChannel(name);
    }
    this.stats.totalChannels = 0;
    this.stats.totalMessages = 0;
    this.stats.totalErrors = 0;
  }
  /**
   * Generate unique channel identifier.
   * @param name Channel name
   * @returns Unique channel ID
   */
  GenerateChannelId(name) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${CHANNEL_ID_PREFIX}-${name}-${timestamp}-${random}`;
  }
  /**
   * Default message validator.
   * @param message Message to validate
   * @returns true if message is valid
   */
  DefaultMessageValidator(message) {
    if (!message.id || typeof message.id !== "string") {
      return false;
    }
    if (!message.channel || typeof message.channel !== "string") {
      return false;
    }
    if (!message.from || !Object.values(SystemComponent).includes(message.from)) {
      return false;
    }
    return true;
  }
  /**
   * Extract channel state from registered channel.
   * @param channel Registered channel
   * @returns Channel state
   */
  ExtractChannelState(channel) {
    const avgLatency = channel.metrics.messagesProcessed > 0 ? channel.metrics.totalLatency / channel.metrics.messagesProcessed : 0;
    return {
      name: channel.name,
      active: channel.active,
      queueSize: channel.queue.length,
      sentCount: channel.metrics.sentCount,
      receivedCount: channel.metrics.receivedCount,
      errorCount: channel.metrics.errorCount,
      lastActivity: channel.metrics.lastActivity,
      averageLatency: Math.round(avgLatency * 100) / 100
    };
  }
};
var ChannelManager = class {
  static {
    __name(this, "ChannelManager");
  }
  /** Channel registry instance */
  registry;
  /** Current system component */
  component;
  /** Active delivery tracking */
  deliveries = /* @__PURE__ */ new Map();
  /** Message history for debugging (limited size) */
  messageHistory = [];
  /** Maximum message history length */
  maxHistoryLength;
  /**
   * Create a new ChannelManager instance.
   * @param component The system component this manager represents
   * @param options Optional configuration options
   */
  constructor(component, options = {}) {
    this.component = component;
    this.registry = new ChannelRegistry();
    this.maxHistoryLength = options.maxHistoryLength || 1e3;
  }
  /**
   * Create and register a new communication channel.
   * @param options Channel configuration options
   * @returns Channel identifier
   * @throws {Error} If channel configuration is invalid
   */
  CreateChannel(options) {
    this.registry.RegisterChannel(options);
    const channel = this.registry.GetChannel(options.name);
    return channel.id;
  }
  /**
   * Route a message to the appropriate channel and handler.
   * @param message Message to route
   * @returns Delivery result
   */
  async RouteMessage(message) {
    const startTime = Date.now();
    const deliveryId = this.GenerateDeliveryId();
    try {
      if (!this.ValidateMessageStructure(message)) {
        this.AddToHistory(message);
        return {
          status: "failed" /* Failed */,
          latency: Date.now() - startTime,
          error: "Invalid message structure",
          messageId: message.id
        };
      }
      const channel = this.registry.GetChannel(message.channel);
      if (!channel) {
        this.AddToHistory(message);
        return {
          status: "failed" /* Failed */,
          latency: Date.now() - startTime,
          error: `Channel '${message.channel}' not found`,
          messageId: message.id
        };
      }
      if (!channel.active) {
        this.AddToHistory(message);
        return {
          status: "failed" /* Failed */,
          latency: Date.now() - startTime,
          error: `Channel '${message.channel}' is inactive`,
          messageId: message.id
        };
      }
      if (!channel.validator(message)) {
        this.AddToHistory(message);
        channel.metrics.errorCount++;
        return {
          status: "failed" /* Failed */,
          latency: Date.now() - startTime,
          error: "Message validation failed",
          messageId: message.id
        };
      }
      if (channel.rateLimit > 0 && !this.CheckRateLimit(channel)) {
        this.AddToHistory(message);
        return {
          status: "failed" /* Failed */,
          latency: Date.now() - startTime,
          error: "Rate limit exceeded",
          messageId: message.id
        };
      }
      if (channel.queue.length >= channel.maxPending) {
        this.AddToHistory(message);
        return {
          status: "failed" /* Failed */,
          latency: Date.now() - startTime,
          error: "Channel queue full",
          messageId: message.id
        };
      }
      const context = {
        channel: message.channel,
        component: this.component,
        deliveryId,
        originalTimestamp: message.timestamp
      };
      channel.metrics.receivedCount++;
      channel.metrics.queueSize = channel.queue.length;
      channel.metrics.lastActivity = Date.now();
      channel.metrics.messagesByPriority[message.priority]++;
      const result = await this.ProcessMessage(message, channel, context);
      const latency = Date.now() - startTime;
      this.TrackDelivery(deliveryId, message.id, context.channel, {
        status: result ? "delivered" /* Delivered */ : "failed" /* Failed */,
        latency,
        timestamp: Date.now()
      });
      this.AddToHistory(message);
      return {
        status: result ? "delivered" /* Delivered */ : "failed" /* Failed */,
        latency,
        messageId: message.id
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        status: "failed" /* Failed */,
        latency,
        error: errorMessage,
        messageId: message.id
      };
    }
  }
  /**
   * Register a message handler for a specific channel.
   * @param channelName Channel name
   * @param messageType Message type to handle
   * @param handler Handler function
   */
  RegisterHandler(channelName, messageType, handler) {
    const channel = this.registry.GetChannel(channelName);
    if (!channel) {
      throw new Error(`Channel '${channelName}' not found`);
    }
    const key = `${channelName}:${messageType}`;
    channel.handlers.set(key, handler);
  }
  /**
   * Unregister a message handler.
   * @param channelName Channel name
   * @param messageType Message type
   */
  UnregisterHandler(channelName, messageType) {
    const channel = this.registry.GetChannel(channelName);
    if (!channel) {
      return;
    }
    const key = `${channelName}:${messageType}`;
    channel.handlers.delete(key);
  }
  /**
   * Get channel manager statistics.
   * @returns Channel manager statistics
   */
  GetStatistics() {
    return {
      channels: this.registry.GetAllChannelNames().length,
      messages: this.registry.GetStatistics().totalMessages,
      errors: this.registry.GetStatistics().totalErrors,
      pendingDeliveries: this.deliveries.size
    };
  }
  /**
   * Get message history.
   * @param limit Maximum number of messages to return
   * @returns Array of messages
   */
  GetMessageHistory(limit = 100) {
    return this.messageHistory.slice(-limit);
  }
  /**
   * Clear message history.
   */
  ClearMessageHistory() {
    this.messageHistory = [];
  }
  /**
   * Shutdown the channel manager and cleanup resources.
   */
  Shutdown() {
    this.registry.ClearAll();
    this.deliveries.clear();
    this.messageHistory = [];
  }
  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================
  /**
   * Validate message structure.
   * @param message Message to validate
   * @returns true if valid
   */
  ValidateMessageStructure(message) {
    if (!message) {
      return false;
    }
    if (!message.id || typeof message.id !== "string") {
      return false;
    }
    if (!message.channel || typeof message.channel !== "string") {
      return false;
    }
    if (!message.from || !Object.values(SystemComponent).includes(message.from)) {
      return false;
    }
    if (!message.timestamp || typeof message.timestamp !== "number") {
      return false;
    }
    if (message.priority === void 0 || message.priority === null) {
      return false;
    }
    return true;
  }
  /**
   * Check if rate limit allows processing.
   * @param channel Channel to check
   * @returns true if rate limit allows
   */
  CheckRateLimit(_channel) {
    return true;
  }
  /**
   * Process a message through its handler.
   * @param message Message to process
   * @param channel Target channel
   * @param context Message context
   * @returns Processing result
   */
  async ProcessMessage(message, channel, context) {
    try {
      const key = `${channel.name}:${message.type}`;
      const handler = channel.handlers.get(key);
      if (handler) {
        await handler(message, context);
        channel.metrics.messagesProcessed++;
        return true;
      } else {
        return true;
      }
    } catch (error) {
      channel.metrics.errorCount++;
      console.error(`Error processing message:`, error);
      return false;
    }
  }
  /**
   * Track message delivery.
   * @param deliveryId Delivery tracking ID
   * @param messageId Original message ID
   * @param channel Channel name
   * @param result Delivery result
   */
  TrackDelivery(deliveryId, messageId, channel, result) {
    this.deliveries.set(deliveryId, {
      ...result,
      messageId,
      channel
    });
    const now = Date.now();
    for (const [id, delivery] of this.deliveries) {
      if (now - delivery.timestamp > 36e5) {
        this.deliveries.delete(id);
      }
    }
  }
  /**
   * Add message to history.
   * @param message Message to add
   */
  AddToHistory(message) {
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistoryLength) {
      this.messageHistory.shift();
    }
  }
  /**
   * Generate unique delivery ID.
   * @returns Delivery ID
   */
  GenerateDeliveryId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${DELIVERY_ID_PREFIX}-${timestamp}-${random}`;
  }
};
function GenerateMessageId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${MESSAGE_ID_PREFIX}-${timestamp}-${random}`;
}
__name(GenerateMessageId, "GenerateMessageId");
function GenerateCorrelationId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${CORRELATION_ID_PREFIX}-${timestamp}-${random}`;
}
__name(GenerateCorrelationId, "GenerateCorrelationId");
function CreateRequestMessage(params) {
  return {
    id: params.id || GenerateMessageId(),
    type: "request",
    channel: params.channel,
    from: params.from,
    to: params.to,
    payload: params.payload,
    priority: params.priority || 1 /* Normal */,
    timestamp: params.timestamp || Date.now(),
    correlationId: params.correlationId || GenerateCorrelationId(),
    timeout: params.timeout,
    headers: params.headers
  };
}
__name(CreateRequestMessage, "CreateRequestMessage");
function CreateResponseMessage(params) {
  return {
    id: params.id || GenerateMessageId(),
    type: "response",
    channel: params.channel,
    from: params.from,
    to: params.to,
    correlationId: params.correlationId,
    success: params.success,
    data: params.data,
    error: params.error,
    priority: params.priority || 1 /* Normal */,
    timestamp: params.timestamp || Date.now(),
    headers: params.headers
  };
}
__name(CreateResponseMessage, "CreateResponseMessage");
function CreateEventMessage(params) {
  return {
    id: params.id || GenerateMessageId(),
    type: "event",
    channel: params.channel,
    from: params.from,
    to: params.to || [],
    // Empty array for broadcast
    payload: params.payload,
    priority: params.priority || 1 /* Normal */,
    timestamp: params.timestamp || Date.now(),
    headers: params.headers
  };
}
__name(CreateEventMessage, "CreateEventMessage");
export {
  ChannelDirection,
  ChannelManager,
  ChannelRegistry,
  CreateEventMessage,
  CreateRequestMessage,
  CreateResponseMessage,
  DeliveryStatus,
  GenerateCorrelationId,
  GenerateMessageId,
  MessagePriority,
  SystemComponent
};
//# sourceMappingURL=Channel.js.map
