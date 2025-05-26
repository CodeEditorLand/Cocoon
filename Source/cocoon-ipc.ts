/*---------------------------------------------------------------------------------------------
 * Cocoon Vine IPC Implementation (cocoon-ipc.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the Cocoon-side (extension host side) of the Vine IPC protocol. This module
 * handles communication with the Mountain host process (main process) over stdio
 * (standard input/output) using newline-delimited JSON messages. It also provides the
 * necessary adapter for VS Code's `RPCProtocol` to enable VS Code's standard RPC mechanism
 * over this custom IPC transport.
 *
 * Vine Message Types (as defined by `msg_type` field):
 * - 1: Request (Can be initiated by Cocoon or Mountain)
 * - 3: Response (Successful result to a Request)
 * - 4: Error (Error response to a Request)
 * - 5: Cancel (Used by the initiator of a request to cancel it, e.g., Cocoon -> Mountain)
 * - 6: Notification (Fire-and-forget message, can be sent by Cocoon or Mountain)
 *
 * Responsibilities:
 * - Reading newline-delimited JSON messages from `process.stdin` (from Mountain).
 * - Writing newline-delimited JSON messages to `process.stdout` (to Mountain).
 * - Parsing incoming `VineMessage` objects and routing them based on their `msg_type`.
 * - Managing request-response lifecycle: generating unique request IDs, matching responses
 *   to pending requests, and handling timeouts.
 * - Implementing core IPC functions:
 *   - `sendToMountainAndWait`: Sends a request and waits for a response.
 *   - `sendNotificationToMountain`: Sends a fire-and-forget notification.
 *   - `sendResponseToMountain`: Sends a response to a request received from Mountain.
 *   - `sendCancelToMountain`: Sends a cancellation for a request previously sent by Cocoon.
 * - Providing `createHostProtocolInterface`: An adapter that conforms to VS Code's
 *   `IMessagePassingProtocol`, allowing `RPCProtocol` to operate over Vine notifications.
 * - Emitting specific internal events (e.g., for configuration changes, workspace folder
 *   changes, generic messages) for consumption by other parts of Cocoon (e.g., `index.ts`, shims).
 *
 * Key Interactions:
 * - Interacts directly with Node.js `process.stdin` and `process.stdout`.
 * - Uses Node.js `readline` module for efficient line-by-line processing of stdin.
 * - Manages a `Map` of pending requests for `sendToMountainAndWait`.
 * - Bridges VS Code's `RPCProtocol` (which expects `VSBuffer`s) by encoding/decoding
 *   buffers to/from base64 strings transmitted within Vine notifications (method: "rpcData").
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter for internal event distribution
import { EventEmitter } from "events";
import * as readline from "readline";
// VS Code common utilities
import { VSBuffer } from "vs/base/common/buffer";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { toDisposable, type IDisposable } from "vs/base/common/lifecycle";
// MessagePassingProtocol is the concrete class
import { type IMessagePassingProtocol } from "vs/workbench/services/extensions/common/rpcProtocol";

console.log("[Cocoon IPC] Initializing IPC layer...");

// --- Type Definitions for Vine Protocol ---

/** Defines the allowed message type identifiers for the Vine protocol. */
type VineMsgType = 1 | 3 | 4 | 5 | 6;

/** Base structure for all Vine messages. */
interface VineMessageBase {
	msg_type: VineMsgType;

	/** Unique identifier for requests and their corresponding responses/errors/cancellations. Null for notifications. */
	id: number | null;

	/** Method name for requests and notifications. Null for responses/errors/cancellations. */
	method: string | null;
}

/** Represents a request message (msg_type: 1). */
interface VineRequest extends VineMessageBase {
	msg_type: 1;

	// Always present and unique for requests.
	id: number;

	// Always present, indicates the action to perform.
	method: string;

	// Payload/arguments for the method.
	params: any;
}

/** Represents a successful response message (msg_type: 3). */
interface VineResponse extends VineMessageBase {
	msg_type: 3;

	// Corresponds to the ID of the original request.
	id: number;

	method: null;

	// Result payload of the request; can be `null` if the method returns void but was successful.
	params: any;

	error: null;
}

/** Structure for the error payload within a VineErrorResponse. */
interface VineErrorPayload {
	message: string;

	stack?: string;

	name?: string;

	// e.g., 'ENOENT', or a custom numeric error code.
	code?: string | number;
}

