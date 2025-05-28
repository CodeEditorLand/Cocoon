/*---------------------------------------------------------------------------------------------
 * Cocoon Vine IPC Implementation (cocoon-ipc.ts)
 * --------------------------------------------------------------------------------------------
 * This module implements the Cocoon-side (Extension Host / Node.js sidecar process)
 * of the "Vine" Inter-Process Communication (IPC) protocol. It is responsible for
 * handling all communication with the Mountain host process (the main application,
 * e.g., a Tauri Rust backend or Electron main process) over stdio (standard input
 * and standard output). Communication occurs via newline-delimited JSON messages.
 *
 * This module also provides the crucial adapter layer required for VS Code's standard
 * `RPCProtocol` to function over this custom Vine IPC transport. This enables VS Code's
 * well-established RPC mechanisms to be used for structured communication between
 * Cocoon (ExtHost) and Mountain (MainThread).
 *
 * Vine Message Types (identified by the `msg_type` field):
 * - `1` (Request): A message initiated by either Cocoon or Mountain that expects a response.
 *   Contains a unique `id` and a `method` name with `params`.
 * - `3` (Response): A message indicating a successful result to a prior Request.
 *   Contains the `id` of the original request and the result in `params`.
 * - `4` (Error): A message indicating an error response to a prior Request.
 *   Contains the `id` of the original request and error details in `error`.
 * - `5` (Cancel): A message used by either peer to indicate cancellation.
 *   - If Cocoon sends a Cancel (ID `X`) to Mountain: It's for a request Cocoon previously sent with ID `X`.
 *   - If Mountain sends a Cancel (ID `Y`) to Cocoon: It's for an operation Mountain previously
 *     asked Cocoon to perform (e.g., via an RPC call that was assigned `tokenId = Y`). This
 *     triggers cancellation in Cocoon via the `CancellationTokenRegistry`.
 * - `6` (Notification): A fire-and-forget message that does not expect a response.
 *   Can be sent by either Cocoon or Mountain. Contains a `method` name and `params`.
 *
 * Core Responsibilities:
 * - Stdio Handling:
 *   - Reads newline-delimited JSON messages from `process.stdin` (data coming from Mountain).
 *   - Writes newline-delimited JSON messages to `process.stdout` (data going to Mountain).
 *   - Uses Node.js `readline` module for efficient line-by-line processing of `stdin`.
 * - Message Parsing and Routing:
 *   - Parses incoming JSON strings into `VineMessage` objects.
 *   - Routes these messages based on their `msg_type` to appropriate handlers
 *     (e.g., resolving pending promises for responses, emitting events for notifications,
 *      triggering cancellation via `CancellationTokenRegistry`).
 * - Request-Response Lifecycle Management:
 *   - Generates unique `id`s for outgoing requests initiated by Cocoon.
 *   - Maintains a `Map` of pending outgoing requests (`pendingRequests`).
 *   - Matches incoming responses/errors from Mountain to their corresponding pending requests.
 *   - Implements timeouts for outgoing requests to prevent indefinite blocking.
 * - Core IPC Functions:
 *   - `sendToMountainAndWait(methodName, parameters, timeoutMilliseconds)`: Sends a Request to Mountain
 *     and returns a Promise that resolves with the response or rejects on error/timeout.
 *   - `sendNotificationToMountain(methodName, parameters)`: Sends a Notification to Mountain.
 *   - `sendResponseToMountain(requestIdFromMountain, resultPayload, errorObject)`: Sends a Response or Error
 *     to Mountain for a request that Mountain had previously sent to Cocoon.
 *   - `sendCancelToMountain(requestIdToCancel)`: Sends a Cancel message to Mountain for a
 *     request that Cocoon had previously initiated.
 * - RPCProtocol Adapter (`createHostProtocolInterface`):
 *   - Provides an adapter that conforms to VS Code's `IMessagePassingProtocol` interface.
 *   - This allows `RPCProtocol` (from `vs/workbench/services/extensions/common/rpcProtocol`)
 *     to operate over the Vine IPC transport.
 *   - RPC data (`VSBuffer`) is base64 encoded and transmitted within Vine notifications
 *     that have the method name "rpcData".
 * - Internal Event Emission and Handling:
 *   - Emits specific internal events (e.g., for configuration changes, workspace folder
 *     changes, generic messages from Mountain, cancellation requests from Mountain)
 *     using a Node.js `EventEmitter`.
 *   - These events are consumed by other parts of Cocoon (e.g., `index.ts` for bootstrapping,
 *     service shims for reacting to MainThread updates, RPC server handlers for incoming
 *     requests from Mountain).
 *   - Handles incoming cancellation messages (VineMsgType 5) from Mountain by invoking
 *     `cancel()` on the `CancellationTokenRegistry` with the provided ID (which is
 *     interpreted as a `tokenId` for an operation Cocoon is performing for Mountain).
 *
 * Key Interactions and Dependencies:
 * - Directly interacts with Node.js `process.stdin` and `process.stdout` for communication.
 * - Depends on `CancellationTokenRegistry` (provided via `initializeIpcCancellation`) to
 *   process cancellation requests originating from Mountain.
 * - Used by `index.ts` to set up the primary RPC channel for the extension host.
 * - Service shims (e.g., `ShimExtHostConfiguration`, `ShimExtHostWorkspace`) subscribe
 *   to its typed events (`onConfigurationChanged`, `onWorkspaceFoldersChanged`) to
 *   stay synchronized with Mountain's state.
 *--------------------------------------------------------------------------------------------*/

// --- Node.js Core Module Imports ---
import { EventEmitter } from "events"; // For internal event distribution within Cocoon.
import * as readline from "readline"; // For reading stdin line by line efficiently.

// --- VS Code Common Utility Imports ---
// These are from VS Code's base or platform layers, assumed to be available in Cocoon's environment.
import { VSBuffer } from "vs/base/common/buffer"; // VS Code's custom buffer implementation.
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event"; // VS Code's typed event system.
import { toDisposable, type IDisposable } from "vs/base/common/lifecycle"; // For creating disposable event listeners.

