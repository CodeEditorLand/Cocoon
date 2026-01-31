/**
 * @fileoverview
 * Multi-Channel RPC System Management with Advanced Message Routing
 *
 * @description
 * This module provides a robust, type-safe inter-process communication (IPC) infrastructure
 * for the CodeEditorLand ecosystem. It manages RPC channels, message routing, and
 * communication between Mountain (Rust backend), Wind (TypeScript frontend), and Sky (monitoring).
 *
 * Architecture Overview:
 * ----------------------
 * The channel system implements a publish-subscribe pattern with RPC capabilities:
 * - **Mountain**: Rust-based backend (Tauri) providing core services
 * - **Wind**: TypeScript-based VSCode-compatible frontend workbench
 * - **Sky**: TypeScript-based monitoring and orchestration layer
 *
 * Channel Types:
 * - **Command Channels**: Request-response style RPC calls
 * - **Event Channels**: Fire-and-forget notifications
 * - **Stream Channels**: Continuous data streams (e.g., file changes)
 * - **Sync Channels**: Bidirectional synchronization channels
 *
 * Key Features:
 * --------------
 * - Multi-channel concurrent message routing
 * - Type-safe message serialization/deserialization
 * - Automatic channel registration and discovery
 * - Message validation and error handling
 * - Connection health monitoring and recovery
 * - Performance metrics and telemetry
 * - Priority-based message queuing
 * - Message delivery acknowledgments
 *
 * Security Considerations:
 * ------------------------
 * - Channel permission validation
 * - Message size limits
 * - Rate limiting per channel
 * - Origin/destination validation
 * - Message encryption support (via Tauri)
 *
 * Microsoft VSCode Source References:
 * -----------------------------------
 * - /Dependency/Microsoft/Dependency/Editor/src/vs/base/parts/ipc/common/ipc.ts
 *   Base IPC channel implementation
 * - /Dependency/Microsoft/Dependency/Editor/src/vs/platform/ipc/common/ipc.ts
 *   Platform-specific IPC extensions
 * - /Dependency/Microsoft/Dependency/Editor/src/vs/workbench/services/extensions/common/rpcProtocol.ts
 *   RPC protocol for extension communication
 * - /Dependency/Microsoft/Dependency/Editor/src/vs/base/common/event.ts
 *   Event emitter patterns used in channel communication
 *
 * @module Channel
 */
/**
 * Priority levels for message ordering in channels.
 * Higher priority messages are processed first.
 */
export declare enum MessagePriority {
    /** Low priority - background tasks, telemetry */
    Low = 0,
    /** Normal priority - standard operations */
    Normal = 1,
    /** High priority - user-facing operations */
    High = 2,
    /** Critical priority - system-critical operations */
    Critical = 3
}
/**
 * Communication directions for channels.
 */
export declare enum ChannelDirection {
    /** Send-only channel (command/event dispatch) */
    SendOnly = "send-only",
    /** Receive-only channel (event subscription) */
    ReceiveOnly = "receive-only",
    /** Bidirectional channel (RPC/dialog) */
    Bidirectional = "bidirectional"
}
/**
 * System component identifiers for cross-component communication.
 */
export declare enum SystemComponent {
    /** Mountain - Rust backend with Tauri */
    Mountain = "mountain",
    /** Wind - TypeScript VSCode-compatible frontend */
    Wind = "wind",
    /** Sky - Monitoring and orchestration layer */
    Sky = "sky",
    /** Grove - Plugin and extension system */
    Grove = "grove",
    /** Air - Core services and utilities */
    Air = "air"
}
/**
 * Message delivery status tracking.
 */
export declare enum DeliveryStatus {
    /** Message queued but not yet sent */
    Queued = "queued",
    /** Message sent and awaiting acknowledgment */
    Pending = "pending",
    /** Message successfully delivered */
    Delivered = "delivered",
    /** Message delivery failed */
    Failed = "failed",
    /** Message timed out */
    Timeout = "timeout"
}
/**
 * Base message structure with common metadata.
 */
export interface BaseMessage {
    /** Unique message identifier */
    id: string;
    /** Source component */
    from: SystemComponent;
    /** Destination component (empty for broadcast) */
    to: SystemComponent | SystemComponent[];
    /** Channel name for routing */
    channel: string;
    /** Message timestamp */
    timestamp: number;
    /** Message correlation ID for request-response tracking */
    correlationId?: string;
    /** Message priority */
    priority: MessagePriority;
    /** Expiration timestamp (0 for no expiration) */
    expiresAt?: number;
    /** Custom headers for message metadata */
    headers?: Record<string, string>;
}
/**
 * Request message for RPC-style communication.
 */
export interface RequestMessage extends BaseMessage {
    type: 'request';
    /** Request payload (any serializable data) */
    payload: unknown;
    /** Expected timeout in milliseconds */
    timeout?: number;
}
/**
 * Response message for RPC request-reply pattern.
 */
