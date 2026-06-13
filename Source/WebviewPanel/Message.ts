/**
 * @module Message
 * @description
 * Webview Message System - Message passing between extension and Webview contexts
 *
 * RESPONSIBILITIES:
 * - Define message protocol for extension ↔ Webview communication
 * - Handle message serialization and validation
 * - Provide message filtering and routing
 * - Support request/response pattern for async operations
 * - Ensure message security and integrity
 *
 * ARCHITECTURE:
 * - Protocol: Structured message format with type and payload
 * - Validation: Runtime type checking for message integrity
 * - Routing: Message type-based routing to appropriate handlers
 * - Security: Content security policy enforcement
 *
 * INTEGRATION:
 * - **Sky**: Astro display layer renders messages from Webview to extension
 * - **Wind**: Effect-TS services provide secure messaging infrastructure
 * - **Mountain**: Message state logged to Mountain for debugging and audit
 * - **Panel**: Panel module consumes message system for communication
 *
 * CONNECTIONS:
 * - Panel: Uses SendMessage for extension → Webview communication
 * - Webview: Receives and processes messages from extension
 * - IPC: Routes messages between extension host and Mountain
 *
 * IMPLEMENTATION NOTES:
 * - postMessage API for cross-context communication
 * - Message type system for structured communication
 * - Defensive validation prevents malformed messages
 * - Error handling for message processing failures
 * - Request/response correlation with message IDs
 *
 * TODOs (Message Debugging - LOW):
 * FUTURE: Message logging - log all messages with trace level
 * FUTURE: Payload inspection - add debug UI for message content
 * FUTURE: Timing metrics - track message send/receive latency
 * FUTURE: Message replay - allow replaying messages for debugging
 *
 * TODOs (Message Security - LOW):
 * FUTURE: Encryption - encrypt sensitive message payloads
 * FUTURE: Origin validation - verify message origin matches panel
 * FUTURE: Rate limiting - limit messages per panel per second
 * FUTURE: Sanitization - sanitize message content before processing
 *
 * TODOs (Message Performance - LOW):
 * PERFORMANCE: Serialization - optimize JSON.stringify usage
 * PERFORMANCE: Batching - collect messages and send in batches
 * PERFORMANCE: Compression - use zlib for large payloads
 * PERFORMANCE: Caching - cache message responses for idempotent requests
 *
 * Reference: WebviewPanel is HIGH priority for Mountain integration
 */

import type { Webview as VSCodeWebview } from "vscode";

/**
 * @interface Message
 * @description Base message structure for extension ↔ Webview communication
 */
export interface Message {

	readonly Type: string;

	readonly Payload: unknown;

	readonly Timestamp: number;

	readonly Id: string;
}

/**
 * @interface RequestMessage
 * @description Request message expecting a response
 */
export interface RequestMessage extends Message {

	readonly Type: "Request";

	readonly RequestId: string;

	readonly Payload: {
		readonly Method: string;

		readonly Parameters: readonly unknown[];
	};
}

/**
 * @interface ResponseMessage
 * @description Response message to a previous request
 */
export interface ResponseMessage extends Message {

	readonly Type: "Response";

	readonly RequestId: string;

	readonly Payload: {
		readonly Success: boolean;

		readonly Data?: unknown;

		readonly Error?: string;
	};
}

/**
 * @interface EventMessage
 * @description Event message for one-way notification
 */
export interface EventMessage extends Message {

	readonly Type: "Event";

	readonly Payload: {
		readonly EventName: string;

		readonly Data: unknown;
	};
}

/**
 * @type WebviewMessage
 * @description Union of all valid message types
 */
export type WebviewMessage = RequestMessage | ResponseMessage | EventMessage;

/**
 * @interface MessageHandler
 * @description Handler function for processing messages
 */
export type MessageHandler = (
	Message: WebviewMessage,
) => Promise<void>;

/**
 * @interface MessageRouter
 * @description Routes messages to appropriate handlers based on type
 */
export interface MessageRouter {

	readonly Handle: (Message: WebviewMessage) => Promise<void>;

	readonly RegisterHandler: (
		Type: string,

		Handler: MessageHandler,
	) => Promise<void>;

	readonly UnregisterHandler: (Type: string) => Promise<void>;
}

