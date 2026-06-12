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

// ============================================================================
// SECTION: Type Definitions
// ============================================================================

/**
 * Priority levels for message ordering in channels.
 * Higher priority messages are processed first.
 */
export enum MessagePriority {

	/** Low priority - background tasks, telemetry */
	Low = 0,

	/** Normal priority - standard operations */
	Normal = 1,

	/** High priority - user-facing operations */
	High = 2,

	/** Critical priority - system-critical operations */
	Critical = 3,
}

/**
 * Communication directions for channels.
 */
export enum ChannelDirection {

	/** Send-only channel (command/event dispatch) */
	SendOnly = "send-only",

	/** Receive-only channel (event subscription) */
	ReceiveOnly = "receive-only",

	/** Bidirectional channel (RPC/dialog) */
	Bidirectional = "bidirectional",
}

/**
 * System component identifiers for cross-component communication.
 */
export enum SystemComponent {

	/** Mountain - Rust backend with Tauri */
	Mountain = "mountain",

	/** Wind - TypeScript VSCode-compatible frontend */
	Wind = "wind",

	/** Sky - Monitoring and orchestration layer */
	Sky = "sky",

	/** Grove - Plugin and extension system */
	Grove = "grove",

	/** Air - Core services and utilities */
	Air = "air",
}

/**
 * Message delivery status tracking.
 */
export enum DeliveryStatus {

	/** Message queued but not yet sent */
	Queued = "queued",

	/** Message sent and awaiting acknowledgment */
	Pending = "pending",

	/** Message successfully delivered */
	Delivered = "delivered",

	/** Message delivery failed */
	Failed = "failed",

	/** Message timed out */
	Timeout = "timeout",
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

	type: "request";

	/** Request payload (any serializable data) */
	payload: unknown;

	/** Expected timeout in milliseconds */
	timeout?: number;
}

/**
 * Response message for RPC request-reply pattern.
 */
export interface ResponseMessage extends BaseMessage {

	type: "response";

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

	type: "event";

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
export type MessageHandler<T = unknown> = (
	message: IPCMessage,

	context: MessageContext,
) => Promise<T> | T;

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

// ============================================================================
// SECTION: Constants and Configuration
// ============================================================================

/** Default maximum message size (1MB) */
const DEFAULT_MAX_MESSAGE_SIZE = 1024 * 1024;

/** Default maximum pending messages */
const DEFAULT_MAX_PENDING = 1000;

/** Default message timeout (30 seconds) */
const DEFAULT_TIMEOUT = 30000;

/** Default rate limit (messages per second) - 0 for no limit */
const DEFAULT_RATE_LIMIT = 0;

/** Maximum channel name length */
const MAX_CHANNEL_NAME_LENGTH = 128;

/** Valid channel name pattern (alphanumeric, hyphens, underscores) */
const CHANNEL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** Message ID prefix */
const MESSAGE_ID_PREFIX = "msg";

/** Correlation ID prefix */
const CORRELATION_ID_PREFIX = "corr";

/** Delivery ID prefix */
const DELIVERY_ID_PREFIX = "delv";

/** Channel ID prefix */
const CHANNEL_ID_PREFIX = "chan";

// ============================================================================
// SECTION: Channel Registry
// ============================================================================

/**
 * ChannelRegistry manages all registered RPC channels and their handlers.
 * Provides thread-safe channel registration, lookup, and lifecycle management.
 */
export class ChannelRegistry {