export interface ResponseMessage extends BaseMessage {
    type: 'response';
    /** Whether the request was successful */
    success: boolean;
    /** Response data (if successful) */
    data?: unknown;
    /** Error details (if failed) */
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
/**
 * Event message for fire-and-forget notifications.
 */
export interface EventMessage extends BaseMessage {
    type: 'event';
    /** Event payload */
    payload: unknown;
}
/**
 * Union type for all message types.
 */
export type IPCMessage = RequestMessage | ResponseMessage | EventMessage;
/**
 * Message handler function signature.
 */
export type MessageHandler<T = unknown> = (message: IPCMessage, context: MessageContext) => Promise<T> | T;
/**
 * Context information passed to message handlers.
 */
export interface MessageContext {
    /** Channel that received the message */
    channel: string;
    /** Component handling the message */
    component: SystemComponent;
    /** Message delivery tracking ID */
    deliveryId: string;
    /** Original timestamp for latency calculation */
    originalTimestamp: number;
}
/**
 * Channel configuration options.
 */
export interface ChannelOptions {
    /** Channel name (required) */
    name: string;
    /** Channel direction */
    direction: ChannelDirection;
    /** Maximum message size in bytes (default: 1MB) */
    maxMessageSize?: number;
    /** Maximum pending messages (default: 1000) */
    maxPending?: number;
    /** Message timeout in milliseconds (default: 30000) */
    timeout?: number;
    /** Whether to require authentication (default: false) */
    requireAuth?: boolean;
    /** Rate limit messages per second (0 for no limit) */
    rateLimit?: number;
    /** Custom validation function */
    validator?: (message: IPCMessage) => boolean;
}
/**
 * Channel state information.
 */
export interface ChannelState {
    /** Channel name */
    name: string;
    /** Whether the channel is active */
    active: boolean;
    /** Current message count in queue */
    queueSize: number;
    /** Total messages sent */
    sentCount: number;
    /** Total messages received */
    receivedCount: number;
    /** Total errors encountered */
    errorCount: number;
    /** Last activity timestamp */
    lastActivity: number;
    /** Average latency in milliseconds */
    averageLatency: number;
}
/**
 * Channel statistics for monitoring.
 */
export interface ChannelStatistics extends ChannelState {
    /** Messages by priority */
    messagesByPriority: Record<MessagePriority, number>;
    /** Messages by delivery status */
    messagesByStatus: Record<DeliveryStatus, number>;
    /** Peak concurrent messages */
    peakConcurrentMessages: number;
    /** Uptime in milliseconds */
    uptime: number;
}
/**
 * Message delivery result.
 */
export interface DeliveryResult {
    /** Status of the delivery attempt */
    status: DeliveryStatus;
    /** Time taken in milliseconds */
    latency: number;
    /** Error message if failed */
    error?: string;
    /** Message ID for tracking */
    messageId: string;
}
/**
 * ChannelRegistry manages all registered RPC channels and their handlers.
 * Provides thread-safe channel registration, lookup, and lifecycle management.
 */
export declare class ChannelRegistry {
    /** Map of channel name to channel configuration */
    private channels;
    /** Map of correlation ID to pending requests */
    private pendingRequests;
    /** Registry statistics */
    private stats;
    /**
     * Register a new RPC channel.
     * @param options Channel configuration options
     * @throws {Error} If channel name is invalid or already exists
     */
    RegisterChannel(options: ChannelOptions): void;
    /**
     * Unregister a channel and clean up its resources.
     * @param name Channel name to unregister
     * @returns true if channel was unregistered, false if not found
     */
    UnregisterChannel(name: string): boolean;
    /**
     * Get channel by name.
     * @param name Channel name
     * @returns Registered channel or undefined if not found
     */
    GetChannel(name: string): RegisteredChannel | undefined;
    /**
     * Check if a channel exists.
     * @param name Channel name
     * @returns true if channel exists
     */
    HasChannel(name: string): boolean;
    /**
     * Get all channel names.
     * @returns Array of channel names
     */
    GetAllChannelNames(): string[];
    /**
     * Get all channel states.
     * @returns Array of channel states
     */
    GetAllChannelStates(): ChannelState[];
    /**
     * Get registry statistics.
     * @returns Registry statistics object
     */
    GetStatistics(): typeof ChannelRegistry.prototype.stats;
    /**
     * Clear all channels (for testing/shutdown).
     */
    ClearAll(): void;
    /**
     * Generate unique channel identifier.
     * @param name Channel name
     * @returns Unique channel ID
     */
    private GenerateChannelId;
    /**
     * Default message validator.
     * @param message Message to validate
     * @returns true if message is valid
     */
    private DefaultMessageValidator;
    /**
     * Extract channel state from registered channel.
     * @param channel Registered channel
     * @returns Channel state
     */
    private ExtractChannelState;
}
/**
 * ChannelManager manages the entire multi-channel RPC system.
 * Handles message routing, channel lifecycle, and inter-component communication.
 */
export declare class ChannelManager {
    /** Channel registry instance */
    private registry;
    /** Current system component */
    private component;
    /** Active delivery tracking */
    private deliveries;
    /** Message history for debugging (limited size) */
    private messageHistory;
    /** Maximum message history length */
    private maxHistoryLength;
    /**
     * Create a new ChannelManager instance.
     * @param component The system component this manager represents
     * @param options Optional configuration options
     */
    constructor(component: SystemComponent, options?: {
        maxHistoryLength?: number;
    });
    /**
     * Create and register a new communication channel.
     * @param options Channel configuration options
     * @returns Channel identifier
     * @throws {Error} If channel configuration is invalid
     */
    CreateChannel(options: ChannelOptions): string;
    /**
     * Route a message to the appropriate channel and handler.
     * @param message Message to route
     * @returns Delivery result
     */
    RouteMessage(message: IPCMessage): Promise<DeliveryResult>;
    /**
     * Register a message handler for a specific channel.
     * @param channelName Channel name
     * @param messageType Message type to handle
     * @param handler Handler function
     */
    RegisterHandler(channelName: string, messageType: 'request' | 'response' | 'event', handler: MessageHandler): void;
    /**
     * Unregister a message handler.
     * @param channelName Channel name
     * @param messageType Message type
     */
    UnregisterHandler(channelName: string, messageType: 'request' | 'response' | 'event'): void;
    /**
     * Get channel manager statistics.
     * @returns Channel manager statistics
     */
    GetStatistics(): {
        channels: number;
        messages: number;
        errors: number;
        pendingDeliveries: number;
    };
    /**
     * Get message history.
     * @param limit Maximum number of messages to return
     * @returns Array of messages
     */
    GetMessageHistory(limit?: number): IPCMessage[];
    /**
     * Clear message history.
     */
    ClearMessageHistory(): void;
    /**
     * Shutdown the channel manager and cleanup resources.
     */
    Shutdown(): void;
    /**
     * Validate message structure.
     * @param message Message to validate
     * @returns true if valid
     */
    private ValidateMessageStructure;
    /**
     * Check if rate limit allows processing.
     * @param channel Channel to check
     * @returns true if rate limit allows
     */
    private CheckRateLimit;
    /**
     * Process a message through its handler.
     * @param message Message to process
     * @param channel Target channel
     * @param context Message context
     * @returns Processing result
     */
    private ProcessMessage;
    /**
     * Track message delivery.
     * @param deliveryId Delivery tracking ID
     * @param messageId Original message ID
     * @param channel Channel name
     * @param result Delivery result
     */
    private TrackDelivery;
    /**
     * Add message to history.
     * @param message Message to add
     */
    private AddToHistory;
    /**
     * Generate unique delivery ID.
     * @returns Delivery ID
     */
    private GenerateDeliveryId;
}
/**
 * Generate a unique message identifier.
 * @returns Message ID
 */
export declare function GenerateMessageId(): string;
/**
 * Generate a unique correlation ID for request-response tracking.
 * @returns Correlation ID
 */
export declare function GenerateCorrelationId(): string;
/**
 * Create a request message.
 * @param params Request parameters
 * @returns Request message
 */
export declare function CreateRequestMessage(params: {
    channel: string;
    from: SystemComponent;
    to: SystemComponent | SystemComponent[];
    payload: unknown;
    priority?: MessagePriority;
    timeout?: number;
    correlationId?: string;
    headers?: Record<string, string>;
} & Partial<BaseMessage>): RequestMessage;
/**
 * Create a response message.
 * @param params Response parameters
 * @returns Response message
 */
export declare function CreateResponseMessage(params: {
    channel: string;
    from: SystemComponent;
    to: SystemComponent | SystemComponent[];
    correlationId: string;
    success: boolean;
    data?: unknown;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
    priority?: MessagePriority;
    headers?: Record<string, string>;
} & Partial<BaseMessage>): ResponseMessage;
/**
 * Create an event message.
 * @param params Event parameters
 * @returns Event message
 */
export declare function CreateEventMessage(params: {
    channel: string;
    from: SystemComponent;
    to?: SystemComponent | SystemComponent[];
    payload: unknown;
    priority?: MessagePriority;
    headers?: Record<string, string>;
} & Partial<BaseMessage>): EventMessage;
/**
 * Registered channel with handlers and metrics.
 */
interface RegisteredChannel {
    /** Unique channel identifier */
    id: string;
    /** Channel name */
    name: string;
    /** Communication direction */
    direction: ChannelDirection;
    /** Maximum message size */
    maxMessageSize: number;
    /** Maximum pending messages */
    maxPending: number;
    /** Default timeout */
    timeout: number;
    /** Whether authentication is required */
    requireAuth: boolean;
    /** Rate limit (messages per second) */
    rateLimit: number;
    /** Message validator function */
    validator: (message: IPCMessage) => boolean;
    /** Message handlers map */
    handlers: Map<string, MessageHandler>;
    /** Message queue */
    queue: IPCMessage[];
    /** Whether channel is active */
    active: boolean;
    /** Creation timestamp */
    createdAt: number;
    /** Channel metrics */
    metrics: {
        sentCount: number;
        receivedCount: number;
        errorCount: number;
        queueSize: number;
        lastActivity: number;
        totalLatency: number;
        messagesProcessed: number;
        messagesByPriority: Record<MessagePriority, number>;
    };
}
export {};
//# sourceMappingURL=Channel.d.ts.map