// `IMessagePassingProtocol` is the interface that `RPCProtocol` expects for its transport layer.
import { type IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc";
// --- VS Code Protocol DTO Imports ---
// These are Data Transfer Object types typically defined in `extHost.protocol.ts` or similar,
// used for structured data in typed event payloads.
import type {
	IConfigurationChange, // Describes changes in configuration settings.
	IConfigurationInitData, // Represents the initial full configuration snapshot.
	IWorkspaceFoldersChangeEventData, // Describes changes to workspace folders (added, removed, changed).
} from "vs/workbench/api/common/extHost.protocol";

// --- Cocoon Specific Imports ---
// For handling cancellation requests. The actual instance is provided via `initializeIpcCancellation`.
import type { CancellationTokenRegistry } from "./cancellation-token-registry";

// Initial log message indicating that this IPC module is being loaded and initialized.
console.log(
	"[Cocoon IPC] Initializing Vine IPC layer for communication with Mountain...",
);

// --- Type Definitions for the Vine Protocol ---

/**
 * Defines the allowed numeric identifiers for different types of Vine messages.
 * Each number corresponds to a specific message structure and purpose in the protocol.
 */
export type VineMsgType =
	| 1 // Request: A message expecting a response.
	| 3 // Response: A successful reply to a Request.
	| 4 // Error: An error reply to a Request.
	| 5 // Cancel: A message to request cancellation of an operation.
	| 6; // Notification: A fire-and-forget message, no response expected.

/**
 * Base structure common to all Vine protocol messages.
 * Contains fields that help identify and route the message.
 */
export interface VineMessageBase {
	/** The type of the message, determining its specific structure and handling logic. */
	msg_type: VineMsgType;
	/**
	 * Unique identifier for Request messages and their corresponding Response, Error, or Cancel messages.
	 * This is `null` for Notification messages, as they do not solicit a direct reply linked by ID.
	 */
	id: number | null;
	/**
	 * The name of the method or action being requested (for Requests) or notified (for Notifications).
	 * This is `null` for Response, Error, or Cancel messages, as they are tied to an original request via its `id`.
	 */
	method: string | null;
}

/**
 * Represents a Request message (msg_type: 1) sent from one peer to another,
 * expecting a response (either a successful VineResponse or an VineErrorResponse).
 */
export interface VineRequest extends VineMessageBase {
	msg_type: 1; // Identifies this message specifically as a Request.
	id: number; // A unique identifier for this request, generated by the sender. Used to correlate responses.
	method: string; // The name of the method or action to be invoked on the receiving peer.
	params: any; // The parameters or payload for the method. Can be any JSON-serializable type.
}

/**
 * Represents a successful Response message (msg_type: 3) sent in reply to a previously received VineRequest.
 */
export interface VineResponse extends VineMessageBase {
	msg_type: 3; // Identifies this message specifically as a successful Response.
	id: number; // The ID of the original VineRequest this response corresponds to.
	method: null; // The `method` field is not applicable for responses.
	params: any; // The result payload of the successfully executed request. Can be `null` if the method returns void but was successful.
	error: null; // The `error` field must be `null` for successful responses.
}

/**
 * Structure for the error payload contained within a `VineErrorResponse`.
 * This structure aims for compatibility with VS Code's `SerializedError` format
 * for consistency in error reporting across RPC boundaries.
 */
export interface VineErrorPayload {
	message: string; // The primary human-readable error message.
	stack?: string; // Optional stack trace string for the error, aiding in debugging.
	name?: string; // Optional name of the error (e.g., 'TypeError', 'FileNotFoundError', 'CustomDomainError').
	code?: string | number; // Optional error code (e.g., 'ENOENT' for file system errors, or a custom numeric/string error code).
	$isError?: boolean; // A convention from VS Code: a marker indicating this object represents a serialized error.
}

/**
 * Represents an Error Response message (msg_type: 4) sent in reply to a VineRequest that
 * failed to execute successfully on the receiving peer.
 */
export interface VineErrorResponse extends VineMessageBase {
	msg_type: 4; // Identifies this message specifically as an Error Response.
	id: number; // The ID of the original VineRequest this error response corresponds to.
	method: null; // The `method` field is not applicable for error responses.
	params: null; // The `params` field must be `null` for error responses.
	error: VineErrorPayload; // An object containing detailed information about the error that occurred.
}

/**
 * Represents a Cancellation message (msg_type: 5).
 * This message type is used to request the cancellation of an ongoing operation
 * associated with a specific request ID.
 * - If Cocoon sends a Cancel (with ID `X`) to Mountain: It's a request to cancel a
 *   long-running operation that Cocoon had previously asked Mountain to perform (via a
 *   VineRequest with ID `X`).
 * - If Mountain sends a Cancel (with ID `Y`) to Cocoon: It's a request for Cocoon to
 *   cancel an operation that Cocoon is currently performing at Mountain's behest (e.g.,
 *   an operation triggered by an RPC call from Mountain to an ExtHost service, where
 *   `Y` would be the `tokenId` associated with that RPC call for cancellation purposes).
 *   This is handled by Cocoon's `CancellationTokenRegistry`.
 */
export interface VineCancel extends VineMessageBase {
	msg_type: 5; // Identifies this message specifically as a Cancel request.
	id: number; // The ID of the original request or operation whose cancellation is being requested.
	method: null; // The `method` field is not applicable for cancellation messages.
	params: null; // The `params` field is not applicable for cancellation messages.
}

/**
 * Represents a Notification message (msg_type: 6). Notifications are fire-and-forget;
 * they do not solicit a response and do not have an `id` to correlate responses.
 */
export interface VineNotification extends VineMessageBase {
	msg_type: 6; // Identifies this message specifically as a Notification.
	id: null; // Notifications do not have IDs.
	method: string; // The name of the notification, indicating its purpose or the type of event being signaled.
	params: any; // The payload or data associated with the notification. Can be any JSON-serializable type.
}

/** A discriminated union type representing any valid Vine protocol message. */
export type VineMessage =
	| VineRequest
	| VineResponse
	| VineErrorResponse
	| VineCancel
	| VineNotification;

/**
 * Structure used to hold the state for pending outgoing requests that were initiated
 * by Cocoon and are currently awaiting responses from Mountain.
 */
interface PendingRequestEntry {
	resolve: (value: any) => void; // Callback function to resolve the Promise when a successful response is received.
	reject: (reason?: any) => void; // Callback function to reject the Promise on error or timeout.
	timeoutHandle: NodeJS.Timeout; // Handle for the `setTimeout` timer associated with this request, for cancellation.
	methodForLog: string; // The method name of the request, stored for logging purposes (especially useful on timeout).
}

// --- Module-Scoped State Variables ---

/**
 * A `Map` to store pending outgoing requests initiated by Cocoon.
 * - Key: The unique request ID (number).
 * - Value: A `PendingRequestEntry` object containing the promise callbacks and timeout handle.
 */
const pendingRequests = new Map<number, PendingRequestEntry>();

/** A counter for generating unique, sequentially incrementing IDs for outgoing requests from Cocoon. */
let nextRequestId = 1;

/**
 * A Node.js `EventEmitter` instance used as an internal event bus within Cocoon.
 * It distributes specific incoming messages or notifications received from Mountain
 * (e.g., configuration changes, workspace folder updates, raw messages) to various
 * subscribed modules or components within Cocoon.
 */
const internalAppEmitter = new EventEmitter();
// Note: The default maximum number of listeners for an EventEmitter is 10.
// If more than 10 components in Cocoon subscribe to the same event type on `internalAppEmitter`
// (e.g., a generic 'message' event, though specific typed events are generally preferred),
// this limit might need to be increased using `internalAppEmitter.setMaxListeners(desiredNumber)`.
// Using specific, typed event emitters (like VSCodeEmitter from `vs/base/common/event`) for
// different, well-defined event types is often a better pattern for larger applications,
// as it provides better type safety and modularity.

/**
 * A global-like reference to the `CancellationTokenRegistry` instance.
 * This is initialized by calling `initializeIpcCancellation` from `index.ts` after the
 * registry has been instantiated via DI. It's used by this IPC layer to process
 * cancellation requests (VineMsgType 5) received from Mountain.
 */
let globalCancellationTokenRegistry: CancellationTokenRegistry | null = null;

// --- Core IPC Communication Functions ---

/**
 * Sends a raw `VineMessage` object (already serialized to JSON) to the Mountain host
 * process via `process.stdout`. This is the lowest-level function for transmitting
 * messages from Cocoon to Mountain. All outgoing messages ultimately pass through this function.
 *
 * @param vineMessagePayload - The `VineMessage` object to be serialized and sent.
 */
function sendToMountainRaw(vineMessagePayload: VineMessage): void {
	try {
		// Serialize the VineMessage object to a JSON string.
		const jsonStringToSend = JSON.stringify(vineMessagePayload);

		// Prepare informational strings about the message for logging purposes.
		const methodInfoForLog = vineMessagePayload.method
			? ` Method=${vineMessagePayload.method}`
			: "";
		const idInfoForLog =
			vineMessagePayload.id !== null
				? ` ID=${vineMessagePayload.id}`
				: "";

		// For logging, truncate very long JSON payloads to avoid flooding the console.
		// The threshold (200 characters) and truncation logic might need to be configurable
		// or more sophisticated depending on debugging needs and payload characteristics.
		const payloadSummaryForLog =
			jsonStringToSend.length > 200
				? jsonStringToSend.substring(0, 200) +
					`... (total length ${jsonStringToSend.length})`
				: jsonStringToSend;

		// Log the outgoing message. Using `console.debug` or `console.trace` allows these
		// logs to be filtered out in production environments if desired.
		console.debug(
			// Consider `console.trace` for even less noise by default.
			`[Cocoon IPC -> Mtn] Type=${vineMessagePayload.msg_type}${idInfoForLog}${methodInfoForLog}, PayloadSummary=${payloadSummaryForLog}`,
		);

		// Write the JSON string to `process.stdout`, followed by a newline character.
		// The newline delimiter is crucial for the Vine protocol, as it allows the receiving
		// end (Mountain) to parse messages reliably on a line-by-line basis from its stdin.
		process.stdout.write(jsonStringToSend + "\n");
	} catch (error: any) {
		// This block handles errors during JSON stringification or writing to stdout.
		// Such errors are critical as they indicate a breakdown in the IPC mechanism.
		// A common cause for `JSON.stringify` failure is attempting to serialize an object
		// that is not JSON-compatible (e.g., an object with circular references, functions,
		// `undefined` values in arrays if strict JSON is expected, or other unsupported types).
		console.error(
			`[Cocoon IPC] FATAL ERROR: Failed to stringify and/or send payload to Mountain. ` +
				`This typically means a non-JSON-serializable object was included in the message parameters. ` +
				`Message Type: ${vineMessagePayload?.msg_type}, Method: ${vineMessagePayload?.method}, ID: ${vineMessagePayload?.id}. ` +
				`Error details: ${error.message}`,
			// Including the stack trace can be very helpful for debugging the source of the non-serializable data.
			// `error.stack`, // Uncomment if stack trace is needed.
			// Logging the problematic payload (or a summary) can be extremely useful for debugging,
			// but it carries a risk if the payload might contain sensitive data.
			// In production, consider logging only keys, structure, or a heavily sanitized summary.
			// Example (use with caution):
			// "Problematic payload (first 500 characters, potentially sensitive):", JSON.stringify(vineMessagePayload)?.substring(0, 500)
		);

		// Depending on Cocoon's overall error handling strategy, such a fatal IPC error might
		// warrant terminating the Cocoon process, or attempting to notify Mountain through an
		// alternative channel if one existed (which is unlikely for stdio-based IPC).
		// For now, the error is logged, and Cocoon might become unresponsive to Mountain.
	}
}

/**
 * Sends a request message (VineRequest) to the Mountain host process and returns a Promise.
 * The Promise resolves with the response payload from Mountain if the request is successful,
 * or rejects if an error response is received from Mountain or if the request times out.
 *
 * @param methodName - The name of the method to be invoked on Mountain (e.g., "fileSystem_readFile", "ui_showQuickPickDialog").
 * @param parameters - The parameters or payload for the request. This must be a JSON-serializable object or value.
 * @param timeoutMilliseconds - The duration in milliseconds to wait for a response from Mountain
 *                              before rejecting the promise with a timeout error.
 *                              Defaults to 5000ms (5 seconds).
 * @returns A Promise that resolves with the response parameters from Mountain, or rejects with an `Error` object.
 */
export function sendToMountainAndWait(
	methodName: string,
	parameters: any,
	timeoutMilliseconds: number = 5000, // Default timeout duration.
): Promise<any> {
	return new Promise((resolvePromiseCallback, rejectPromiseCallback) => {
		// Generate a unique, incrementing ID for this outgoing request.
		const currentRequestId = nextRequestId++;

		// Construct the VineRequest message object.
		const requestMessageToSend: VineRequest = {
			msg_type: 1, // Identifies this as a Request.
			id: currentRequestId,
			method: methodName,
			params: parameters,
		};

		// Set up a timeout for this request. If Mountain doesn't respond within `timeoutMilliseconds`,
		// the promise will be rejected.
		const timeoutHandle = setTimeout(() => {
			// This function executes if the timeout duration elapses before a response is received for `currentRequestId`.
			if (pendingRequests.has(currentRequestId)) {
				// Check if the request is still marked as pending.
				// If it's still pending, it means no response was received in time.
				pendingRequests.delete(currentRequestId); // Remove it from the map of pending requests.

				const timeoutErrorMessage =
					`[Cocoon IPC] Request ${currentRequestId} (Method: '${methodName}') to Mountain timed out after ${timeoutMilliseconds}ms. ` +
					`No response received from host.`;
				console.error(timeoutErrorMessage);

				// Create an error object similar to Node.js timeout errors for consistency.
				const requestTimeoutError = new Error(timeoutErrorMessage);
				(requestTimeoutError as NodeJS.ErrnoException).code =
					"ETIMEDOUT"; // Standard error code for timeout.
				rejectPromiseCallback(requestTimeoutError); // Reject the promise with the timeout error.
			}
			// If `pendingRequests.has(currentRequestId)` is false, it means a response was received
			// just before the timeout fired, and the entry was already cleared. In this case, do nothing here.
		}, timeoutMilliseconds);

		// Store the promise's `resolve` and `reject` functions, along with the `timeoutHandle`
		// and `methodName` (for logging), in the `pendingRequests` map. This allows the incoming
		// message handler to correlate responses from Mountain with the correct pending promise.
		pendingRequests.set(currentRequestId, {
			resolve: resolvePromiseCallback,
			reject: rejectPromiseCallback,
			timeoutHandle: timeoutHandle,
			methodForLog: methodName, // Store method name for more informative logging, especially on timeout.
		});

		// Send the actual request message to Mountain.
		sendToMountainRaw(requestMessageToSend);
	});
}

/**
 * Sends a fire-and-forget notification message (VineNotification) to the Mountain host process.
 * Notifications do not expect a response from Mountain.
 *
 * @param methodName - The name of the notification, indicating its purpose or the type of event
 *                     being signaled (e.g., "rpcData" for RPC transport, "extensionActivationComplete").
 * @param parameters - The parameters or payload for the notification. This must be a JSON-serializable object or value.
 */
export function sendNotificationToMountain(
	methodName: string,
	parameters: any,
): void {
	// Construct the VineNotification message object.
	const notificationMessageToSend: VineNotification = {
		msg_type: 6, // Identifies this as a Notification.
		id: null, // Notifications do not have IDs.
		method: methodName,
		params: parameters,
	};

	// Send the notification message to Mountain.
	sendToMountainRaw(notificationMessageToSend);
}

/**
 * Sends a response (either a successful result or an error) to a request that was
 * previously received by Cocoon from the Mountain host process. This function is used
 * when Mountain initiates a request to Cocoon (e.g., an RPC call from Mountain to an
 * ExtHost service method implemented in Cocoon), and Cocoon needs to send back the
 * outcome of processing that request.
 *
 * @param requestIdFromMountain - The `id` of the original VineRequest received from Mountain
 *                                 that Cocoon is now responding to.
 * @param resultPayload - The result payload if the request was processed successfully by Cocoon.
 *                        If the original method (invoked on Cocoon) returns `void` but was
 *                        successful, this parameter can be `null` or `undefined`.
 * @param errorObjectOrMessage - Information about the error if the request failed during processing by Cocoon.
 *                               This can be:
 *                               - An `Error` instance.
 *                               - A string containing a simple error message.
 *                               - A pre-formed `VineErrorPayload` object (or an object compatible
 *                                 with VS Code's `SerializedError` DTO structure).
 *                               - `null` if the request was successful (in which case `resultPayload` is used).
 */
export function sendResponseToMountain(
	requestIdFromMountain: number,
	resultPayload: any,
	errorObjectOrMessage: Error | VineErrorPayload | string | null,
): void {
	let responseMessageToSend: VineResponse | VineErrorResponse;

	if (errorObjectOrMessage) {
		// If an error occurred, construct a VineErrorResponse.
		let vineErrorPayloadToSerialize: VineErrorPayload;

		if (errorObjectOrMessage instanceof Error) {
			// If a standard JavaScript `Error` instance is provided, convert it to the VineErrorPayload structure.
			// This aims for compatibility with how VS Code often serializes errors for RPC (e.g., `transformErrorForSerialization`).
			vineErrorPayloadToSerialize = {
				$isError: true, // VS Code RPC convention: marker for serialized errors.
				message: errorObjectOrMessage.message,
				stack: errorObjectOrMessage.stack,
				name: errorObjectOrMessage.name,
				code: (errorObjectOrMessage as NodeJS.ErrnoException).code, // Include Node.js style error code if present.
			};
		} else if (typeof errorObjectOrMessage === "string") {
			// If just an error message string is provided, create a basic VineErrorPayload.
			vineErrorPayloadToSerialize = {
				$isError: true,
				message: errorObjectOrMessage,
			};
		} else {
			// If `errorObjectOrMessage` is already an object (assumed to be a VineErrorPayload
			// or a compatible structure like VS Code's `SerializedError` DTO).
			// Ensure the `$isError` marker is present for VS Code compatibility on the receiving end (Mountain).
			vineErrorPayloadToSerialize = {
				$isError: true,
				...errorObjectOrMessage,
			};
		}

		responseMessageToSend = {
			msg_type: 4, // Identifies this as an Error Response.
			id: requestIdFromMountain,
			method: null, // Not applicable for responses.
			params: null, // Not applicable for error responses.
			error: vineErrorPayloadToSerialize,
		};
	} else {
		// If no error, construct a successful VineResponse.
		responseMessageToSend = {
			msg_type: 3, // Identifies this as a successful Response.
			id: requestIdFromMountain,
			method: null, // Not applicable for responses.
			// Ensure `params` is not `undefined` in the JSON output, as `JSON.stringify`
			// might omit properties with `undefined` values. Convert `undefined` results to `null`
			// for consistent serialization, which is a common practice in JSON-based protocols.
			params: resultPayload === undefined ? null : resultPayload,
			error: null, // Must be null for successful responses.
		};
	}

	// Send the constructed response message (either success or error) to Mountain.
	sendToMountainRaw(responseMessageToSend);
}

/**
 * Sends a cancellation message (VineCancel) to the Mountain host process for a request
 * that Cocoon had previously initiated using `sendToMountainAndWait`. This function is
 * called when Cocoon wants to inform Mountain that it is no longer interested in the
 * response for that particular request (e.g., because the operation was cancelled by
 * the user or a CancellationToken in Cocoon).
 *
 * Mountain's handling of this cancellation message (e.g., whether it stops processing
 * the original request) is up to its implementation.
 *
 * @param requestIdToCancel - The `id` of the Cocoon-initiated VineRequest that should be cancelled.
 */
export function sendCancelToMountain(requestIdToCancel: number): void {
	// First, check if the `requestIdToCancel` corresponds to a known pending request
	// that Cocoon actually initiated and is still waiting for.
	if (!pendingRequests.has(requestIdToCancel)) {
		console.warn(
			`[Cocoon IPC] Attempted to send CANCEL message to Mountain for a Cocoon-initiated request (ID: ${requestIdToCancel}) ` +
				`that is non-existent, already completed, or has timed out. No CANCEL message will be sent.`,
		);
		return; // Do not send a cancel message for requests that are not in a pending state.
	}

	// Construct the VineCancel message.
	const cancelMessageToSend: VineCancel = {
		msg_type: 5, // Identifies this as a Cancel message.
		id: requestIdToCancel, // The ID of the request Cocoon wants to cancel.
		method: null, // Not applicable for cancel messages.
		params: null, // Not applicable for cancel messages.
	};

	// Send the cancel message to Mountain.
	sendToMountainRaw(cancelMessageToSend);

	// Log that a cancel message was sent.
	const pendingEntry = pendingRequests.get(requestIdToCancel); // Get entry again for logging method name.
	console.log(
		`[Cocoon IPC] Sent CANCEL message to Mountain for Cocoon-initiated request ID: ${requestIdToCancel} ` +
			`(Original Method: ${pendingEntry?.methodForLog}). ` +
			`The resolution of the original request promise in Cocoon now depends on Mountain's response to this cancellation ` +
			`(e.g., Mountain might send back an error response for request ID ${requestIdToCancel}, or the request might ` +
			`still eventually time out if Mountain does not explicitly acknowledge the cancel by responding).`,
	);

	// Important Note on Behavior: Sending this cancel message does NOT automatically or immediately
	// reject the promise associated with `requestIdToCancel` in the `pendingRequests` map within Cocoon.
	// The fate of that promise still depends on what Mountain does:
	// 1. Mountain might process the cancellation and send back an ErrorResponse (msg_type 4) for the original request ID.
	// 2. Mountain might ignore the cancellation and eventually send a normal Response (msg_type 3).
	// 3. Mountain might not respond at all, in which case the original timeout for the request in Cocoon will eventually fire.
	//
	// Some RPC systems might opt to reject the local promise immediately with a specific "Cancelled" error
	// upon sending a cancel message. This implementation currently does not do that, as it relies on
	// Mountain's reaction or the pre-existing timeout mechanism to resolve/reject the promise.
	// If immediate local rejection upon sending CANCEL is desired, that logic would be added here
	// (e.g., `pendingEntry?.reject(new Error("Request cancelled by Cocoon"))` and then `pendingRequests.delete(requestIdToCancel)`).
}

// --- RPCProtocol Adapter Setup ---
// This section provides an adapter that allows VS Code's `RPCProtocol` (used for communication
// between ExtHost and MainThread in standard VS Code) to use the Vine IPC mechanism as its
// underlying transport layer.

/**
 * Singleton instance of the `IMessagePassingProtocol` adapter.
 * This is created once by `createHostProtocolInterface` and then reused.
 */
let rpcMessagePassingProtocolInstance: IMessagePassingProtocol | null = null;

/**
 * Callback function used by the main stdio line reader (`handleIncomingLineFromMountain`)
 * to pass incoming "rpcData" (which contains base64 encoded `VSBuffer` data for `RPCProtocol`)
 * to this RPCProtocol adapter. This callback is set when `createHostProtocolInterface` is called.
 */
let rpcAdapterReceiveDataCallback:
	| ((base64EncodedBufferData: string) => void)
	| null = null;

/**
 * Creates or returns a singleton instance of an `IMessagePassingProtocol` adapter.
 * This adapter is essential for enabling VS Code's `RPCProtocol` to communicate
 * over the custom Vine IPC channel established with Mountain.
 *
 * How it works:
 * - `RPCProtocol` deals with `VSBuffer` objects for its messages.
 * - To send these `VSBuffer`s over Vine (which uses JSON), they are base64 encoded.
 * - The base64 encoded string is then wrapped in a Vine notification message with the
 *   method name "rpcData" and sent to Mountain.
 * - Conversely, when Mountain sends "rpcData" notifications containing base64 encoded
 *   `VSBuffer` data to Cocoon, this adapter decodes them and fires an event that
 *   `RPCProtocol` listens to.
 *
 * @returns An `IMessagePassingProtocol` instance suitable for initializing `RPCProtocol`.
 */
export function createHostProtocolInterface(): IMessagePassingProtocol {
	// Return the existing instance if it has already been created (singleton pattern).
	if (rpcMessagePassingProtocolInstance) {
		return rpcMessagePassingProtocolInstance;
	}

	console.log(
		"[Cocoon IPC] Creating RPCProtocol Adapter (IMessagePassingProtocol) for communication with Mountain host (MainThread)...",
	);

	// Create a VS Code Emitter. `RPCProtocol` will subscribe to the `event` property of this emitter
	// to receive incoming RPC messages (as VSBuffers).
	const onMessageEventFromMountainForRpc = new VscodeEmitter<VSBuffer>();

	/**
	 * Sends a `VSBuffer` (which represents an RPC message chunk) to Mountain.
	 * It does this by base64 encoding the buffer and wrapping it in a "rpcData" Vine notification.
	 * This function implements the `send(buffer: VSBuffer)` method required by the `IMessagePassingProtocol` interface.
	 * @param vsBufferToSend - The `VSBuffer` containing RPC data to be sent.
	 */
	const sendVSBufferToMountainViaNotification = (
		vsBufferToSend: VSBuffer,
	): void => {
		try {
			// Convert the VSBuffer's underlying ArrayBuffer (or Uint8Array view) to a base64 string.
			// `Buffer.from` with `byteOffset` and `byteLength` correctly handles `VSBuffer`s that might be
			// views into larger ArrayBuffers.
			const base64EncodedDataString = Buffer.from(
				vsBufferToSend.buffer, // The underlying ArrayBuffer of the VSBuffer.
				vsBufferToSend.byteOffset, // The starting offset of the data within the ArrayBuffer.
				vsBufferToSend.byteLength, // The length of the data in bytes.
			).toString("base64");

			// Send this base64 encoded string as the payload of an "rpcData" Vine notification to Mountain.
			sendNotificationToMountain("rpcData", {
				buffer: base64EncodedDataString,
			});
		} catch (error: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to serialize (base64 encode) and send VSBuffer to Mountain via 'rpcData' notification. " +
					`This will likely break RPC communication. Error: ${error.message}`,
				error.stack, // Include stack trace for debugging serialization issues.
			);
			// If this fails, RPC communication is likely broken. Consider if further error handling is needed here.
		}
	};

	// Set up the callback that the main stdio line reader (`handleIncomingLineFromMountain`)
	// will invoke when it receives an "rpcData" notification from Mountain.
	// This callback is responsible for decoding the base64 data and firing the `onMessageEventFromMountainForRpc` emitter.
	rpcAdapterReceiveDataCallback = (base64EncodedBufferData: string): void => {
		try {
			// Decode the base64 string received from Mountain back into a Node.js Buffer.
			const nodeJsBuffer = Buffer.from(base64EncodedBufferData, "base64");
			// Wrap the Node.js Buffer in a `VSBuffer` (VS Code's buffer type) and fire the event.
			// `RPCProtocol` listens to this event to process the incoming RPC message chunk.
			onMessageEventFromMountainForRpc.fire(VSBuffer.wrap(nodeJsBuffer));
		} catch (error: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to decode (base64) and emit received RPC VSBuffer from Mountain (from 'rpcData' notification). " +
					`This will likely break RPC communication. Error: ${error.message}`,
				error.stack, // Include stack trace for debugging decoding issues.
			);
			// If this fails, incoming RPC messages cannot be processed.
		}
	};

	// Construct and store the `IMessagePassingProtocol` adapter object.
	rpcMessagePassingProtocolInstance = {
		send: sendVSBufferToMountainViaNotification, // The `send` method for outgoing RPC data.
		onMessage: onMessageEventFromMountainForRpc.event, // The `onMessage` event for incoming RPC data.

		// `onDidDispose` is an event that should fire when the communication channel is permanently closed.
		// For stdio-based IPC, the closure of `process.stdin` (handled by `lineReaderFromMountain.on("close")`)
		// signifies that Mountain has disconnected. `RPCProtocol` might use `onDidDispose` to clean up.
		// For now, `VscodeEvent.None` is used, implying this adapter doesn't emit its own dispose event.
		// If needed, a dedicated emitter could be created and fired when stdin closes.
		onDidDispose: VscodeEvent.None,

		// `drain()`: An optional method for protocols that buffer messages and need a way to signal
		// when the underlying transport has processed all buffered messages (e.g., after a period of high traffic).
		// For stdio, `process.stdout.write` is typically blocking or has its own kernel-level buffering.
		// If `process.stdout.write` returns `false` (indicating the kernel buffer is full), one could
		// theoretically await the 'drain' event on `process.stdout`. However, for typical RPC usage patterns,
		// explicit `drain` handling at this adapter layer is often not implemented unless specific
		// backpressure issues are observed.
		// drain: async () => { /* NOP, or implement if backpressure management for stdout is needed */ }
	};

	return rpcMessagePassingProtocolInstance;
}