/** Represents an error response message (msg_type: 4). */
interface VineErrorResponse extends VineMessageBase {
	msg_type: 4;

	// Corresponds to the ID of the original request.
	id: number;

	method: null;

	params: null;

	// Detailed error information.
	error: VineErrorPayload;
}

/** Represents a cancellation message (msg_type: 5). */
interface VineCancel extends VineMessageBase {
	// Used by the initiator to cancel a previously sent request.
	msg_type: 5;

	// ID of the request to cancel.
	id: number;

	method: null;

	params: null;
}

/** Represents a notification message (msg_type: 6). */
interface VineNotification extends VineMessageBase {
	msg_type: 6;

	// Notifications do not have IDs as they don't expect responses.
	id: null;

	// Always present, indicates the nature of the notification.
	method: string;

	// Payload for the notification.
	params: any;
}

/** Union type representing any valid Vine protocol message. */
type VineMessage =
	| VineRequest
	| VineResponse
	| VineErrorResponse
	| VineCancel
	| VineNotification;

/** Structure to hold state for pending outgoing requests awaiting responses. */
interface PendingRequestEntry {
	resolve: (value: any) => void;

	reject: (reason?: any) => void;

	timeoutHandle: NodeJS.Timeout;

	// Method name for logging, especially for timeouts.
	methodForLog: string;
}

// --- State for Request/Response Handling ---
const pendingRequests = new Map<number, PendingRequestEntry>();

// Counter for generating unique request IDs.
let nextRequestId = 1;

// --- Event Emitter for distributing specific incoming messages/notifications from Mountain ---
const internalAppEmitter = new EventEmitter();

// --- Core IPC Functions ---

/**
 * Sends a raw VineMessage object to the Mountain host process via stdout.
 * @param payload The VineMessage to send.
 */
function sendToMountainRaw(payload: VineMessage): void {
	try {
		const jsonString = JSON.stringify(payload);

		// Construct a concise log message
		const methodInfo = payload.method ? ` Method=${payload.method}` : "";

		const idInfo = payload.id !== null ? ` ID=${payload.id}` : "";

		const logPayloadSummary =
			jsonString.length > 200
				? jsonString.substring(0, 200) +
					`... (len ${jsonString.length})`
				: jsonString;

		console.log(
			`[Cocoon IPC -> Mtn] Type=${payload.msg_type}${idInfo}${methodInfo}, Payload=${logPayloadSummary}`,
		);

		// Newline delimiter is crucial
		process.stdout.write(jsonString + "\n");
	} catch (e: any) {
		// This is a critical failure, as basic communication is broken.
		console.error(
			`[Cocoon IPC] FATAL: Failed to stringify/send payload (Type: ${payload?.msg_type}, Method: ${payload?.method}). Error:`,

			e.message,

			e.stack,
		);
	}
}

/**
 * Sends a request to Mountain and returns a Promise that resolves with the response
 * or rejects on error or timeout.
 * @param method The method name for the request.
 * @param params The parameters for the request.
 * @param timeoutMs The timeout duration in milliseconds. Defaults to 5000ms.
 * @returns A Promise resolving with the response parameters or rejecting with an error.
 */
export function sendToMountainAndWait(
	method: string,

	params: any,

	timeoutMs = 5000,
): Promise<any> {
	return new Promise((resolve, reject) => {
		const id = nextRequestId++;

		const requestMessage: VineRequest = { msg_type: 1, id, method, params };

		const timeoutHandle = setTimeout(() => {
			if (pendingRequests.has(id)) {
				// Check if still pending (not resolved/rejected yet)
				pendingRequests.delete(id);

				const errorMsg = `[Cocoon IPC] Request ${id} ('${method}') to Mountain timed out after ${timeoutMs}ms.`;

				console.error(errorMsg);

				// Use a standard Error object for timeouts
				reject(new Error(errorMsg));
			}
		}, timeoutMs);

		pendingRequests.set(id, {
			resolve,

			reject,

			timeoutHandle,

			methodForLog: method,
		});

		sendToMountainRaw(requestMessage);
	});
}

/**
 * Sends a fire-and-forget notification to Mountain.
 * @param method The method name for the notification.
 * @param params The parameters for the notification.
 */
export function sendNotificationToMountain(method: string, params: any): void {
	const notificationMessage: VineNotification = {
		msg_type: 6,

		id: null,

		method,

		params,
	};

	sendToMountainRaw(notificationMessage);
}

