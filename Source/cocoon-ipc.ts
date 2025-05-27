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
 *   RPC data (`VSBuffer`) is base64 encoded and transmitted within Vine notifications
 *   (method: "rpcData").
 * - Emitting specific internal events (e.g., for configuration changes, workspace folder
 *   changes, generic messages, cancellation requests from Mountain) for consumption by
 *   other parts of Cocoon (e.g., `index.ts`, shims, RPC server handlers).
 *
 * Key Interactions:
 * - Interacts directly with Node.js `process.stdin` and `process.stdout`.
 * - Uses Node.js `readline` module for efficient line-by-line processing of stdin.
 * - Manages a `Map` of pending requests for `sendToMountainAndWait`.
 * - Bridges VS Code's `RPCProtocol` by encoding/decoding `VSBuffer`s to/from base64
 *   strings transmitted within Vine notifications (method: "rpcData").
 * - Provides typed event subscription functions (`onConfigurationChanged`, etc.) for
 *   other Cocoon modules.
 *
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
// For typed RPC adapter events
import { toDisposable, type IDisposable } from "vs/base/common/lifecycle";
// For RPC adapter type. MessagePassingProtocol is not directly used but IMessagePassingProtocol is the interface.
import { type IMessagePassingProtocol } from "vs/workbench/services/extensions/common/rpcProtocol";

console.log("[Cocoon IPC] Initializing IPC layer...");

// --- Type Definitions for Vine Protocol ---

/** Defines the allowed message type identifiers for the Vine protocol. */
export type VineMsgType = 1 | 3 | 4 | 5 | 6;

/** Base structure for all Vine messages. */
export interface VineMessageBase {
	msg_type: VineMsgType;

	/** Unique identifier for requests and their corresponding responses/errors/cancellations. Null for notifications. */
	id: number | null;

	/** Method name for requests and notifications. Null for responses/errors/cancellations. */
	method: string | null;
}

/** Represents a request message (msg_type: 1). */
export interface VineRequest extends VineMessageBase {
	msg_type: 1;

	// Always present and unique for requests.
	id: number;

	// Always present, indicates the action to perform.
	method: string;

	// Payload/arguments for the method.
	params: any;
}

/** Represents a successful response message (msg_type: 3). */
export interface VineResponse extends VineMessageBase {
	msg_type: 3;

	// Corresponds to the ID of the original request.
	id: number;

	method: null;

	// Result payload of the request; can be `null` if the method returns void but was successful.
	params: any;

	error: null;
}

/** Structure for the error payload within a VineErrorResponse. */
export interface VineErrorPayload {
	message: string;

	stack?: string;

	name?: string;

	// e.g., 'ENOENT', or a custom numeric error code.
	code?: string | number;
}

/** Represents an error response message (msg_type: 4). */
export interface VineErrorResponse extends VineMessageBase {
	msg_type: 4;

	// Corresponds to the ID of the original request.
	id: number;

	method: null;

	params: null;

	// Detailed error information.
	error: VineErrorPayload;
}

/** Represents a cancellation message (msg_type: 5). */
export interface VineCancel extends VineMessageBase {
	// Used by the initiator to cancel a previously sent request.
	msg_type: 5;

	// ID of the request to cancel.
	id: number;

	method: null;

	params: null;
}

/** Represents a notification message (msg_type: 6). */
export interface VineNotification extends VineMessageBase {
	msg_type: 6;

	// Notifications do not have IDs as they don't expect responses.
	id: null;

	// Always present, indicates the nature of the notification.
	method: string;

	// Payload for the notification.
	params: any;
}

/** Union type representing any valid Vine protocol message. */
export type VineMessage =
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

// Increase max listeners if many parts of Cocoon subscribe to generic 'message' or specific events.
// internalAppEmitter.setMaxListeners(50);

// --- Core IPC Functions ---

/**
 * Sends a raw VineMessage object to the Mountain host process via stdout.
 * This is the lowest-level send function.
 * @param payload The VineMessage to send.
 */