// --- Stdio Listener Setup (Reading Messages from Mountain) ---
// Create a `readline.Interface` to process `process.stdin` line by line.
// This is robust for handling newline-delimited JSON messages.
const lineReaderFromMountain = readline.createInterface({
	input: process.stdin, // Read from standard input (data from Mountain).
	output: process.stdout, // `output` is a required option for `readline.createInterface`,
	// but it's not used for IPC output by `readline` itself in this setup.
	// Cocoon sends output directly via `process.stdout.write`.
	terminal: false, // Crucial: ensures `stdin` is not treated as a TTY terminal,
	// which is important for reliable non-interactive stream processing.
});

console.log(
	"[Cocoon IPC] Setting up stdin listener for newline-delimited JSON messages from Mountain...",
);

/**
 * Handles an incoming line of text (expected to be a JSON string) received from
 * the Mountain host process via `process.stdin`.
 * This function parses the JSON, determines the type of the `VineMessage`, and routes
 * it to the appropriate internal handler or event emitter.
 *
 * @param lineFromStringTransport - A string representing a single JSON message received from Mountain.
 */
function handleIncomingLineFromMountain(lineFromStringTransport: string): void {
	// Ignore empty lines or lines containing only whitespace, which might occur.
	if (!lineFromStringTransport.trim()) {
		return;
	}

	try {
		// Attempt to parse the incoming line as JSON into a VineMessage object.
		const incomingMessageFromMountain = JSON.parse(
			lineFromStringTransport,
		) as VineMessage;

		// Process the parsed message based on its `msg_type`.
		switch (incomingMessageFromMountain.msg_type) {
			// Case 3: Successful Response from Mountain (for a request Cocoon previously sent).
			// Case 4: Error Response from Mountain (for a request Cocoon previously sent).
			case 3: // VineResponse (Success)
			case 4: // VineErrorResponse
				// These messages must have an `id` corresponding to a pending request from Cocoon.
				if (
					incomingMessageFromMountain.id !== null &&
					pendingRequests.has(incomingMessageFromMountain.id)
				) {
					// Retrieve the `PendingRequestEntry` for this request ID.
					const pendingEntryForRequest = pendingRequests.get(
						incomingMessageFromMountain.id,
					)!; // `!` is safe due to `has` check.

					// A response (either success or error) has been received, so clear the timeout
					// that was set for this request to prevent it from firing later.
					clearTimeout(pendingEntryForRequest.timeoutHandle);
					// Remove the request from the map of pending requests, as it's now being handled.
					pendingRequests.delete(incomingMessageFromMountain.id);

					if (incomingMessageFromMountain.msg_type === 3) {
						// Successful Response (VineResponse).
						// Resolve the promise associated with this request, passing the response parameters.
						// If `params` is `undefined` in the JSON (e.g., method returns void),
						// convert to `null` for consistency in promise resolution.
						pendingEntryForRequest.resolve(
							incomingMessageFromMountain.params === undefined
								? null
								: incomingMessageFromMountain.params,
						);
					} else {
						// Error Response (VineErrorResponse, msg_type 4).
						console.error(
							`[Cocoon IPC <- Mtn] Received ERROR response from Mountain for Cocoon-initiated Request ` +
								`'${pendingEntryForRequest.methodForLog}' (ID ${incomingMessageFromMountain.id}):`,
							incomingMessageFromMountain.error, // Log the detailed error payload received from Mountain.
						);

						// Reconstruct an actual JavaScript `Error` instance from the `VineErrorPayload` DTO.
						// This is often preferred by consuming code (like `RPCProtocol`) over raw DTOs for errors.
						const reconstructedErrorObject = new Error(
							incomingMessageFromMountain.error?.message ||
								"Unknown error received from Mountain in ErrorResponse",
						) as NodeJS.ErrnoException & { $isError?: boolean }; // Augment type for `code` and VS Code's `$isError` marker.

						// Populate additional properties on the reconstructed Error object if available in the payload.
						if (incomingMessageFromMountain.error?.stack)
							reconstructedErrorObject.stack =
								incomingMessageFromMountain.error.stack;
						if (incomingMessageFromMountain.error?.name)
							reconstructedErrorObject.name =
								incomingMessageFromMountain.error.name;
						if (
							incomingMessageFromMountain.error?.code !==
							undefined
						)
							reconstructedErrorObject.code = String(
								incomingMessageFromMountain.error.code,
							);
						// Preserve VS Code's specific `$isError` marker if it was present in the DTO.
						if (incomingMessageFromMountain.error?.$isError)
							reconstructedErrorObject.$isError = true;

						// Reject the promise associated with this request, passing the reconstructed Error object.
						pendingEntryForRequest.reject(reconstructedErrorObject);
					}
				} else {
					// This case occurs if a response/error is received for a request ID that is not
					// currently in Cocoon's `pendingRequests` map. This could happen if:
					// 1. The request already timed out locally in Cocoon, and was removed from the map.
					// 2. The request was already processed (e.g., a duplicate response/error from Mountain).
					// 3. Mountain sent a response/error with an invalid or unknown request ID.
					console.warn(
						`[Cocoon IPC <- Mtn] Received response/error from Mountain for an unknown, already processed, or timed-out ` +
							`Request ID: ${incomingMessageFromMountain.id}. Discarding this message. Message content:`,
						incomingMessageFromMountain,
					);
				}
				break;

			// Case 6: Notification from Mountain.
			case 6: // VineNotification
				// For debugging:
				// console.debug(
				// 	`[Cocoon IPC <- Mtn] Received NOTIFICATION from Mountain: Method='${incomingMessageFromMountain.method}'`,
				// 	incomingMessageFromMountain.params // Be cautious logging params if they can be large or sensitive.
				// );

				// Check for specific notification methods that require special handling by the IPC layer itself.
				if (
					incomingMessageFromMountain.method === "rpcData" && // This method is used for RPC data tunneled via Vine.
					incomingMessageFromMountain.params?.buffer && // Expects a `buffer` property in `params`.
					typeof incomingMessageFromMountain.params.buffer ===
						"string" // The buffer should be a base64 encoded string.
				) {
					// This notification contains RPC data (a base64 encoded VSBuffer) from Mountain for `RPCProtocol`.
					if (rpcAdapterReceiveDataCallback) {
						// If the RPC adapter's callback is set up, pass the base64 encoded buffer string to it.
						// The adapter will decode it and fire an event for `RPCProtocol`.
						rpcAdapterReceiveDataCallback(
							incomingMessageFromMountain.params.buffer,
						);
					} else {
						// This indicates a potential problem: RPC data received before the RPC adapter is fully ready.
						console.warn(
							"[Cocoon IPC <- Mtn] Received 'rpcData' notification from Mountain, but the RPC adapter's receive callback " +
								"is not yet set up. RPC communication might not be fully initialized, or there's an issue in the setup sequence. " +
								"This RPC message will be lost.",
						);
					}
				} else if (
					incomingMessageFromMountain.method ===
						"$acceptConfigurationChanged" && // Standard VS Code method for config changes.
					incomingMessageFromMountain.params // Expects payload with new config data and change details.
				) {
					// This notification signals a configuration change from Mountain.
					// Emit a typed 'configChanged' event on the internal event bus.
					// Other Cocoon modules (like `ShimExtHostConfiguration`) subscribe to this.
					// The payload structure should match `ConfigurationChangedEventPayload`.
					internalAppEmitter.emit(
						"configChanged",
						incomingMessageFromMountain.params as ConfigurationChangedEventPayload,
					);
				} else if (
					incomingMessageFromMountain.method ===
						"$onDidChangeWorkspaceFolders" && // Standard VS Code method for workspace folder changes.
					incomingMessageFromMountain.params // Expects payload describing folder changes.
				) {
					// This notification signals a change in workspace folders from Mountain.
					// Emit a typed 'workspaceFoldersChanged' event on the internal event bus.
					// Other Cocoon modules (like `ShimExtHostWorkspace`) subscribe to this.
					// The payload structure should match `WorkspaceFoldersChangedEventPayload`.
					internalAppEmitter.emit(
						"workspaceFoldersChanged",
						incomingMessageFromMountain.params as WorkspaceFoldersChangedEventPayload,
					);
				} else {
					// For any other notification method not handled specifically above,
					// emit a generic 'message' event on the internal event bus.
					// This allows other parts of Cocoon to subscribe to and process these
					// custom or less common notifications if needed.
					internalAppEmitter.emit(
						"message",
						incomingMessageFromMountain,
					);
				}
				break;

			// Case 1: Request from Mountain (to Cocoon).
			case 1: // VineRequest
				// For debugging:
				// console.debug(
				// 	`[Cocoon IPC <- Mtn] Received REQUEST from Mountain: Method='${incomingMessageFromMountain.method}' ` +
				// 	`(ID: ${incomingMessageFromMountain.id})`,
				// 	incomingMessageFromMountain.params // Again, be cautious logging params.
				// );

				// Requests from Mountain are typically handled by the server-side logic of `RPCProtocol`
				// within Cocoon. This happens when Mountain calls methods on ExtHost services that are
				// implemented or shimmed in Cocoon (e.g., `ExtHostLanguageFeatures.$provideHover(...)`).
				// These requests are routed through the `IMessagePassingProtocol` adapter to `RPCProtocol`.
				// Emitting a generic 'message' event here allows `RPCProtocol` (if it were listening
				// broadly, though it usually gets messages directly via its `onMessage` event from the adapter)
				// or other direct handlers in Cocoon to process it.
				//
				// For standard VS Code RPC, the "rpcData" notification method (handled above) is the primary
				// channel for `RPCProtocol` to receive message chunks. Direct VineRequests on other methods
				// at this raw Vine protocol level might be for non-RPC specific commands if the overall
				// communication protocol between Cocoon and Mountain defines them (outside of standard VS Code RPC).
				internalAppEmitter.emit("message", incomingMessageFromMountain);
				break;

			// Case 5: Cancellation message from Mountain.
			case 5: // VineCancel
				// This message indicates that Mountain is requesting the cancellation of an operation
				// that Cocoon is (or was) performing on Mountain's behalf.
				// The `incomingMessageFromMountain.id` is assumed to be the `tokenId` that was
				// associated with that operation when Mountain originally initiated it (e.g., via an RPC call
				// that included a `tokenDto: { id: tokenId }` parameter).
				if (incomingMessageFromMountain.id !== null) {
					const tokenIdToCancelOperationInCocoon =
						incomingMessageFromMountain.id;
					console.debug(
						`[Cocoon IPC <- Mtn] Received CANCEL message from Mountain for operation/token ID: ${tokenIdToCancelOperationInCocoon}. ` +
							`Attempting to signal cancellation for this token ID via the CancellationTokenRegistry.`,
					);

					// Use the `CancellationTokenRegistry` (if available) to signal cancellation for this `tokenId`.
					// Services in Cocoon (like `ShimLanguageFeatures`) that obtained a `CancellationToken`
					// from the registry for this `tokenId` will see their token's `isCancellationRequested` become true.
					if (globalCancellationTokenRegistry) {
						globalCancellationTokenRegistry.cancel(
							tokenIdToCancelOperationInCocoon,
						);
					} else {
						// This is a problem if cancellation is a critical feature.
						console.warn(
							`[Cocoon IPC <- Mtn] Received CANCEL message from Mountain for operation/token ID ${tokenIdToCancelOperationInCocoon}, ` +
								`but the CancellationTokenRegistry is not available (or not yet initialized) to process it. ` +
								`The operation in Cocoon associated with this token ID may not be cancelled.`,
						);
					}

					// --- Ambiguity Note on Cancel Message ID ---
					// It's also theoretically possible that `incomingMessageFromMountain.id` could coincidentally
					// match an ID of a request that Cocoon *itself* sent to Mountain (i.e., an ID in Cocoon's
					// `pendingRequests` map). This creates an ambiguity:
					//   A) Is Mountain cancelling an operation Cocoon is doing *for Mountain* (primary interpretation)?
					//   B) Is Mountain saying it's cancelling *its own work* for a request Cocoon made *to Mountain*?
					//
					// The primary interpretation for a VineMsgType 5 (Cancel) from Mountain with an ID is (A):
					// Mountain requests cancellation of an operation identified by `tokenId` that Cocoon is performing.
					//
					// If scenario (B) were intended (Mountain cancelling its processing of a Cocoon-initiated request),
					// Mountain should ideally send a VineErrorResponse (msg_type 4) for that original Cocoon request ID,
					// possibly with an error indicating cancellation.
					//
					// Check for this ambiguity for logging/awareness:
					const pendingCocoonOriginatedRequest = pendingRequests.get(
						tokenIdToCancelOperationInCocoon,
					);
					if (pendingCocoonOriginatedRequest) {
						console.warn(
							`[Cocoon IPC <- Mtn] Received CANCEL message from Mountain for ID ${tokenIdToCancelOperationInCocoon}. ` +
								`This ID also matches a pending Cocoon-to-Mountain request (Method: ${pendingCocoonOriginatedRequest.methodForLog}). ` +
								`Interpreting this primarily as Mountain cancelling an operation Cocoon is performing for it (token ID ${tokenIdToCancelOperationInCocoon}). ` +
								`If Mountain is also cancelling its work for Cocoon's request, Cocoon's request will likely time out or receive a separate error response.`,
						);
						// We do NOT reject `pendingCocoonOriginatedRequest.reject` here directly based on a type 5
						// CANCEL from Mountain. That promise awaits a type 3 (Response) or type 4 (ErrorResponse) for resolution.
					}

					// Emit an internal event ("cancelRequestFromMountain") within Cocoon.
					// Other Cocoon services or modules that manage operations initiated by Mountain
					// might subscribe to this event to perform specific cleanup actions related to the
					// cancelled operation, beyond just relying on the CancellationToken.
					// The payload is the `tokenId` of the operation to be cancelled.
					internalAppEmitter.emit(
						"cancelRequestFromMountain",
						tokenIdToCancelOperationInCocoon,
					);
				} else {
					// A CANCEL message (type 5) from Mountain *must* have an `id` (the `tokenId`).
					console.warn(
						"[Cocoon IPC <- Mtn] Received CANCEL message (type 5) from Mountain without a valid Request ID " +
							"(message.id was null or missing). This CANCEL message cannot be processed:",
						incomingMessageFromMountain,
					);
				}
				break;

			// Default case for any other `msg_type`.
			default:
				console.warn(
					"[Cocoon IPC <- Mtn] Received message from Mountain with an unknown or invalid `msg_type`:",
					incomingMessageFromMountain,
				);
				break;
		}
	} catch (jsonParseError: any) {
		// This error occurs if `JSON.parse(lineFromStringTransport)` fails, meaning the line was not valid JSON.
		console.error(
			"[Cocoon IPC] Fatal error parsing incoming line from Mountain as JSON. This may indicate a protocol mismatch, " +
				"corrupted data stream from Mountain, or non-JSON data being sent by Mountain.",
			"Error details:",
			jsonParseError.message,
			// `jsonParseError.stack`, // Stack trace might be less relevant for JSON parse errors unless it points to a very large input.
			"Offending line content (first 500 characters):",
			lineFromStringTransport.substring(0, 500),
		);
		// Depending on the desired robustness and error recovery strategy, Cocoon might:
		// - Attempt to skip the malformed line and continue processing subsequent lines.
		// - Log the error and wait for potentially valid future messages.
		// - Consider the communication channel compromised and terminate or signal a critical error.
		// For now, it logs the error and attempts to continue with the next line.
	}
}

