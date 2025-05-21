// Node.js EventEmitter
import { EventEmitter } from "events";
import * as readline from "readline";
// For RPC adapter
import { VSBuffer } from "vs/base/common/buffer";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
	// For typed RPC adapter events
} from "vs/base/common/event";
import {
	type IMessagePassingProtocol,
	MessagePassingProtocol as VSCodeMessagePassingProtocol,
	// For RPC adapter type
} from "vs/workbench/services/extensions/common/rpcProtocol";

/*---------------------------------------------------------------------------------------------
 * Cocoon Vine IPC Implementation (cocoon-ipc.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the Cocoon-side of the Vine IPC protocol, handling communication with the
 * Mountain host process over stdio using newline-delimited JSON messages. It also
 * provides the necessary adapter for VS Code's `RPCProtocol`.
 *
 * Vine Message Types (msg_type):
 * - 1: Request (Cocoon <-> Mountain)
 * - 3: Response (Successful result to a Request)
 * - 4: Error (Error response to a Request)
 * - 5: Cancel (Request cancellation, Cocoon -> Mountain for now)
 * - 6: Notification (Fire-and-forget, Cocoon <-> Mountain)
 *
 * Responsibilities:
 * - Reading/Writing newline-delimited JSON from/to stdio.
 * - Parsing incoming `VineMessage` objects and routing them.
 * - Implementing core IPC functions: `sendToMountainAndWait`, `sendNotificationToMountain`, etc.
 * - Providing `createHostProtocolInterface` for `RPCProtocol` (for VS Code RPC).
 * - Emitting specific internal events for `index.ts` and potentially other shims.
 *
 * Key Interactions:
 * - Interacts with Node.js `process.stdin`, `process.stdout`, `readline`.
 * - Manages pending request state for `sendToMountainAndWait`.
 * - Bridges VS Code's `RPCProtocol` buffer communication over Vine notifications.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon IPC] Initializing IPC layer...");

// IDisposable is not directly used in this file's public API but good for internal consistency if emitters were complex
// import { IDisposable } from "vs/base/common/lifecycle";

// --- Type Definitions for Vine Protocol ---
// TODO: These types should ideally be in a shared `vine.protocol.d.ts` if Mountain also uses them.
type VineMsgType = 1 | 3 | 4 | 5 | 6;

interface VineMessageBase {
	msg_type: VineMsgType;

	id: number | null;

	method: string | null;
}

interface VineRequest extends VineMessageBase {
	msg_type: 1;

	// Always present for requests
	id: number;

	// Always present for requests
	method: string;

	params: any;
}

interface VineResponse extends VineMessageBase {
	msg_type: 3;

	// Corresponds to a request ID
	id: number;

	method: null;

	// Result payload, can be null if method returns void but was successful
	params: any;

	error: null;
}

interface VineErrorPayload {
	message: string;

	stack?: string;

	name?: string;

	// e.g., 'ENOENT', or a custom error code number
	code?: string | number;

	// TODO: Add any other fields Mountain might send in an error object.
}

interface VineErrorResponse extends VineMessageBase {
	msg_type: 4;

	// Corresponds to a request ID
	id: number;

	method: null;

	params: null;

	error: VineErrorPayload;
}

interface VineCancel extends VineMessageBase {
	// For Cocoon to cancel a request it sent
	msg_type: 5;

	// ID of the request to cancel
	id: number;

	method: null;

	params: null;
}

interface VineNotification extends VineMessageBase {
	msg_type: 6;

	id: null;

	// Always present for notifications
	method: string;

	params: any;
}

type VineMessage =
	| VineRequest
	| VineResponse
	| VineErrorResponse
	| VineCancel
	| VineNotification;

interface PendingRequestEntry {
	resolve: (value: any) => void;

	reject: (reason?: any) => void;

	timeoutHandle: NodeJS.Timeout;

	// For better timeout messages
	methodForLog: string;
}

// --- State for Request/Response Handling ---
const pendingRequests = new Map<number, PendingRequestEntry>();

let nextRequestId = 1;

// --- Event Emitter for specific, named incoming messages/notifications FROM Mountain ---
// TODO: Consider using VscodeEmitter for type safety if specific event payloads are well-defined.
const internalAppEmitter = new EventEmitter();

// --- Core IPC Functions ---

function sendToMountainRaw(payload: VineMessage): void {
	try {
		const jsonString = JSON.stringify(payload);

		// Limit logged payload length for performance and readability
		const methodInfo = payload.method ? ` Method=${payload.method}` : "";

		const idInfo = payload.id !== null ? ` ID=${payload.id}` : "";

		const logPayload =
			jsonString.length > 200
				? jsonString.substring(0, 200) +
					`... (len ${jsonString.length})`
				: jsonString;

		console.log(
			`[Cocoon IPC -> Mtn] Type=${payload.msg_type}${idInfo}${methodInfo}, Payload=${logPayload}`,
		);

		process.stdout.write(jsonString + "\n");
	} catch (e: any) {
		console.error(
			`[Cocoon IPC] FATAL: Failed to stringify/send payload (Method: ${payload?.method}). Error:`,

			e.message,
		);

		// TODO: Consider how to handle critical send failures. Should it attempt to notify Mountain via another means or crash?
	}
}

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
				pendingRequests.delete(id);

				const errorMsg = `[Cocoon IPC] Request ${id} ('${method}') to Mountain timed out after ${timeoutMs}ms.`;

				console.error(errorMsg);

				// Standard Error for timeout
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

export function sendNotificationToMountain(method: string, params: any): void {
	const notificationMessage: VineNotification = {
		msg_type: 6,

		id: null,

		method,

		params,
	};

	sendToMountainRaw(notificationMessage);
}

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

				code: (errorObj as NodeJS.ErrnoException).code,
			};
		} else if (typeof errorObj === "string") {
			vineErrorPayload = { message: errorObj };
		} else {
			// Assumed VineErrorPayload
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
		// Ensure `params` is not `undefined` for JSON stringify, use `null` instead.
		responseMessage = {
			msg_type: 3,

			id: requestId,

			method: null,

			params: result === undefined ? null : result,

			error: null,
		};
	}

	sendToMountainRaw(responseMessage);
}

export function sendCancelToMountain(requestId: number): void {
	// For Cocoon to cancel its own pending request
	if (!pendingRequests.has(requestId)) {
		console.warn(
			`[Cocoon IPC] Attempted to cancel non-existent/completed request ID: ${requestId}`,
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

	const pending = pendingRequests.get(requestId);

	console.log(
		`[Cocoon IPC] Sent CANCEL for Cocoon-initiated request ID: ${requestId} (Method: ${pending?.methodForLog})`,
	);

	// Note: This only sends the cancel message. Mountain needs to act on it.
	// The promise in pendingRequests for this ID will still exist until Mountain responds (e.g., with an error or a special "cancelled" response) or it times out.
	// TODO: Consider if sendCancelToMountain should also reject the pending promise locally immediately with a CancellationError.
}

// --- RPC Protocol Adapter ---
let rpcMessagePassingProtocolInstance: IMessagePassingProtocol | null = null;

let rpcAdapterReceiveDataCallback: ((base64Buffer: string) => void) | null =
	null;

export function createHostProtocolInterface(): IMessagePassingProtocol {
	if (rpcMessagePassingProtocolInstance)
		return rpcMessagePassingProtocolInstance;

	console.log(
		"[Cocoon IPC] Creating RPCProtocol Adapter (IMessagePassingProtocol)...",
	);

	// Use VS Code's Emitter
	const onMessageEvent = new VscodeEmitter<VSBuffer>();

	// For IMessagePassingProtocol.onDidDispose
	// const onDidDisposeEmitter = new VscodeEmitter<void>();

	const sendBufferToMountain = (buffer: VSBuffer): void => {
		try {
			// VSBuffer.buffer is Uint8Array. Convert to Node Buffer for base64 encoding.
			const base64Encoded = Buffer.from(buffer.buffer).toString("base64");

			// Send as 'rpcData' notification
			sendNotificationToMountain("rpcData", { buffer: base64Encoded });
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to send VSBuffer:",

				e.message,
			);
		}
	};

	rpcAdapterReceiveDataCallback = (base64Buffer: string): void => {
		try {
			const nodeBuffer = Buffer.from(base64Buffer, "base64");

			// Wrap Node Buffer into VSBuffer
			onMessageEvent.fire(VSBuffer.wrap(nodeBuffer));
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to decode/emit received RPC VSBuffer:",

				e.message,
			);
		}
	};

	rpcMessagePassingProtocolInstance = {
		send: sendBufferToMountain,

		onMessage: onMessageEvent.event,

		// Or VscodeEvent.None if not actively used
		// onDidDispose: onDidDisposeEmitter.event,

		// For MVP, assume no explicit dispose signaling for this simple adapter
		onDidDispose: VscodeEvent.None,
	};

	return rpcMessagePassingProtocolInstance;
}

// --- Stdio Listener Setup ---
const lineReader = readline.createInterface({
	input: process.stdin,

	// Required by readline, but not used for IPC output by this module
	output: process.stdout,

	terminal: false,
});

console.log(
	"[Cocoon IPC] Setting up stdin listener for messages from Mountain...",
);

lineReader.on("line", (line: string) => {
	// Ignore empty lines
	if (!line.trim()) return;

	try {
		const message = JSON.parse(line) as VineMessage;

		const methodInfo = message.method ? ` Method=${message.method}` : "";

		const idInfo = message.id !== null ? ` ID=${message.id}` : "";

		// Can be too verbose
		// console.log(`[Cocoon IPC <- Mtn] Raw: Type=${message.msg_type}${idInfo}${methodInfo}`);

		switch (message.msg_type) {
			// Response (Successful)
			case 3:
			// Error (Response)
			case 4:
				if (message.id !== null && pendingRequests.has(message.id)) {
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

						const error = new Error(
							message.error?.message ||
								"Unknown error from Mountain",
						) as NodeJS.ErrnoException;

						if (message.error?.stack)
							error.stack = message.error.stack;

						if (message.error?.name)
							error.name = message.error.name;

						if (message.error?.code !== undefined)
							error.code = String(message.error.code);

						pending.reject(error);
					}
				} else {
					console.warn(
						`[Cocoon IPC] Received response/error for unknown or timed-out Request ID: ${message.id}`,
					);
				}

				break;

			// Notification (from Mountain)
			case 6:
				// console.log(`[Cocoon IPC <- Mtn] Received NOTIFICATION: ${message.method}`);

				if (
					message.method === "rpcData" &&
					message.params?.buffer &&
					typeof message.params.buffer === "string" &&
					rpcAdapterReceiveDataCallback
				) {
					rpcAdapterReceiveDataCallback(message.params.buffer);
				} else if (
					message.method === "$acceptConfigurationChanged" &&
					message.params
				) {
					// Params should be [newConfigData, changeDetails]
					internalAppEmitter.emit("configChanged", message.params);
				} else if (
					message.method === "$onDidChangeWorkspaceFolders" &&
					message.params
				) {
					internalAppEmitter.emit(
						"workspaceFoldersChanged",

						message.params,

						// Params for workspace folder change
					);
				} else {
					// Generic message for other notifications or requests not handled by specific emitters
					internalAppEmitter.emit("message", message);
				}

				break;

			// Request (from Mountain to Cocoon)
			case 1:
				// console.log(`[Cocoon IPC <- Mtn] Received REQUEST: ${message.method} (ID: ${message.id})`);

				// Let index.ts or other handlers process it
				internalAppEmitter.emit("message", message);

				break;

			// Cancellation (from Mountain, cancelling a request Cocoon made *to Mountain* - less common)
			case 5:
				// Or, Mountain cancelling a request it made *to Cocoon*.
				if (message.id !== null) {
					console.log(
						`[Cocoon IPC <- Mtn] Received CANCEL for Request ID: ${message.id}. Forwarding to 'cancel' event.`,
					);

					// This event is for 'index.ts' or other specific request handlers to act upon if they manage long-running tasks requested by Mountain.
					internalAppEmitter.emit("cancel", message.id);
				} else {
					console.warn(
						"[Cocoon IPC] Received Cancel message from Mountain without an ID:",

						message,
					);
				}

				break;

			default:
				console.warn(
					"[Cocoon IPC] Received message from Mountain with unknown/invalid msg_type:",

					message,
				);

				break;
		}
	} catch (e: any) {
		console.error(
			"[Cocoon IPC] Fatal error processing incoming line from Mountain:",

			e.message,

			e.stack,
		);

		console.error(
			"[Cocoon IPC] Offending line content (first 500 chars):",

			line.substring(0, 500),
		);

		// TODO: Consider if a single parse error should terminate Cocoon or if it should try to recover.
	}
});

lineReader.on("close", () => {
	console.log(
		"[Cocoon IPC] Stdin closed by Mountain. Cocoon process will exit.",
	);

	// Use the flag from index.ts if it's accessible here or pass via bootstrap.
	didFailOrExit = true;

	process.exit(0);
});

// --- Named Event Emitter Exports ---
// These provide a more typed or at least named way for index.ts to subscribe.
// TODO: The payloads for these events should be strictly typed based on what Mountain sends.
export function onMessageFromMountain(
	listener: (msg: VineMessage) => void,
): IDisposable {
	internalAppEmitter.on("message", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("message", listener),
	);
}

export function onCancelFromMountain(
	listener: (requestId: number) => void,
): IDisposable {
	internalAppEmitter.on("cancel", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("cancel", listener),
	);
}

export function onConfigurationChanged(
	listener: (params: [any, any]) => void,
): IDisposable {
	internalAppEmitter.on("configChanged", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("configChanged", listener),
	);
}

export function onWorkspaceFoldersChanged(
	listener: (params: any) => void,
): IDisposable {
	internalAppEmitter.on("workspaceFoldersChanged", listener);

	return toDisposable(() =>
		internalAppEmitter.removeListener("workspaceFoldersChanged", listener),
	);
}

// --- Default export containing the primary IPC functions ---
const ipcInterface = {
	sendToMountainAndWait,

	sendNotificationToMountain,

	sendResponseToMountain,

	sendCancelToMountain,

	createHostProtocolInterface,

	// Expose specific event listeners directly for convenience
	onMessageFromMountain,

	onCancelFromMountain,

	onConfigurationChanged,

	onWorkspaceFoldersChanged,
};

export type CocoonPrimaryIpc = typeof ipcInterface;

export default ipcInterface;

console.log("[Cocoon IPC] IPC Layer Ready and listening.");