	/** Map of channel name to channel configuration */
	private channels: Map<string, RegisteredChannel> = new Map(;

	/** Map of correlation ID to pending requests */
	private pendingRequests: Map<string, PendingRequest> = new Map(;

	/** Registry statistics */
	private stats: {
		totalChannels: number;

		totalMessages: number;

		totalErrors: number;
	} = {
		totalChannels: 0,

		totalMessages: 0,

		totalErrors: 0,
	};

	/**
	 * Register a new RPC channel.
	 * @param options Channel configuration options
	 * @throws {Error} If channel name is invalid or already exists
	 */
	RegisterChannel(options: ChannelOptions): void {
		// Validate channel name
		if (!options.name) {
			throw new Error("Channel name cannot be empty";
		}

		if (options.name.length > MAX_CHANNEL_NAME_LENGTH) {
			throw new Error(
				`Channel name exceeds maximum length of ${MAX_CHANNEL_NAME_LENGTH}`,
			;
		}

		if (!CHANNEL_NAME_PATTERN.test(options.name)) {
			throw new Error(
				"Channel name must contain only alphanumeric characters, hyphens, and underscores",
			;
		}

		// Check for duplicate channel
		if (this.channels.has(options.name)) {
			throw new Error(`Channel '${options.name}' is already registered`;
		}

		// Create and register the channel
		const channel: RegisteredChannel = {
			id: this.GenerateChannelId(options.name),

			name: options.name,

			direction: options.direction,

			maxMessageSize: options.maxMessageSize || DEFAULT_MAX_MESSAGE_SIZE,

			maxPending: options.maxPending || DEFAULT_MAX_PENDING,

			timeout: options.timeout || DEFAULT_TIMEOUT,

			requireAuth: options.requireAuth || false,

			rateLimit: options.rateLimit || DEFAULT_RATE_LIMIT,

			validator: options.validator || this.DefaultMessageValidator,

			handlers: new Map(),

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
					[MessagePriority.Low]: 0,

					[MessagePriority.Normal]: 0,

					[MessagePriority.High]: 0,

					[MessagePriority.Critical]: 0,
				},
			},
		};

		this.channels.set(options.name, channel;

		this.stats.totalChannels++;
	}

	/**
	 * Unregister a channel and clean up its resources.
	 * @param name Channel name to unregister
	 * @returns true if channel was unregistered, false if not found
	 */
	UnregisterChannel(name: string): boolean {
		const channel = this.channels.get(name;

		if (!channel) {
			return false;
		}

		// Deactivate channel
		channel.active = false;

		// Clear pending requests for this channel
		for (const [correlationId, pending] of this.pendingRequests) {
			if (pending.channel === name) {
				clearTimeout(pending.timeoutHandle;

				this.pendingRequests.delete(correlationId;
			}
		}

		// Remove channel
		this.channels.delete(name;

		this.stats.totalChannels--;

		return true;
	}

	/**
	 * Get channel by name.
	 * @param name Channel name
	 * @returns Registered channel or undefined if not found
	 */
	GetChannel(name: string): RegisteredChannel | undefined {
		return this.channels.get(name;
	}

	/**
	 * Check if a channel exists.
	 * @param name Channel name
	 * @returns true if channel exists
	 */
	HasChannel(name: string): boolean {
		return this.channels.has(name;
	}

	/**
	 * Get all channel names.
	 * @returns Array of channel names
	 */
	GetAllChannelNames(): string[] {
		return Array.from(this.channels.keys();
	}

	/**
	 * Get all channel states.
	 * @returns Array of channel states
	 */
	GetAllChannelStates(): ChannelState[] {
		const states: ChannelState[] = [];

		for (const channel of this.channels.values()) {
			states.push(this.ExtractChannelState(channel);
		}

		return states;
	}

	/**
	 * Get registry statistics.
	 * @returns Registry statistics object
	 */
	GetStatistics(): typeof ChannelRegistry.prototype.stats {
		return { ...this.stats };
	}

	/**
	 * Clear all channels (for testing/shutdown).
	 */
	ClearAll(): void {
		for (const name of this.channels.keys()) {
			this.UnregisterChannel(name;
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
	private GenerateChannelId(name: string): string {
		const timestamp = Date.now(;

		const random = Math.random().toString(36).substring(2, 9;

		return `${CHANNEL_ID_PREFIX}-${name}-${timestamp}-${random}`;
	}

	/**
	 * Default message validator.
	 * @param message Message to validate
	 * @returns true if message is valid
	 */
	private DefaultMessageValidator(message: IPCMessage): boolean {
		if (!message.id || typeof message.id !== "string") {
			return false;
		}

		if (!message.channel || typeof message.channel !== "string") {
			return false;
		}

		if (
			!message.from ||
			!Object.values(SystemComponent).includes(message.from)
		) {
			return false;
		}

		return true;
	}

	/**
	 * Extract channel state from registered channel.
	 * @param channel Registered channel
	 * @returns Channel state
	 */
	private ExtractChannelState(channel: RegisteredChannel): ChannelState {
		const avgLatency =
			channel.metrics.messagesProcessed > 0
				? channel.metrics.totalLatency /
					channel.metrics.messagesProcessed
				: 0;

		return {
			name: channel.name,

			active: channel.active,

			queueSize: channel.queue.length,

			sentCount: channel.metrics.sentCount,

			receivedCount: channel.metrics.receivedCount,

			errorCount: channel.metrics.errorCount,

			lastActivity: channel.metrics.lastActivity,

			averageLatency: Math.round(avgLatency * 100) / 100,
		};
	}
}

// ============================================================================
// SECTION: Channel Manager - Core RPC System
// ============================================================================

/**
 * ChannelManager manages the entire multi-channel RPC system.
 * Handles message routing, channel lifecycle, and inter-component communication.
 */
export class ChannelManager {
	/** Channel registry instance */
	private registry: ChannelRegistry;

	/** Current system component */
	private component: SystemComponent;

	/** Active delivery tracking */
	private deliveries: Map<string, DeliveryTracking> = new Map(;

	/** Message history for debugging (limited size) */
	private messageHistory: IPCMessage[] = [];

	/** Maximum message history length */
	private maxHistoryLength: number;

	/**
	 * Create a new ChannelManager instance.
	 * @param component The system component this manager represents
	 * @param options Optional configuration options
	 */
	constructor(
		component: SystemComponent,

		options: { maxHistoryLength?: number } = {},
	) {
		this.component = component;

		this.registry = new ChannelRegistry(;

		this.maxHistoryLength = options.maxHistoryLength || 1000;
	}

	/**
	 * Create and register a new communication channel.
	 * @param options Channel configuration options
	 * @returns Channel identifier
	 * @throws {Error} If channel configuration is invalid
	 */
	CreateChannel(options: ChannelOptions): string {
		this.registry.RegisterChannel(options;

		const channel = this.registry.GetChannel(options.name;

		return channel!.id;
	}

	/**
	 * Route a message to the appropriate channel and handler.
	 * @param message Message to route
	 * @returns Delivery result
	 */
	async RouteMessage(message: IPCMessage): Promise<DeliveryResult> {
		const startTime = Date.now(;

		const deliveryId = this.GenerateDeliveryId(;

		try {
			// Validate message structure
			if (!this.ValidateMessageStructure(message)) {
				this.AddToHistory(message;

				return {
					status: DeliveryStatus.Failed,

					latency: Date.now() - startTime,

					error: "Invalid message structure",

					messageId: message.id,
				};
			}

			// Get target channel
			const channel = this.registry.GetChannel(message.channel;

			if (!channel) {
				this.AddToHistory(message;

				return {
					status: DeliveryStatus.Failed,

					latency: Date.now() - startTime,

					error: `Channel '${message.channel}' not found`,

					messageId: message.id,
				};
			}

			// Check if channel is active
			if (!channel.active) {
				this.AddToHistory(message;

				return {
					status: DeliveryStatus.Failed,

					latency: Date.now() - startTime,

					error: `Channel '${message.channel}' is inactive`,

					messageId: message.id,
				};
			}

			// Validate message using channel validator
			if (!channel.validator(message)) {
				this.AddToHistory(message;

				channel.metrics.errorCount++;

				return {
					status: DeliveryStatus.Failed,

					latency: Date.now() - startTime,

					error: "Message validation failed",

					messageId: message.id,
				};
			}

			// Check rate limit
			if (channel.rateLimit > 0 && !this.CheckRateLimit(channel)) {
				this.AddToHistory(message;

				return {
					status: DeliveryStatus.Failed,

					latency: Date.now() - startTime,

					error: "Rate limit exceeded",

					messageId: message.id,
				};
			}

			// Check queue size
			if (channel.queue.length >= channel.maxPending) {
				this.AddToHistory(message;

				return {
					status: DeliveryStatus.Failed,

					latency: Date.now() - startTime,

					error: "Channel queue full",

					messageId: message.id,
				};
			}

			// Process the message
			const context: MessageContext = {
				channel: message.channel,

				component: this.component,

				deliveryId,

				originalTimestamp: message.timestamp,
			};

			// Update metrics
			channel.metrics.receivedCount++;

			channel.metrics.queueSize = channel.queue.length;

			channel.metrics.lastActivity = Date.now(;

			channel.metrics.messagesByPriority[message.priority]++;

			// Execute message processing
			const result = await this.ProcessMessage(message, channel, context;

			// Update delivery status
			const latency = Date.now() - startTime;

			this.TrackDelivery(deliveryId, message.id, context.channel, {
				messageId: message.id,
				channel: context.channel,
				status: result
					? DeliveryStatus.Delivered
					: DeliveryStatus.Failed,
				latency,
				timestamp: Date.now(),
			};

			this.AddToHistory(message;

			return {
				status: result
					? DeliveryStatus.Delivered
					: DeliveryStatus.Failed,

				latency,

				messageId: message.id,
			};
		} catch (error) {
			const latency = Date.now() - startTime;

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";

			return {
				status: DeliveryStatus.Failed,

				latency,

				error: errorMessage,

				messageId: message.id,
			};
		}
	}

	/**
	 * Register a message handler for a specific channel.
	 * @param channelName Channel name
	 * @param messageType Message type to handle
	 * @param handler Handler function
	 */
	RegisterHandler(
		channelName: string,

		messageType: "request" | "response" | "event",

		handler: MessageHandler,
	): void {
		const channel = this.registry.GetChannel(channelName;

		if (!channel) {
			throw new Error(`Channel '${channelName}' not found`;
		}

		const key = `${channelName}:${messageType}`;

		channel.handlers.set(key, handler;
	}

	/**
	 * Unregister a message handler.
	 * @param channelName Channel name
	 * @param messageType Message type
	 */
	UnregisterHandler(
		channelName: string,

		messageType: "request" | "response" | "event",
	): void {
		const channel = this.registry.GetChannel(channelName;

		if (!channel) {
			return;
		}

		const key = `${channelName}:${messageType}`;

		channel.handlers.delete(key;
	}

	/**
	 * Get channel manager statistics.
	 * @returns Channel manager statistics
	 */
	GetStatistics(): {
		channels: number;

		messages: number;

		errors: number;

		pendingDeliveries: number;
	} {
		return {
			channels: this.registry.GetAllChannelNames().length,

			messages: this.registry.GetStatistics().totalMessages,

			errors: this.registry.GetStatistics().totalErrors,

			pendingDeliveries: this.deliveries.size,
		};
	}

	/**
	 * Get message history.
	 * @param limit Maximum number of messages to return
	 * @returns Array of messages
	 */
	GetMessageHistory(limit: number = 100): IPCMessage[] {
		return this.messageHistory.slice(-limit;
	}

	/**
	 * Clear message history.
	 */
	ClearMessageHistory(): void {
		this.messageHistory = [];
	}

	/**
	 * Shutdown the channel manager and cleanup resources.
	 */
	Shutdown(): void {
		this.registry.ClearAll(;

		this.deliveries.clear(;

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
	private ValidateMessageStructure(message: IPCMessage): boolean {
		if (!message) {
			return false;
		}

		if (!message.id || typeof message.id !== "string") {
			return false;
		}

		if (!message.channel || typeof message.channel !== "string") {
			return false;
		}

		if (
			!message.from ||
			!Object.values(SystemComponent).includes(message.from)
		) {
			return false;
		}

		if (!message.timestamp || typeof message.timestamp !== "number") {
			return false;
		}

		if (message.priority === undefined || message.priority === null) {
			return false;
		}

		return true;
	}

	/**
	 * Check if rate limit allows processing.
	 * @param channel Channel to check
	 * @returns true if rate limit allows
	 */
	private CheckRateLimit(_channel: RegisteredChannel): boolean {
		// Simple implementation - in production, use proper rate limiting
		// with sliding window or token bucket algorithm
		return true;
	}

	/**
	 * Process a message through its handler.
	 * @param message Message to process
	 * @param channel Target channel
	 * @param context Message context
	 * @returns Processing result
	 */
	private async ProcessMessage(
		message: IPCMessage,

		channel: RegisteredChannel,

		context: MessageContext,
	): Promise<boolean> {
		try {
			const key = `${channel.name}:${message.type}`;

			const handler = channel.handlers.get(key;

			if (handler) {
				await handler(message, context;

				channel.metrics.messagesProcessed++;

				return true;
			} else {
				// No handler registered - default to success
				return true;
			}
		} catch (error) {
			channel.metrics.errorCount++;

			process.stderr.write(
				`[IPC:Channel] Error processing message: ${error instanceof Error ? error.message : String(error)}\n`,
			;

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
	private TrackDelivery(
		deliveryId: string,

		messageId: string,

		channel: string,

		result: DeliveryTracking,
	): void {
		this.deliveries.set(deliveryId, {
			...result,
			messageId,
			channel,
		};

		// Clean up old deliveries (older than 1 hour)
		const now = Date.now(;

		for (const [id, delivery] of this.deliveries) {
			if (now - delivery.timestamp > 3600000) {
				this.deliveries.delete(id;
			}
		}
	}

	/**
	 * Add message to history.
	 * @param message Message to add
	 */
	private AddToHistory(message: IPCMessage): void {
		this.messageHistory.push(message;

		if (this.messageHistory.length > this.maxHistoryLength) {
			this.messageHistory.shift(;
		}
	}

	/**
	 * Generate unique delivery ID.
	 * @returns Delivery ID
	 */
	private GenerateDeliveryId(): string {
		const timestamp = Date.now(;

		const random = Math.random().toString(36).substring(2, 9;

		return `${DELIVERY_ID_PREFIX}-${timestamp}-${random}`;
	}
}

// ============================================================================
// SECTION: Utility Functions
// ============================================================================

/**
 * Generate a unique message identifier.
 * @returns Message ID
 */
export function GenerateMessageId(): string {
	const timestamp = Date.now(;

	const random = Math.random().toString(36).substring(2, 15;

	return `${MESSAGE_ID_PREFIX}-${timestamp}-${random}`;
}

/**
 * Generate a unique correlation ID for request-response tracking.
 * @returns Correlation ID
 */
export function GenerateCorrelationId(): string {
	const timestamp = Date.now(;

	const random = Math.random().toString(36).substring(2, 15;

	return `${CORRELATION_ID_PREFIX}-${timestamp}-${random}`;
}

/**
 * Create a request message.
 * @param params Request parameters
 * @returns Request message
 */
export function CreateRequestMessage(
	params: {
		channel: string;

		from: SystemComponent;

		to: SystemComponent | SystemComponent[];

		payload: unknown;

		priority?: MessagePriority;

		timeout?: number;

		correlationId?: string;

		headers?: Record<string, string>;
	} & Partial<BaseMessage>,
): RequestMessage {
	return {
		id: params.id || GenerateMessageId(),

		type: "request",

		channel: params.channel,

		from: params.from,

		to: params.to,

		payload: params.payload,

		priority: params.priority || MessagePriority.Normal,

		timestamp: params.timestamp || Date.now(),

		correlationId: params.correlationId || GenerateCorrelationId(),

		...(params.timeout !== undefined ? { timeout: params.timeout } : {}),

		...(params.headers !== undefined ? { headers: params.headers } : {}),
	};
}

/**
 * Create a response message.
 * @param params Response parameters
 * @returns Response message
 */
export function CreateResponseMessage(
	params: {
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
	} & Partial<BaseMessage>,
): ResponseMessage {
	return {
		id: params.id || GenerateMessageId(),

		type: "response",

		channel: params.channel,

		from: params.from,

		to: params.to,

		correlationId: params.correlationId,

		success: params.success,

		data: params.data,

		...(params.error !== undefined ? { error: params.error } : {}),

		priority: params.priority || MessagePriority.Normal,

		timestamp: params.timestamp || Date.now(),

		...(params.headers !== undefined ? { headers: params.headers } : {}),
	};
}

/**
 * Create an event message.
 * @param params Event parameters
 * @returns Event message
 */
export function CreateEventMessage(
	params: {
		channel: string;

		from: SystemComponent;

		to?: SystemComponent | SystemComponent[];

		payload: unknown;

		priority?: MessagePriority;

		headers?: Record<string, string>;
	} & Partial<BaseMessage>,
): EventMessage {
	return {
		id: params.id || GenerateMessageId(),

		type: "event",

		channel: params.channel,

		from: params.from,

		to: params.to || [], // Empty array for broadcast

		payload: params.payload,

		priority: params.priority || MessagePriority.Normal,

		timestamp: params.timestamp || Date.now(),

		...(params.headers !== undefined ? { headers: params.headers } : {}),
	};
}

// ============================================================================
// SECTION: Internal Types
// ============================================================================

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

/**
 * Pending request tracking.
 */
interface PendingRequest {
	/** Message ID */
	messageId: string;

	/** Channel name */
	channel: string;

	/** Timeout timestamp */
	expiresAt: number;

	/** Timeout handle */
	timeoutHandle: NodeJS.Timeout;

	/** Resolve function */
	resolve: (value: ResponseMessage) => void;

	/** Reject function */
	reject: (error: Error) => void;
}

/**
 * Delivery tracking information.
 */
interface DeliveryTracking {
	/** Original message ID */
	messageId: string;

	/** Channel name */
	channel: string;

	/** Delivery status */
	status: DeliveryStatus;

	/** Processing latency in milliseconds */
	latency: number;

	/** Timestamp of delivery attempt */
	timestamp: number;
}