// Attach the `handleIncomingLineFromMountain` function to the 'line' event of the readline interface.
// This means `handleIncomingLineFromMountain` will be called for each complete line of text received on `process.stdin`.
lineReaderFromMountain.on("line", handleIncomingLineFromMountain);

// Handle the 'close' event for the `process.stdin` stream.
// This event typically signifies that Mountain (the host process) has closed its `stdout`
// (which is connected to Cocoon's `stdin`) or that Mountain itself has terminated.
lineReaderFromMountain.on("close", () => {
	console.log(
		"[Cocoon IPC] Standard input (stdin) stream has been closed by Mountain (host process). " +
			"This usually indicates that Mountain is shutting down or has terminated the communication channel. " +
			"Cocoon process will now attempt to exit gracefully.",
	);
	// This is a definitive signal that the host process has disconnected or terminated.
	// The `process.exit(0)` call will attempt a graceful exit.
	// The behavior of `process.exit` is modified by `cocoon-bootstrap.ts`. If the `allowExitFn`
	// (based on `initializationFailedOrExited` in `index.ts`) permits, Cocoon will exit.
	// If not (e.g., if Mountain closed stdio unexpectedly while Cocoon was intended to remain alive,
	// which is unlikely if stdin closure is the primary shutdown signal), the patched `process.exit`
	// might prevent an immediate exit, and Cocoon could log further errors about lost communication.
	// However, stdin closure is generally treated as a strong signal for termination from the host.
	process.exit(0); // Attempt a graceful exit with exit code 0 (success).
});

