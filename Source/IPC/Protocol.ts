/**
 * @file Protocol.ts
 *
 * @module IPC
 *
 * @responsibilities
 * Defines IPC communication protocol interfaces for inter-process communication
 * Implements request/response/notification patterns following VSCode IPC architecture
 * Provides type-safe contract for extension host communication
 *
 * @element-connections
 * **Mountain**: gRPC backend via Vine.proto protocol (requests sent to Mountain)
 * **Wind**: Effect-TS services register protocol handlers
 * **Sky**: Astro display receives notifications via this protocol
 * **Output**: Reference VSCode vs/base/parts/ipc/common/ipc.ts patterns
 *
 * @todo
 * FUTURE: Message prioritization - consider when implementing priority queues
 * FUTURE: Protocol version negotiation - depends on Mountain protocol stability
 * FUTURE: Compression - could use zlib for payloads > 1KB
 * FUTURE: Metrics - integrate with PerformanceMonitoringService
 * FUTURE: Encryption - TLS/SSL handled at transport layer (gRPC)
 */

import { type VSBuffer } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/buffer.js";
import { type CancellationToken } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";
import { type IDisposable } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/lifecycle.js";

/**
 * Request message sent from extension host to request data or actions
 */
export interface IPCRequest {
	readonly Id: string;

	readonly Channel: string;

	readonly Method: string;

	readonly Parameters: unknown[];

	readonly TokenCancellationToken?: string;
}

/**
 * Response message sent back for a request
 */
export interface IPCResponse {
	readonly Id: string;

	readonly Success: boolean;

	readonly Data?: unknown;

	readonly ErrorMessage?: string;

	readonly ErrorCode?: number;
}

/**
 * Notification message (fire-and-forget, no response expected)
 */
export interface IPCNotification {
	readonly Channel: string;

	readonly Type: string;

	readonly Data?: unknown;
}

/**
 * Protocol message wrapper for all message types
 */
export type IPCProtocolMessage = IPCRequest | IPCResponse | IPCNotification;

/**
 * Message type enum for protocol routing
 */
export enum ProtocolMessageType {
	Request = "request",

	Response = "response",

	Notification = "notification",
}

/**
 * Protocol message with type discriminator
 */
export interface ProtocolMessage {
	readonly Type: ProtocolMessageType;

	readonly Message: IPCProtocolMessage;
}

/**
 * Request handler function type
 */
export type RequestHandler<T = unknown, TResult = unknown> = (
	parameter: T,

	token: CancellationToken,
) => Promise<TResult> | TResult;

/**
 * Notification handler function type
 */
export type NotificationHandler<T = unknown> = (
	data: T,
) => void | Promise<void>;

/**
 * Channel handler registration
 */
export interface ChannelHandler {
	readonly Channel: string;

	readonly Method: string;

	readonly Handler: RequestHandler;

	readonly Description?: string;
}

/**
 * Notification subscription
 */
export interface NotificationSubscription {
	readonly Channel: string;

	readonly Type: string;

	readonly Handler: NotificationHandler;

	readonly Subscription: IDisposable;
}

/**
 * Protocol configuration options
 */
export interface ProtocolOptions {
	readonly Timeout: number;

	readonly MaxMessageSize: number;

	readonly EnableCompression: boolean;

	readonly EnableEncryption: boolean;
}

/**
 * Default protocol configuration
 */
export const DEFAULT_PROTOCOL_OPTIONS: ProtocolOptions = {
	Timeout: 30000,

	MaxMessageSize: 10485760, // 10MB

	EnableCompression: false,

	EnableEncryption: false,
} as const;

/**
 * Create a unique request ID for correlation
 */
export function CreateRequestId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Determine message type for routing
 */
export function GetMessageType(
	message: IPCProtocolMessage,
): ProtocolMessageType {
	if ("Id" in message && "Channel" in message && "Method" in message) {
		return ProtocolMessageType.Request;
	}

	if ("Id" in message && "Success" in message) {
		return ProtocolMessageType.Response;
	}

	if ("Channel" in message && "Type" in message && !("Id" in message)) {
		return ProtocolMessageType.Notification;
	}

	throw new Error("Invalid IPC protocol message");
}

/**
 * Validate IPC message structure
 */
export function ValidateMessage(message: unknown): boolean {
	if (typeof message !== "object" || message === null) {
		return false;
	}

	const msg = message as Record<string, unknown>;

	// Request validation
	if ("Channel" in msg && "Method" in msg && "Parameters" in msg) {
		return (
			typeof msg.Channel === "string" &&
			typeof msg.Method === "string" &&
			Array.isArray(msg.Parameters) &&
			"Id" in msg &&
			typeof msg.Id === "string"
		);
	}

	// Response validation
	if ("Id" in msg && "Success" in msg) {
		return typeof msg.Id === "string" && typeof msg.Success === "boolean";
	}

	// Notification validation
	if ("Channel" in msg && "Type" in msg && !("Id" in msg)) {
		return typeof msg.Channel === "string" && typeof msg.Type === "string";
	}

	return false;
}

/**
 * Wrap message in protocol envelope
 */
export function WrapMessage(message: IPCProtocolMessage): ProtocolMessage {
	return {
		Type: GetMessageType(message),

		Message: message,
	};
}

/**
 * Extract message from protocol envelope
 */
export function UnwrapMessage(envelope: ProtocolMessage): IPCProtocolMessage {
	return envelope.Message;
}

/**
 * Create error response
 */
export function CreateErrorResponse(
	id: string,

	message: string,

	code?: number,
): IPCResponse {
	return {
		Id: id,

		Success: false,

		ErrorMessage: message,

		ErrorCode: code,
	};
}

/**
 * Create success response
 */
export function CreateSuccessResponse<T>(id: string, data: T): IPCResponse {
	return {
		Id: id,

		Success: true,

		Data: data,
	};
}

/**
 * Serialize protocol message to VSBuffer
 */
export function SerializeMessage(message: ProtocolMessage): VSBuffer {
	const json = JSON.stringify(message);

	return VSBuffer.fromString(json);
}

/**
 * Deserialize VSBuffer to protocol message
 */
export function DeserializeMessage(buffer: VSBuffer): ProtocolMessage {
	try {
		const json = buffer.toString();

		const message = JSON.parse(json) as ProtocolMessage;

		if (!ValidateMessage(message.Message)) {
			throw new Error("Invalid message structure");
		}

		return message;
	} catch (error) {
		throw new Error(
			`Failed to deserialize IPC message: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Check if message is a request
 */
export function IsRequest(message: IPCProtocolMessage): message is IPCRequest {
	return (
		"Id" in message &&
		"Channel" in message &&
		"Method" in message &&
		"Parameters" in message &&
		!("Success" in message)
	);
}

/**
 * Check if message is a response
 */
export function IsResponse(
	message: IPCProtocolMessage,
): message is IPCResponse {
	return (
		"Id" in message &&
		"Success" in message &&
		!("Method" in message) &&
		!("Channel" in message)
	);
}

/**
 * Check if message is a notification
 */
export function IsNotification(
	message: IPCProtocolMessage,
): message is IPCNotification {
	return (
		"Channel" in message &&
		"Type" in message &&
		!("Id" in message) &&
		!("Success" in message)
	);
}