/**
 * Sends a response (success or error) to a request previously received from Mountain.
 * @param requestId The ID of the request being responded to.
 * @param result The result payload if the request was successful.
 * @param errorObj The error details if the request failed. Can be an Error instance,
 *
 *
 *                 a string message, or a pre-formed VineErrorPayload.
 */
export function sendResponseToMountain(
	requestId: number,

	result: any,

	errorObj: Error | VineErrorPayload | string | null,
): void {
	let responseMessage: VineResponse | VineErrorResponse;

	if (errorObj) {
		let vineErrorPayload: VineErrorPayload;

		if (errorObj instanceof Error) {
			vineErrorPayload = {
				message: errorObj.message,

				stack: errorObj.stack,

				name: errorObj.name,

				// Attempt to get a NodeJS error code
				code: (errorObj as NodeJS.ErrnoException).code,
			};
		} else if (typeof errorObj === "string") {
			vineErrorPayload = { message: errorObj };
		} else {
			// Assumed to be a VineErrorPayload object
			vineErrorPayload = errorObj;
		}

		responseMessage = {
			msg_type: 4,

			id: requestId,

			method: null,

			params: null,

			error: vineErrorPayload,
		};
	} else {
		responseMessage = {
			msg_type: 3,

			id: requestId,

			method: null,

			// Ensure `params` is not `undefined` in JSON
			params: result === undefined ? null : result,

			error: null,
		};
	}

	sendToMountainRaw(responseMessage);
}

/**
 * Sends a cancellation message to Mountain for a request previously initiated by Cocoon.
 * @param requestId The ID of the Cocoon-initiated request to cancel.
 */
export function sendCancelToMountain(requestId: number): void {
	if (!pendingRequests.has(requestId)) {
		console.warn(
			`[Cocoon IPC] Attempted to cancel non-existent or already completed request ID: ${requestId}. No CANCEL message sent.`,
		);

		return;
	}

	const cancelMessage: VineCancel = {
		msg_type: 5,

		id: requestId,

		method: null,

		params: null,
	};

	sendToMountainRaw(cancelMessage);

	// Log the cancellation attempt. The actual promise resolution/rejection for this request
	// will still depend on Mountain's acknowledgment of the cancel (e.g., via an error response) or timeout.
	const pendingEntry = pendingRequests.get(requestId);

	console.log(
		`[Cocoon IPC] Sent CANCEL for Cocoon-initiated request ID: ${requestId} (Method: ${pendingEntry?.methodForLog}).`,
	);
}

// --- RPC Protocol Adapter ---
let rpcMessagePassingProtocolInstance: IMessagePassingProtocol | null = null;

/** Callback to be invoked when RPC data (as a base64 string) is received from Mountain. */
let rpcAdapterReceiveDataCallback: ((base64Buffer: string) => void) | null =
	null;

/**
 * Creates or returns a singleton instance of an `IMessagePassingProtocol` adapter.
 * This adapter allows VS Code's `RPCProtocol` to communicate over the Vine IPC channel
 * by tunneling `VSBuffer` data within Vine notifications (method: "rpcData").
 * @returns An `IMessagePassingProtocol` instance.
 */
export function createHostProtocolInterface(): IMessagePassingProtocol {
	if (rpcMessagePassingProtocolInstance) {
		return rpcMessagePassingProtocolInstance;
	}

	console.log(
		"[Cocoon IPC] Creating RPCProtocol Adapter (IMessagePassingProtocol) for communication with host...",
	);

	// Emitter for incoming RPC data buffers
	const onMessageEvent = new VscodeEmitter<VSBuffer>();

	/** Handles sending a VSBuffer from RPCProtocol to Mountain. */
	const sendBufferToMountainViaNotification = (buffer: VSBuffer): void => {
		try {
			// Convert VSBuffer to Node.js Buffer, then to base64 string for JSON transport.
			const base64Encoded = Buffer.from(
				buffer.buffer,

				buffer.byteOffset,

				buffer.byteLength,
			).toString("base64");

			sendNotificationToMountain("rpcData", { buffer: base64Encoded });
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to serialize and send VSBuffer to Mountain:",

				e.message,

				e.stack,
			);
		}
	};

	// This callback is set here and will be called by the main lineReader when an "rpcData"
	// notification arrives from Mountain.
	rpcAdapterReceiveDataCallback = (base64Buffer: string): void => {
		try {
			const nodeBuffer = Buffer.from(base64Buffer, "base64");

			onMessageEvent.fire(VSBuffer.wrap(nodeBuffer));
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to decode/emit received RPC VSBuffer from Mountain:",

				e.message,

				e.stack,
			);
		}
	};

	rpcMessagePassingProtocolInstance = {
		send: sendBufferToMountainViaNotification,

		onMessage: onMessageEvent.event,

		// For MVP, we don't explicitly signal dispose from this adapter side.
		// The connection is considered alive as long as stdio is open.
		onDidDispose: VscodeEvent.None,
	};

	return rpcMessagePassingProtocolInstance;
}