// --- Named Event Emitter Wrapper Functions for Typed, Specific Events ---
// These functions provide a more structured, type-safe, and discoverable way for other
// Cocoon modules to subscribe to specific kinds of messages or notifications that are
// received from Mountain and then emitted on the `internalAppEmitter`.

/**
 * Registers a listener for generic Vine messages (specifically, Requests from Mountain or
 * Notifications from Mountain other than those with dedicated handlers like "rpcData",
 * "$acceptConfigurationChanged", or "$onDidChangeWorkspaceFolders") that are received
 * from Mountain and subsequently emitted on the `internalAppEmitter` as a 'message' event.
 *
 * @param listenerCallback - A callback function that will be invoked with the full `VineMessage` object
 *                           when such a message is received.
 * @returns An `IDisposable` object that can be used to remove the listener by calling its `dispose()` method.
 */
export function onMessageFromMountain(
	listenerCallback: (vineMessage: VineMessage) => void,
): IDisposable {
	internalAppEmitter.on("message", listenerCallback);
	return toDisposable(() =>
		internalAppEmitter.removeListener("message", listenerCallback),
	);
}

/**
 * Registers a listener for "cancelRequestFromMountain" events. This event is emitted
 * by this IPC layer when Mountain sends a cancellation message (VineMsgType 5) specifically
 * requesting Cocoon to cancel an operation that Mountain had previously asked Cocoon to perform.
 * The listener callback receives the `tokenId` (which was the `id` in the original request
 * from Mountain, now used as a cancellation token identifier) of the operation to be cancelled.
 *
 * @param listenerCallback - A callback function that will be invoked with the `requestIdToCancel`
 *                           (interpreted as a `tokenId`) when Mountain requests cancellation.
 * @returns An `IDisposable` object to remove the listener.
 */
