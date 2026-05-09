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
export declare enum ProtocolMessageType {

    Request = "request",

    Response = "response",

    Notification = "notification"
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
export type RequestHandler<T = unknown, TResult = unknown> = (parameter: T, token: CancellationToken) => Promise<TResult> | TResult;

/**
 * Notification handler function type
 */
export type NotificationHandler<T = unknown> = (data: T) => void | Promise<void>;

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
export declare const DEFAULT_PROTOCOL_OPTIONS: ProtocolOptions;

/**
 * Create a unique request ID for correlation
 */
export declare function CreateRequestId(): string;

/**
 * Determine message type for routing
 */
export declare function GetMessageType(message: IPCProtocolMessage): ProtocolMessageType;

/**
 * Validate IPC message structure
 */
export declare function ValidateMessage(message: unknown): boolean;

/**
 * Wrap message in protocol envelope
 */
export declare function WrapMessage(message: IPCProtocolMessage): ProtocolMessage;

/**
 * Extract message from protocol envelope
 */
export declare function UnwrapMessage(envelope: ProtocolMessage): IPCProtocolMessage;

/**
 * Create error response
 */
export declare function CreateErrorResponse(id: string, message: string, code?: number): IPCResponse;

/**
 * Create success response
 */
export declare function CreateSuccessResponse<T>(id: string, data: T): IPCResponse;

/**
 * Serialize protocol message to VSBuffer
 */
export declare function SerializeMessage(message: ProtocolMessage): VSBuffer;

/**
 * Deserialize VSBuffer to protocol message
 */
export declare function DeserializeMessage(buffer: VSBuffer): ProtocolMessage;

/**
 * Check if message is a request
 */
export declare function IsRequest(message: IPCProtocolMessage): message is IPCRequest;

/**
 * Check if message is a response
 */
export declare function IsResponse(message: IPCProtocolMessage): message is IPCResponse;

/**
 * Check if message is a notification
 */
export declare function IsNotification(message: IPCProtocolMessage): message is IPCNotification;

//# sourceMappingURL=Protocol.d.ts.map