// --- Stdio Listener Setup ---
const lineReader = readline.createInterface({
	input: process.stdin,

	// `output` is required by `readline.createInterface` but not used for IPC output here,

	// as `sendToMountainRaw` writes directly to `process.stdout`.
	output: process.stdout,

	// Important for non-interactive stdio processing.
	terminal: false,
});

console.log(
	"[Cocoon IPC] Setting up stdin listener for messages from Mountain...",
);

lineReader.on("line", (line: string) => {
	if (!line.trim()) {
		// Ignore empty lines which might occur.
		return;
	}

	try {
		const message = JSON.parse(line) as VineMessage;

		// Verbose raw message logging (uncomment for deep debugging):
		// const methodInfo = message.method ? ` Method=${message.method}` : "";

		// const idInfo = message.id !== null ? ` ID=${message.id}` : "";

		// console.log(`[Cocoon IPC <- Mtn] Raw: Type=${message.msg_type}${idInfo}${methodInfo}`);

		switch (message.msg_type) {
			// Response (Successful)
			case 3:

			// Error Response
			case 4:
				if (message.id !== null && pendingRequests.has(message.id)) {
					// Should always exist if in map
					const pending = pendingRequests.get(message.id)!;

					clearTimeout(pending.timeoutHandle);

					pendingRequests.delete(message.id);

					if (message.msg_type === 3) {
						// VineResponse
						// console.log(`[Cocoon IPC <- Mtn] Received RESULT for Request '${pending.methodForLog}' (ID ${message.id}).`);

						pending.resolve(
							message.params === undefined
								? null
								: message.params,
						);
					} else {
						// VineErrorResponse
						console.error(
							`[Cocoon IPC <- Mtn] Received ERROR for Request '${pending.methodForLog}' (ID ${message.id}):`,

							message.error,
						);

						// Construct a standard Error object from the payload
						const error = new Error(
							message.error?.message ||
								"Unknown error from Mountain",
						) as NodeJS.ErrnoException;

						if (message.error?.stack)
							error.stack = message.error.stack;

						if (message.error?.name)
							error.name = message.error.name;

						if (message.error?.code !== undefined)
							// Ensure code is string if present
							error.code = String(message.error.code);

						pending.reject(error);
					}
				} else {
					console.warn(
						`[Cocoon IPC <- Mtn] Received response/error for unknown, already processed, or timed-out Request ID: ${message.id}`,
					);
				}

				break;

			// Notification (from Mountain)
			case 6:
				// console.log(`[Cocoon IPC <- Mtn] Received NOTIFICATION: ${message.method}`);

				if (
					message.method === "rpcData" &&
					message.params?.buffer &&
					typeof message.params.buffer === "string"
				) {
					if (rpcAdapterReceiveDataCallback) {
						rpcAdapterReceiveDataCallback(message.params.buffer);
					} else {
						console.warn(
							"[Cocoon IPC <- Mtn] Received 'rpcData' notification, but RPC adapter callback is not set. RPC may not be initialized yet.",
						);
					}
				} else if (
					message.method === "$acceptConfigurationChanged" &&
					message.params
				) {
					internalAppEmitter.emit("configChanged", message.params);
				} else if (
					message.method === "$onDidChangeWorkspaceFolders" &&
					message.params
				) {
					internalAppEmitter.emit(
						"workspaceFoldersChanged",

						message.params,
					);
				} else {
					// Emit as a generic message for other handlers if any
					internalAppEmitter.emit("message", message);
				}

				break;

			// Request (from Mountain to Cocoon)
			case 1:
				// console.log(`[Cocoon IPC <- Mtn] Received REQUEST: ${message.method} (ID: ${message.id})`);

				// These requests are typically handled by the RPCProtocol server side in Cocoon,

				// or by specific listeners for non-RPC requests.
				internalAppEmitter.emit("message", message);

				break;

			// Cancellation (from Mountain, for a request Mountain sent to Cocoon)
			case 5:
				if (message.id !== null) {
					console.log(
						`[Cocoon IPC <- Mtn] Received CANCEL from Mountain for their Request ID: ${message.id}. Emitting 'cancel' event.`,
					);

					// This event would be listened to by whatever is handling requests from Mountain,

					// e.g., to cancel a long-running operation in a Cocoon service.
					internalAppEmitter.emit("cancel", message.id);
				} else {
					console.warn(
						"[Cocoon IPC <- Mtn] Received Cancel message from Mountain without a valid Request ID:",

						message,
					);
				}

				break;

			default:
				// Should not happen if Mountain sends valid messages.
				console.warn(
					"[Cocoon IPC <- Mtn] Received message from Mountain with unknown or invalid msg_type:",

					message,
				);

				break;
		}
	} catch (e: any) {
		// This indicates a malformed JSON line or an error in the dispatch logic.
		console.error(
			"[Cocoon IPC] Fatal error processing incoming line from Mountain:",

			e.message,

			e.stack,
		);

		console.error(
			"[Cocoon IPC] Offending line content (first 500 chars):",

			line.substring(0, 500),
		);
	}
});