export function onCancelRequestFromMountain(
	listenerCallback: (requestIdToCancel: number) => void,
): IDisposable {
	internalAppEmitter.on("cancelRequestFromMountain", listenerCallback);
	return toDisposable(() =>
		internalAppEmitter.removeListener(
			"cancelRequestFromMountain",
			listenerCallback,
		),
	);
}

/**
 * Type definition for the payload of the "configChanged" event.
 * This structure should match what `IExtHostConfiguration.$acceptConfigurationChanged`
 * (defined in `extHost.protocol.ts`) expects as parameters.
 * - `data`: The new, complete configuration snapshot (`IConfigurationInitData`).
 * - `change`: Details about what specifically changed in the configuration (`IConfigurationChange`).
 */
export type ConfigurationChangedEventPayload = {
	data: IConfigurationInitData;
	change: IConfigurationChange;
};

/**
 * Registers a listener for configuration change notifications received from Mountain.
 * This specifically listens for Vine notifications with the method name "$acceptConfigurationChanged".
 *
 * @param listenerCallback - A callback function to handle the configuration change.
 *                           The `payload` argument to this callback will be of type
 *                           `ConfigurationChangedEventPayload`, containing the new configuration
 *                           snapshot and details about the specific changes.
 * @returns An `IDisposable` object to remove the listener.
 */