function sendToMountainRaw(payload: VineMessage): void {
	try {
		const jsonString = JSON.stringify(payload);

		const methodInfo = payload.method ? ` Method=${payload.method}` : "";

		const idInfo = payload.id !== null ? ` ID=${payload.id}` : "";

		const logPayloadSummary =
			jsonString.length > 200
				? jsonString.substring(0, 200) +
					`... (len ${jsonString.length})`
				: jsonString;

		// Use console.debug or trace for very frequent messages to reduce log noise.
		console.debug(
			`[Cocoon IPC -> Mtn] Type=${payload.msg_type}${idInfo}${methodInfo}, Payload=${logPayloadSummary}`,
		);

		// Newline delimiter is crucial for Vine protocol.
		process.stdout.write(jsonString + "\n");
	} catch (e: any) {
		// This is a critical failure, as basic communication is broken.
		console.error(
			`[Cocoon IPC] FATAL: Failed to stringify/send payload (Type: ${payload?.msg_type}, Method: ${payload?.method}). Error:`,

			e.message,

			e.stack,
		);

		// Depending on Cocoon's overall error strategy, this might warrant a process exit or
		// an attempt to notify Mountain through an alternative channel if one existed.
	}
}

/**
 * Sends a request to Mountain and returns a Promise that resolves with the response
 * or rejects on error or timeout.
 * @param method The method name for the request (e.g., "fs_stat", "ui_showQuickPick").
 * @param params The parameters/payload for the request.
 * @param timeoutMs The timeout duration in milliseconds for awaiting a response. Defaults to 5000ms.
 * @returns A Promise resolving with the response parameters from Mountain, or rejecting with an Error.
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

				const timeoutError = new Error(errorMsg);

				// Common error code for timeouts
				(timeoutError as NodeJS.ErrnoException).code = "ETIMEDOUT";

				reject(timeoutError);
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
 * @param method The method name for the notification (e.g., "rpcData", "extensionActivationResult").
 * @param params The parameters/payload for the notification.
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
 * This is used when Mountain initiates a request to Cocoon (e.g., via RPC call to an ExtHost service).
 * @param requestId The ID of the request from Mountain that is being responded to.
 * @param result The result payload if the request was successful.
 * @param errorObj The error details if the request failed. Can be an `Error` instance,
 *
 *                 a string message, or a pre-formed `VineErrorPayload`.
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
			// Error response
			msg_type: 4,

			id: requestId,

			method: null,

			params: null,

			error: vineErrorPayload,
		};
	} else {
		responseMessage = {
			// Successful response
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
			`[Cocoon IPC] Attempted to cancel non-existent or already completed/timed-out Cocoon-initiated request ID: ${requestId}. No CANCEL message sent.`,
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

	const pendingEntry = pendingRequests.get(requestId);

	console.log(
		`[Cocoon IPC] Sent CANCEL message to Mountain for Cocoon-initiated request ID: ${requestId} (Method: ${pendingEntry?.methodForLog}). ` +
			`Resolution of this request now depends on Mountain's handling of the cancellation or eventual timeout.`,
	);

	// Note: The promise in pendingRequests still exists. Mountain might respond with an error due to cancellation,

	// or the original request might still time out if Mountain doesn't acknowledge the cancel.
}

// --- RPC Protocol Adapter ---
let rpcMessagePassingProtocolInstance: IMessagePassingProtocol | null = null;

/** Callback to be invoked when RPC data (as a base64 string) is received from Mountain via an "rpcData" notification. */
let rpcAdapterReceiveDataCallback:
	| ((base64EncodedBuffer: string) => void)
	| null = null;

/**
 * Creates or returns a singleton instance of an `IMessagePassingProtocol` adapter.
 * This adapter allows VS Code's `RPCProtocol` to communicate over the Vine IPC channel
 * by tunneling `VSBuffer` data within Vine notifications (method: "rpcData").
 * `VSBuffer`s sent by `RPCProtocol` are base64 encoded into strings for JSON transport,
 *
 * and incoming base64 strings are decoded back into `VSBuffer`s.
 * @returns An `IMessagePassingProtocol` instance suitable for `RPCProtocol`.
 */