lineReader.on("close", () => {
	console.log(
		"[Cocoon IPC] Stdin stream closed by Mountain. Cocoon process will now exit.",
	);

	// This is a definitive signal that the host process has terminated or closed the pipe.
	// Cocoon should exit cleanly. The `initializationFailedOrExited` flag in `index.ts`
	// might control `process.exit` patching, but direct exit here is appropriate
	// as the communication channel is gone.
	process.exit(0);
});

// --- Named Event Emitter Exports for typed, specific events ---

/**
 * Registers a listener for generic Vine messages (Requests or Notifications) received from Mountain.
 * @param listener Callback function to handle the message.
 * @returns An `IDisposable` to remove the listener.
 */
export function onMessageFromMountain(
	listener: (msg: VineMessage) => void,
): IDisposable {
	internalAppEmitter.on("message", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("message", listener),
	);
}

/**
 * Registers a listener for 'cancel' messages received from Mountain, indicating Mountain
 * wants to cancel a request it previously sent to Cocoon.
 * @param listener Callback function to handle the cancellation, taking the request ID.
 * @returns An `IDisposable` to remove the listener.
 */
export function onCancelFromMountain(
	listener: (requestId: number) => void,
): IDisposable {
	internalAppEmitter.on("cancel", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("cancel", listener),
	);
}

/**
 * Registers a listener for configuration change notifications from Mountain.
 * @param listener Callback function. `params` structure depends on the contract with Mountain,
 *
 *
 *                 typically `[newConfigSnapshot, changedKeysDetails]`.
 * @returns An `IDisposable` to remove the listener.
 */
export function onConfigurationChanged(
	listener: (
		params: /* e.g., [configSnapshot: any, changes: any] */ any,
	) => void,
): IDisposable {
	internalAppEmitter.on("configChanged", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("configChanged", listener),
	);
}

/**
 * Registers a listener for workspace folder change notifications from Mountain.
 * @param listener Callback function. `params` structure depends on the contract with Mountain,
 *
 *
 *                 typically an event object describing added/removed/changed folders.
 * @returns An `IDisposable` to remove the listener.
 */
export function onWorkspaceFoldersChanged(
	listener: (params: /* e.g., IWorkspaceFoldersChangeEventDto */ any) => void,
): IDisposable {
	internalAppEmitter.on("workspaceFoldersChanged", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("workspaceFoldersChanged", listener),
	);
}

// --- Default export containing the primary IPC functions and adapter factory ---
const ipcInterface = {
	sendToMountainAndWait,

	sendNotificationToMountain,

	sendResponseToMountain,

	sendCancelToMountain,

	createHostProtocolInterface,

	// Expose specific event listener registration functions directly for convenience
	onMessageFromMountain,

	onCancelFromMountain,

	onConfigurationChanged,

	onWorkspaceFoldersChanged,
};

export type CocoonPrimaryIpc = typeof ipcInterface;

export default ipcInterface;

console.log("[Cocoon IPC] IPC Layer Ready and listening on stdin/stdout.");