/**
 * @class MessageService
 * @description Service for message passing and routing
 */
export class MessageService extends /* Effect.Service */(
	"Message/WebviewPanel",

	{
		effect: async function() {
			const HandlersRef = await Effect.tryMap(
				new Map<string, MessageHandler>(),

				(error) => new Error(`Failed to create handlers map: ${error}`),
			);

			/**
			 * Validate a message structure
			 */
			const ValidateMessage = (
				Message: unknown,
			): Promise<WebviewMessage> =>
				async function() {
					// Defensive: Check if message is an object
					if (
						typeof Message !== "object" ||
						Message === null ||
						Array.isArray(Message)
					) {
						throw new Error("Message must be an object"),
						))))))))))));
					}

					const Msg = Message as Record<string, unknown>;

					// Check required fields
					if (typeof Msg.Type !== "string") {
						throw new Error("Message missing Type"),
						;
					}

					if (
						typeof Msg.Payload !== "object" ||
						Msg.Payload === null
					) {
						throw new Error("Message missing Payload"),
						;
					}

					if (typeof Msg.Timestamp !== "number") {
						throw new Error("Message missing Timestamp"),
						;
					}

					if (typeof Msg.Id !== "string") {
						throw new Error("Message missing Id"),
						;
					}

					// Type-specific validation
					if (Msg.Type === "Request") {
						const Payload = Msg.Payload as Record<string, unknown>;

						if (
							typeof Payload.Method !== "string" ||
							!Array.isArray(payload.Parameters)
						) {
							throw new Error(
									"Request message has invalid payload",
								),
							;
						}
					} else if (Msg.Type === "Response") {
						const Payload = Msg.Payload as Record<string, unknown>;

						if (typeof Payload.Success !== "boolean") {
							throw new Error(
									"Response message has invalid payload",
								),
							;
						}
					} else if (Msg.Type === "Event") {
						const EventPayload = Msg.Payload as Record<
							string,
							unknown
						>;

						if (typeof EventPayload.EventName !== "string") {
							throw new Error("Event message has invalid payload"),
							;
						}
					} else {
						throw new Error(`Unknown message type: ${Msg.Type}`),
						;
					}

					return Msg as WebviewMessage;
				};

			/**
			 * Create a new message
			 */
			const CreateMessage = (
				Type: "Request" | "Response" | "Event",

				Payload: unknown,
			): WebviewMessage => ({
				Type,
				Payload: Payload as object,
				Timestamp: Date.now(),
				Id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
			};

			/**
			 * Send a message to a Webview
			 */
			const SendMessage = (
				Webview: VSCodeWebview,

				Message: WebviewMessage,
			): Promise<boolean> =>
				(async () => {
	try {
		return await Webview.postMessage(Message);
	} catch (_e) {
		return false,
				};

			/**
			 * Register a handler for a specific message type
			 */
			const RegisterHandler = (
				Type: string,

				Handler: MessageHandler;
	}
})(): Promise<void> =>
				{
					(
						HandlersRef as { current: Map<string, MessageHandler> }
					.current.set(Type, Handler;
				};

			/**
			 * Unregister a handler for a specific message type
			 */
			const UnregisterHandler = (
				Type: string,
			): Promise<void> =>
				{
					(
						HandlersRef as { current: Map<string, MessageHandler> }
					.current.delete(Type;
				};

			/**
			 * Route a message to its handler
			 */
			const RouteMessage = (
				Message: WebviewMessage,
			): Promise<void> =>
				async function() {
					const Handlers = (
						HandlersRef as { current: Map<string, MessageHandler> }
					).current;

					const Handler = Handlers.get(Message.Type;

					if (!Handler) {
						throw new Error(
								`No handler registered for type: ${Message.Type}`,
							),
						;
					}

					await Handler(Message;
				};

			/**
			 * Handle an incoming message with validation
			 */
			const Handle = (Message: unknown): Promise<void> =>
				async function() {
					const ValidatedMessage = await ValidateMessage(Message;

					await RouteMessage(ValidatedMessage;
				};

			return {
				CreateMessage,

				SendMessage,

				RegisterHandler,

				UnregisterHandler,

				Handle,
			};
		}),
	},
) {}