export function onConfigurationChanged(
	listenerCallback: (payload: ConfigurationChangedEventPayload) => void,
): IDisposable {
	internalAppEmitter.on("configChanged", listenerCallback);
	return toDisposable(() =>
		internalAppEmitter.removeListener("configChanged", listenerCallback),
	);
}

/**
 * Type definition for the payload of the "workspaceFoldersChanged" event.
 * This structure matches `IWorkspaceFoldersChangeEventData` from `extHost.protocol.ts`.
 * It describes which workspace folders were added, removed, or had their properties
 * (like name or index) changed.
 */
export type WorkspaceFoldersChangedEventPayload =
	IWorkspaceFoldersChangeEventData;

/**
 * Registers a listener for workspace folder change notifications received from Mountain.
 * This specifically listens for Vine notifications with the method name "$onDidChangeWorkspaceFolders".
 *
 * @param listenerCallback - A callback function to handle workspace folder changes.
 *                           The `payload` argument to this callback will be of type
 *                           `WorkspaceFoldersChangedEventPayload`, describing the
 *                           added, removed, or changed workspace folders.
 * @returns An `IDisposable` object to remove the listener.
 */
export function onWorkspaceFoldersChanged(
	listenerCallback: (payload: WorkspaceFoldersChangedEventPayload) => void,
): IDisposable {
	internalAppEmitter.on("workspaceFoldersChanged", listenerCallback);
	return toDisposable(() =>
		internalAppEmitter.removeListener(
			"workspaceFoldersChanged",
			listenerCallback,
		),
	);
}

