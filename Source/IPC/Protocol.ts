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
export type IPCProtocolMessage =
	| IPCRequest
	| IPCResponse
	| IPCNotification
	| IPCCancel;

/**
 * Caller-side cancellation message. Keyed by the SAME `CorrelationId` the
 * original `IPCRequest` was issued with - no parallel id scheme. This is
 * the envelope counterpart of the upstream `'cancel'` request type in
 * `vs/base/parts/ipc/common/ipc.ts`.
 */
export interface IPCCancel {

	readonly Type: "cancel";

	readonly CorrelationId?: string;

	readonly Reason?: string;
}

/**
 * Typed error used to reject the pending resolver of a cancelled request.
 */
export class CancelledError extends Error {

	readonly Code = "CANCELLED";

	readonly CorrelationId?: string;

	constructor(CorrelationId?: string, Reason?: string) {
		super(Reason ?? "IPC request cancelled");

		this.name = "CancelledError";

		if (CorrelationId !== undefined) {
			this.CorrelationId = CorrelationId;
		}
	}
}

/** Warn without ever throwing - cancellation must degrade, not crash. */
function WarnCancellation(Message: string): void {
	try {
		if (
			typeof console !== "undefined" &&
			typeof console.warn === "function"
		) {
			console.warn(`[IPC:Protocol] ${Message}`);
		}
	} catch {
		// A hostile or partial console must not turn a cancel into a throw.
	}
}

/** True when a protocol message is the `cancel` variant. */
export function IsCancel(message: IPCProtocolMessage): message is IPCCancel {
	return (
		typeof message === "object" &&

		message !== null &&

		"Type" in message &&

		(message as IPCCancel).Type === "cancel"
	);
}

/**
 * Build the `cancel` request for an in-flight `CorrelationId`. Returns
 * undefined (with a warning) for a missing/blank id so callers degrade
 * instead of minting a new identifier.
 */
export function CreateCancelRequest(
	CorrelationId: string | undefined,
	Reason?: string,
): IPCCancel | undefined {
	const Id = typeof CorrelationId === "string" ? CorrelationId.trim() : "";

	if (Id.length === 0) {
		WarnCancellation(
			"cancel requested without a CorrelationId - ignoring emit",
		);

		return undefined;
	}

	return {
		Type: "cancel",

		CorrelationId: Id,

		...(Reason !== undefined ? { Reason } : {}),
	};
}

/**
 * Reject a pending request resolver with a typed cancelled error.
 * A missing resolver, an already-settled request and a throwing reject all
 * warn and degrade: nothing is left hanging and no rejection escapes.
 */
export function RejectAsCancelled(
	reject: ((error: Error) => void) | undefined,
	CorrelationId: string | undefined,
	Reason?: string,
): void {
	if (typeof reject !== "function") {
		WarnCancellation(
			`cancel for ${CorrelationId ?? "<missing id>"} has no pending resolver - already settled?`,
		);

		return;
	}

	try {
		reject(new CancelledError(CorrelationId, Reason));
	} catch (error) {
		WarnCancellation(
			`failed to reject cancelled request ${CorrelationId ?? "<missing id>"}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Bind a caller-side `CancellationToken` to one pending request. When the
 * token fires, the `cancel` request is emitted and the pending resolver is
 * rejected exactly once. A missing id, duplicate fires, an already-settled
 * request or a token that cannot signal cancellation all warn and degrade.
 * The returned disposer detaches the listener and marks the request settled
 * so a late cancel cannot reject twice.
 */
export function BindCancellation(
	token: CancellationToken | undefined,
	CorrelationId: string | undefined,
	emit: (cancel: IPCCancel) => void,
	reject: (error: Error) => void,
): () => void {
	let Settled = false;

	let Cancelled = false;

	const Id =
		typeof CorrelationId === "string" && CorrelationId.trim().length > 0
			? CorrelationId.trim()
			: undefined;

	if (Id === undefined) {
		WarnCancellation(
			"BindCancellation called without a CorrelationId - cancel cannot be keyed",
		);
	}

	const OnCancelled = (): void => {
		if (Settled) {
			WarnCancellation(
				`cancel for ${Id ?? "<missing id>"} arrived after settle - ignoring`,
			);

			return;
		}

		if (Cancelled) {
			WarnCancellation(
				`duplicate cancel for ${Id ?? "<missing id>"} - ignoring`,
			);

			return;
		}

		Cancelled = true;

		try {
			const Cancel = CreateCancelRequest(Id, "caller token fired");

			if (Cancel !== undefined) {
				emit(Cancel);
			}
		} catch (error) {
			WarnCancellation(
				`failed to emit cancel for ${Id ?? "<missing id>"}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		RejectAsCancelled(reject, Id, "caller token fired");

		Settled = true;
	};

	if (token && typeof token.onCancellationRequested === "function") {
		const Subscription = token.onCancellationRequested(OnCancelled);

		return (): void => {
			Settled = true;

			try {
				Subscription.dispose();
			} catch (error) {
				WarnCancellation(
					`failed to dispose cancel listener for ${Id ?? "<missing id>"}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		};
	}

	WarnCancellation(
		`token for ${Id ?? "<missing id>"} cannot signal cancellation - the remote handler cannot be stopped from this side`,
	);

	return (): void => {
		Settled = true;
	};
}

/**
 * Message type enum for protocol routing
 */
export enum ProtocolMessageType {

	Request = "request",

	Response = "response",

	Notification = "notification",

	// Caller-side cancellation (upstream `ipc.ts` `'cancel'` request type).
	// Appended so the existing variants and their ordering are unchanged.
	Cancel = "cancel",
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

	// New variant first: a cancel carries no Channel/Method, so the normal
	// request/response/notification checks below stay byte-for-byte intact.
	if (IsCancel(message)) {
		return ProtocolMessageType.Cancel;
	}

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

	// New variant: accept a cancel with a missing id (the emit/reject helpers
	// warn and degrade) so deserialization never throws on it. Normal request,
	// response and notification validation below is unchanged.
	if (msg.Type === "cancel") {
		return !("CorrelationId" in msg) || typeof msg.CorrelationId === "string";
	}

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
