// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/86_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 94ef2120b4a254fcd4ed37b22bc6af7d42e1b6956ecdf85f7f0a158c2e0a0c7d
// Extracted to File: Backup/TSFMSC/Code/cocoon-ipc.ts
// Extraction Timestamp: 2025-05-25T14:02:56.968Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE cocoon-ipc.ts ---

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
	MessagePassingProtocol as VSCodeMessagePassingProtocol,
	type IMessagePassingProtocol,
	// For RPC adapter type
} from "vs/workbench/services/extensions/common/rpcProtocol";
import { toDisposable, type IDisposable } from "vs/base/common/lifecycle"; // Added IDisposable

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

// --- Type Definitions for Vine Protocol ---
type VineMsgType = 1 | 3 | 4 | 5 | 6;

interface VineMessageBase {
	msg_type: VineMsgType;
	id: number | null;
	method: string | null;
}

interface VineRequest extends VineMessageBase {
	msg_type: 1;
	id: number; // Always present for requests
	method: string; // Always present for requests
	params: any;
}

interface VineResponse extends VineMessageBase {
	msg_type: 3;
	id: number; // Corresponds to a request ID
	method: null;
	params: any; // Result payload, can be null if method returns void but was successful
	error: null;
}

interface VineErrorPayload {
	message: string;
	stack?: string;
	name?: string;
	code?: string | number; // e.g., 'ENOENT', or a custom error code number
}

interface VineErrorResponse extends VineMessageBase {
	msg_type: 4;
	id: number; // Corresponds to a request ID
	method: null;
	params: null;
	error: VineErrorPayload;
}

interface VineCancel extends VineMessageBase {
	msg_type: 5; // For Cocoon to cancel a request it sent
	id: number; // ID of the request to cancel
	method: null;
	params: null;
}

interface VineNotification extends VineMessageBase {
	msg_type: 6;
	id: null;
	method: string; // Always present for notifications
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
	methodForLog: string; // For better timeout messages
}

// --- State for Request/Response Handling ---
const pendingRequests = new Map<number, PendingRequestEntry>();
let nextRequestId = 1;

// --- Event Emitter for specific, named incoming messages/notifications FROM Mountain ---
const internalAppEmitter = new EventEmitter();

// --- Core IPC Functions ---

function sendToMountainRaw(payload: VineMessage): void {
	try {
		const jsonString = JSON.stringify(payload);
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
	}
}