export function createHostProtocolInterface(): IMessagePassingProtocol {
	if (rpcMessagePassingProtocolInstance) {
		return rpcMessagePassingProtocolInstance;
	}

	console.log(
		"[Cocoon IPC] Creating RPCProtocol Adapter (IMessagePassingProtocol) for communication with Mountain host...",
	);

	// Emitter for incoming RPC data buffers
	const onMessageEvent = new VscodeEmitter<VSBuffer>();

	/** Handles sending a VSBuffer from RPCProtocol to Mountain via a Vine notification. */
	const sendBufferToMountainViaNotification = (buffer: VSBuffer): void => {
		try {
			// Convert VSBuffer to Node.js Buffer, then to base64 string for JSON transport.
			const base64Encoded = Buffer.from(
				buffer.buffer,

				// Use byteOffset and byteLength for correct slicing if buffer is a view
				buffer.byteOffset,

				buffer.byteLength,
			).toString("base64");

			sendNotificationToMountain("rpcData", { buffer: base64Encoded });
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to serialize and send VSBuffer to Mountain via 'rpcData' notification:",

				e.message,

				e.stack,
			);
		}
	};

	// This callback is set here and will be invoked by the main lineReader logic
	// when an "rpcData" notification arrives from Mountain.
	rpcAdapterReceiveDataCallback = (base64EncodedBuffer: string): void => {
		try {
			const nodeBuffer = Buffer.from(base64EncodedBuffer, "base64");

			// Wrap Node.js Buffer in VSBuffer
			onMessageEvent.fire(VSBuffer.wrap(nodeBuffer));
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to decode/emit received RPC VSBuffer from Mountain ('rpcData' notification):",

				e.message,

				e.stack,
			);
		}
	};

	rpcMessagePassingProtocolInstance = {
		send: sendBufferToMountainViaNotification,

		onMessage: onMessageEvent.event,

		// For MVP, we don't explicitly signal dispose from this adapter side.
		// The connection is considered alive as long as stdio is open and Cocoon is running.
		// If needed, a dispose mechanism for the RPC adapter could be added.
		onDidDispose: VscodeEvent.None,
	};

	return rpcMessagePassingProtocolInstance;
}

// --- Stdio Listener Setup ---
const lineReader = readline.createInterface({
	input: process.stdin,

	// `output` is required by `readline.createInterface` but not used for IPC output here,

	// as `sendToMountainRaw` writes directly to `process.stdout`.
	// Setting to null or undefined if readline allows, or a dummy stream, to avoid unintentional writes.
	// Still required, but we won't use its output capabilities for IPC.
	output: process.stdout,

	// Important for non-interactive stdio processing.
	terminal: false,
});

console.log(
	"[Cocoon IPC] Setting up stdin listener for messages from Mountain...",
);