/**
 * Initializes the IPC layer's access to the `CancellationTokenRegistry`.
 * This function MUST be called from `index.ts` (or the main bootstrapping module)
 * after the `CancellationTokenRegistry` instance has been created (typically via DI).
 * Providing the registry instance here allows this IPC module to correctly process
 * cancellation requests (VineMsgType 5) received from Mountain by invoking `cancel()`
 * on the registry.
 *
 * @param cancellationTokenRegistryInstance - The singleton instance of `CancellationTokenRegistry`
 *                                            used throughout Cocoon.
 */
export function initializeIpcCancellation(
	cancellationTokenRegistryInstance: CancellationTokenRegistry,
): void {
	globalCancellationTokenRegistry = cancellationTokenRegistryInstance;
	console.log(
		"[Cocoon IPC] CancellationTokenRegistry has been successfully linked to the IPC layer. " +
			"Cancellation messages (VineMsgType 5) from Mountain can now be processed.",
	);
}

// --- Default Export: Primary IPC Interface Object ---
// This object bundles the primary public functions and the RPC adapter factory provided by this module,
// making them conveniently available for other modules in Cocoon (like `index.ts`) to import and use.
const ipcInterface = {
	sendToMountainAndWait,
	sendNotificationToMountain,
	sendResponseToMountain,
	sendCancelToMountain,
	createHostProtocolInterface,

	// Expose specific event listener registration functions directly for convenience and improved type safety.
	onMessageFromMountain,
	onCancelRequestFromMountain,
	onConfigurationChanged,
	onWorkspaceFoldersChanged,

	// Expose the initialization function required for linking the CancellationTokenRegistry.
	initializeIpcCancellation,
};

/**
 * Type definition for the primary Cocoon IPC interface object.
 * This allows other modules (like `index.ts` or service shims that might need direct IPC access,
 * though typically they'd go through RPC or specific services) to strongly type their dependency
 * on this IPC layer, ensuring correct usage of the exported functions.
 */
export type CocoonPrimaryIpc = typeof ipcInterface;

// Export the main IPC interface object as the default export of this module.
export default ipcInterface;

// Final log message indicating that the IPC layer is fully set up and operational.
console.log(
	"[Cocoon IPC] Vine IPC Layer is now fully initialized and ready. Listening on stdin for messages from Mountain, " +
		"and ready to send messages to Mountain via stdout.",
);