export function sendToMountainAndWait(
	method: string,
	params: any,
	timeoutMs = 5000, // Default timeout
): Promise<any> {
	return new Promise((resolve, reject) => {
		const id = nextRequestId++;
		const requestMessage: VineRequest = { msg_type: 1, id, method, params };

		const timeoutHandle = setTimeout(() => {
			if (pendingRequests.has(id)) {
				pendingRequests.delete(id);
				const errorMsg = `[Cocoon IPC] Request ${id} ('${method}') to Mountain timed out after ${timeoutMs}ms.`;
				console.error(errorMsg);
				reject(new Error(errorMsg)); // Standard Error for timeout
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
		} else { // Assumed VineErrorPayload
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
			params: result === undefined ? null : result, // Ensure `params` is not `undefined`
			error: null,
		};
	}
	sendToMountainRaw(responseMessage);
}

export function sendCancelToMountain(requestId: number): void {
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
	// Note: Promise in pendingRequests still exists until Mountain responds or it times out.
}

// --- RPC Protocol Adapter ---
let rpcMessagePassingProtocolInstance: IMessagePassingProtocol | null = null;
let rpcAdapterReceiveDataCallback: ((base64Buffer: string) => void) | null = null;

export function createHostProtocolInterface(): IMessagePassingProtocol {
	if (rpcMessagePassingProtocolInstance) return rpcMessagePassingProtocolInstance;

	console.log("[Cocoon IPC] Creating RPCProtocol Adapter (IMessagePassingProtocol)...");
	const onMessageEvent = new VscodeEmitter<VSBuffer>();

	const sendBufferToMountain = (buffer: VSBuffer): void => {
		try {
			const base64Encoded = Buffer.from(buffer.buffer).toString("base64");
			sendNotificationToMountain("rpcData", { buffer: base64Encoded });
		} catch (e: any) {
			console.error("[Cocoon IPC Adapter] Failed to send VSBuffer:", e.message);
		}
	};

	rpcAdapterReceiveDataCallback = (base64Buffer: string): void => {
		try {
			const nodeBuffer = Buffer.from(base64Buffer, "base64");
			onMessageEvent.fire(VSBuffer.wrap(nodeBuffer));
		} catch (e: any) {
			console.error("[Cocoon IPC Adapter] Failed to decode/emit received RPC VSBuffer:", e.message);
		}
	};

	rpcMessagePassingProtocolInstance = {
		send: sendBufferToMountain,
		onMessage: onMessageEvent.event,
		onDidDispose: VscodeEvent.None, // For MVP, assume no explicit dispose signaling
	};
	return rpcMessagePassingProtocolInstance;
}

// --- Stdio Listener Setup ---
const lineReader = readline.createInterface({
	input: process.stdin,
	output: process.stdout, // Required by readline, but not used for IPC output by this module
	terminal: false,
});

console.log("[Cocoon IPC] Setting up stdin listener for messages from Mountain...");

lineReader.on("line", (line: string) => {
	if (!line.trim()) return; // Ignore empty lines
	try {
		const message = JSON.parse(line) as VineMessage;
		// const methodInfo = message.method ? ` Method=${message.method}` : "";
		// const idInfo = message.id !== null ? ` ID=${message.id}` : "";
		// console.log(`[Cocoon IPC <- Mtn] Raw: Type=${message.msg_type}${idInfo}${methodInfo}`);

		switch (message.msg_type) {
			case 3: // Response (Successful)
			case 4: // Error (Response)
				if (message.id !== null && pendingRequests.has(message.id)) {
					const pending = pendingRequests.get(message.id)!;
					clearTimeout(pending.timeoutHandle);
					pendingRequests.delete(message.id);
					if (message.msg_type === 3) {
						// console.log(`[Cocoon IPC <- Mtn] Received RESULT for Request '${pending.methodForLog}' (ID ${message.id}).`);
						pending.resolve(message.params === undefined ? null : message.params);
					} else { // VineErrorResponse
						console.error(`[Cocoon IPC <- Mtn] Received ERROR for Request '${pending.methodForLog}' (ID ${message.id}):`, message.error);
						const error = new Error(message.error?.message || "Unknown error from Mountain") as NodeJS.ErrnoException;
						if (message.error?.stack) error.stack = message.error.stack;
						if (message.error?.name) error.name = message.error.name;
						if (message.error?.code !== undefined) error.code = String(message.error.code);
						pending.reject(error);
					}
				} else {
					console.warn(`[Cocoon IPC] Received response/error for unknown or timed-out Request ID: ${message.id}`);
				}
				break;
			case 6: // Notification (from Mountain)
				// console.log(`[Cocoon IPC <- Mtn] Received NOTIFICATION: ${message.method}`);
				if (message.method === "rpcData" && message.params?.buffer && typeof message.params.buffer === "string" && rpcAdapterReceiveDataCallback) {
					rpcAdapterReceiveDataCallback(message.params.buffer);
				} else if (message.method === "$acceptConfigurationChanged" && message.params) {
					internalAppEmitter.emit("configChanged", message.params);
				} else if (message.method === "$onDidChangeWorkspaceFolders" && message.params) {
					internalAppEmitter.emit("workspaceFoldersChanged", message.params);
				} else {
					internalAppEmitter.emit("message", message); // Generic message for other notifications
				}
				break;
			case 1: // Request (from Mountain to Cocoon)
				// console.log(`[Cocoon IPC <- Mtn] Received REQUEST: ${message.method} (ID: ${message.id})`);
				internalAppEmitter.emit("message", message); // Let index.ts or other handlers process it
				break;
			case 5: // Cancellation (from Mountain)
				if (message.id !== null) {
					console.log(`[Cocoon IPC <- Mtn] Received CANCEL for Request ID: ${message.id}. Forwarding to 'cancel' event.`);
					internalAppEmitter.emit("cancel", message.id);
				} else {
					console.warn("[Cocoon IPC] Received Cancel message from Mountain without an ID:", message);
				}
				break;
			default:
				console.warn("[Cocoon IPC] Received message from Mountain with unknown/invalid msg_type:", message);
				break;
		}
	} catch (e: any) {
		console.error("[Cocoon IPC] Fatal error processing incoming line from Mountain:", e.message, e.stack);
		console.error("[Cocoon IPC] Offending line content (first 500 chars):", line.substring(0, 500));
	}
});

lineReader.on("close", () => {
	console.log("[Cocoon IPC] Stdin closed by Mountain. Cocoon process will exit.");
    // The `initializationFailedOrExited` flag in index.ts controls behavior of the patched process.exit.
    // Here, we directly exit because the communication channel is gone.
	process.exit(0); // Ensure clean exit
});

// --- Named Event Emitter Exports ---
export function onMessageFromMountain(listener: (msg: VineMessage) => void): IDisposable {
	internalAppEmitter.on("message", listener);
	return toDisposable(() => internalAppEmitter.removeListener("message", listener));
}
export function onCancelFromMountain(listener: (requestId: number) => void): IDisposable {
	internalAppEmitter.on("cancel", listener);
	return toDisposable(() => internalAppEmitter.removeListener("cancel", listener));
}
export function onConfigurationChanged(listener: (params: [any, any]) => void): IDisposable { // Params [newConfigData, changeDetails]
	internalAppEmitter.on("configChanged", listener);
	return toDisposable(() => internalAppEmitter.removeListener("configChanged", listener));
}
export function onWorkspaceFoldersChanged(listener: (params: any) => void): IDisposable { // Params for workspace folder change
	internalAppEmitter.on("workspaceFoldersChanged", listener);
	return toDisposable(() => internalAppEmitter.removeListener("workspaceFoldersChanged", listener));
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
--- END OF FILE cocoon-ipc.ts ---