lineReader.on("line", (line: string) => {
	if (!line.trim()) {
		// Ignore empty lines which might occasionally occur.
		return;
	}

	try {
		// Parse the incoming JSON line.
		const message = JSON.parse(line) as VineMessage;

		// Verbose raw message logging (uncomment for deep debugging if needed):
		// const methodInfoForLog = message.method ? ` Method=${message.method}` : "";

		// const idInfoForLog = message.id !== null ? ` ID=${message.id}` : "";

		// console.debug(`[Cocoon IPC <- Mtn] RawMsg: Type=${message.msg_type}${idInfoForLog}${methodInfoForLog}`);

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
						// VineResponse (Success)
						// console.debug(`[Cocoon IPC <- Mtn] Received RESULT for Request '${pending.methodForLog}' (ID ${message.id}).`);

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

						// Construct a standard Error object from the payload for consistent error handling.
						const error = new Error(
							message.error?.message ||
								"Unknown error from Mountain",
						) as NodeJS.ErrnoException;

						if (message.error?.stack)
							error.stack = message.error.stack;

						if (message.error?.name)
							error.name = message.error.name;

						if (message.error?.code !== undefined)
							// Ensure code is string type
							error.code = String(message.error.code);

						pending.reject(error);
					}
				} else {
					console.warn(
						`[Cocoon IPC <- Mtn] Received response/error for unknown, already processed, or timed-out Request ID: ${message.id}. Discarding.`,
					);
				}

				break;

			// Notification (from Mountain)
			case 6:
				// console.debug(`[Cocoon IPC <- Mtn] Received NOTIFICATION: Method='${message.method}'`);

				if (
					message.method === "rpcData" &&
					message.params?.buffer &&
					typeof message.params.buffer === "string"
				) {
					if (rpcAdapterReceiveDataCallback) {
						rpcAdapterReceiveDataCallback(message.params.buffer);
					} else {
						console.warn(
							"[Cocoon IPC <- Mtn] Received 'rpcData' notification, but RPC adapter callback is not set up. RPC communication might not be initialized yet or there's an issue in setup.",
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
					// Emit as a generic 'message' event for other potential handlers (e.g., custom notifications)
					internalAppEmitter.emit("message", message);
				}

				break;

			// Request (from Mountain to Cocoon)
			case 1:
				// console.debug(`[Cocoon IPC <- Mtn] Received REQUEST: Method='${message.method}' (ID: ${message.id})`);

				// These requests are typically handled by the RPCProtocol server-side logic in Cocoon
				// (e.g., when an ExtHost service method is called by a MainThread proxy).
				// The `RPCProtocol` instance itself listens for these via the `IMessagePassingProtocol` adapter.
				// Emitting as a generic 'message' allows `RPCProtocol` or other handlers to pick it up.
				internalAppEmitter.emit("message", message);

				break;

			// Cancellation (from Mountain, for a request Mountain sent to Cocoon)
			case 5:
				if (message.id !== null) {
					// console.debug(`[Cocoon IPC <- Mtn] Received CANCEL message from Mountain for their Request ID: ${message.id}. Emitting 'cancelRequestFromMountain' event.`);

					// This event would be listened to by whatever is handling requests *from* Mountain,

					// e.g., to cancel a long-running operation in a Cocoon service that was invoked by Mountain.
					internalAppEmitter.emit(
						"cancelRequestFromMountain",

						message.id,
					);
				} else {
					console.warn(
						"[Cocoon IPC <- Mtn] Received Cancel message from Mountain without a valid Request ID (message.id was null):",

						message,
					);
				}

				break;

			default:
				// This case should ideally not be reached if Mountain sends valid Vine messages.
				console.warn(
					"[Cocoon IPC <- Mtn] Received message from Mountain with unknown or invalid msg_type:",

					message,
				);

				break;
		}
	} catch (e: any) {
		// This indicates a malformed JSON line or an error in the dispatch logic itself.
		console.error(
			"[Cocoon IPC] Fatal error processing incoming line from Mountain. This may indicate a protocol mismatch or corrupted data stream.",

			"Error:",

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

	// This is a definitive signal that the host process has terminated or closed the communication channel.
	// Cocoon should exit cleanly. The `initializationFailedOrExited` flag in `index.ts` might
	// control `process.exit` patching behavior, but a direct exit here is appropriate
	// as the primary communication channel is gone.
	process.exit(0);
});

// --- Named Event Emitter Exports for typed, specific events ---

/**
 * Registers a listener for generic Vine messages (Requests or Notifications other than 'rpcData',
 *
 * 'configChanged', or 'workspaceFoldersChanged') received from Mountain.
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
 * Registers a listener for 'cancelRequestFromMountain' events. This event fires when Mountain
 * sends a cancellation (VineMsgType 5) for a request it previously initiated towards Cocoon.
 * @param listener Callback function to handle the cancellation, taking the request ID to be cancelled.
 * @returns An `IDisposable` to remove the listener.
 */
export function onCancelRequestFromMountain(
	listener: (requestId: number) => void,
): IDisposable {
	internalAppEmitter.on("cancelRequestFromMountain", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener(
			"cancelRequestFromMountain",

			listener,
		),
	);
}

/**
 * Placeholder type for configuration change event parameters.
 * This should be refined based on the actual DTO structure sent by Mountain.
 * Example: `[newConfigSnapshot: any, changedKeysDetails: { keys: string[], overrides: [string, string[]][] } | undefined]`
 */
export type ConfigurationChangeEventParams = [any, any | undefined];

/**
 * Registers a listener for configuration change notifications from Mountain
 * (method: "$acceptConfigurationChanged").
 * @param listener Callback function. The `params` argument structure depends on the
 *                 contract with Mountain; typically an array: `[newConfigSnapshot, changedKeysDetails]`.
 * @returns An `IDisposable` to remove the listener.
 */
export function onConfigurationChanged(
	listener: (params: ConfigurationChangeEventParams) => void,
): IDisposable {
	internalAppEmitter.on("configChanged", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("configChanged", listener),
	);
}

/**
 * Placeholder type for workspace folders change event parameters.
 * This should be refined based on the actual DTO structure sent by Mountain
 * (e.g., `IWorkspaceFoldersChangeEventDto` from VS Code protocol).
 */
export type WorkspaceFoldersChangeEventParams = any;

/**
 * Registers a listener for workspace folder change notifications from Mountain
 * (method: "$onDidChangeWorkspaceFolders").
 * @param listener Callback function. The `params` argument structure depends on the
 *                 contract with Mountain; typically an event object describing
 *                 added, removed, or changed workspace folders.
 * @returns An `IDisposable` to remove the listener.
 */
export function onWorkspaceFoldersChanged(
	listener: (params: WorkspaceFoldersChangeEventParams) => void,
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

	// Expose specific event listener registration functions directly for convenience and type safety
	onMessageFromMountain,

	onCancelRequestFromMountain,

	onConfigurationChanged,

	onWorkspaceFoldersChanged,
};

/**
 * Type definition for the primary Cocoon IPC interface, allowing other modules
 * to type their dependency on this IPC layer.
 */
export type CocoonPrimaryIpc = typeof ipcInterface;

export default ipcInterface;

console.log("[Cocoon IPC] IPC Layer Ready and listening on stdin/stdout.");
