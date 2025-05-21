// Node.js EventEmitter
import { EventEmitter } from "events";
import * as readline from "readline";
// Needs VS Code's Buffer class
import { VSBuffer, VSBufferReadableStream } from "vs/base/common/buffer";
// For event listener disposables
import { Disposable, IDisposable } from "vs/base/common/lifecycle";
// For RPC adapter
import { IMessagePassingProtocol } from "vs/workbench/services/extensions/common/rpcProtocol";

/*---------------------------------------------------------------------------------------------
 * Cocoon Vine IPC Implementation (cocoon-ipc.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the Cocoon-side of the Vine IPC protocol, handling communication with the
 * Mountain host process over stdio using newline-delimited JSON messages. It also
 * provides the necessary adapter for VS Code's `RPCProtocol`.
 *
 * Vine Message Types (Assumed):
 * - 1: Request (Cocoon -> Mountain OR Mountain -> Cocoon)
 * - 3: Response (Successful result to a Request)
 * - 4: Error (Error response to a Request)
 * - 5: Cancel (Request cancellation)
 * - 6: Notification (Fire-and-forget)
 *
 * Responsibilities:
 * - Reading JSON lines from `process.stdin` (messages FROM Mountain).
 * - Writing JSON lines to `process.stdout` (messages TO Mountain).
 * - Parsing incoming `VineMessage` objects and routing them based on `msg_type`.
 * - Implementing `sendToMountainAndWait`, `sendNotificationToMountain`,
 *
 *
 *
 *   `sendResponseToMountain`, `sendCancelToMountain`.
 * - Providing the `createHostProtocolInterface` factory for `RPCProtocol`.
 * - Emitting specific internal events for consumption by shims/index.ts.
 *
 * Key Interactions:
 * - Interacts with Node.js `process.stdin`, `process.stdout`, `readline`.
 * - Uses `JSON.stringify`/`parse`.
 * - Manages pending request state (`pendingRequests`, `nextRequestId`).
 * - Provides communication bridge for `RPCProtocol` instance.
 * - Provides core communication functions used by shims and `index.ts`.
 *--------------------------------------------------------------------------------------------*/

console.log("[Cocoon IPC] Initializing...");

// --- Type Definitions for Vine Protocol ---
type VineMsgType = 1 | 3 | 4 | 5 | 6;

interface VineMessageBase {
	msg_type: VineMsgType;

	// Request/Response ID, null for Notifications
	id: number | null;

	// Method name for Request/Notification, null for Response/Error/Cancel
	method: string | null;
}

interface VineRequest extends VineMessageBase {
	msg_type: 1;

	id: number;

	method: string;

	// Can be any JSON-serializable type
	params: any;
}

interface VineResponse extends VineMessageBase {
	msg_type: 3;

	id: number;

	method: null;

	// Result payload
	params: any;

	error: null;
}

interface VineErrorResponse extends VineMessageBase {
	msg_type: 4;

	id: number;

	method: null;

	params: null;

	error: VineErrorPayload;
}

interface VineErrorPayload {
	message: string;

	stack?: string;

	name?: string;

	// Node.js errors often have string codes
	code?: string | number;
}

interface VineCancel extends VineMessageBase {
	msg_type: 5;

	id: number;

	method: null;

	params: null;
}

interface VineNotification extends VineMessageBase {
	msg_type: 6;

	id: null;

	method: string;

	params: any;
}

type VineMessage =
	| VineRequest
	| VineResponse
	| VineErrorResponse
	| VineCancel
	| VineNotification;

interface PendingRequest {
	resolve: (value: any) => void;

	reject: (reason?: any) => void;

	timeoutHandle: NodeJS.Timeout;
}

// --- State for Request/Response Handling ---
const pendingRequests = new Map<number, PendingRequest>();

let nextRequestId: number = 1;

// --- Event Emitter for Messages FROM Mountain ---
// Using a typed event emitter if possible, or just EventEmitter
interface InternalEvents {
	message: (msg: VineMessage) => void;

	cancel: (requestId: number) => void;

	// [newConfigData, changeDetails]
	configChanged: (params: [any, any]) => void;

	// Or more specific type
	workspaceFoldersChanged: (params: any) => void;
}

// For simplicity, stick to untyped EventEmitter and cast listeners,

// or create a simple typed wrapper.
const internalEmitter = new EventEmitter();

// --- Core IPC Functions ---

function sendToMountain(payload: VineMessage): void {
	try {
		const jsonString = JSON.stringify(payload);

		const payloadLen = jsonString.length;

		const truncatedPayload =
			payloadLen > 150
				? jsonString.substring(0, 150) + "..."
				: jsonString;

		console.log(
			`[Cocoon -> Mountain] Sending: Type=${payload.msg_type}, ID=${payload.id ?? "N/A"}, Method=${payload.method || "N/A"}, Len=${payloadLen}, Payload=${truncatedPayload}`,
		);

		process.stdout.write(jsonString + "\n");
	} catch (e: any) {
		console.error(
			"[Cocoon IPC] Failed to stringify/send payload:",

			e,

			payload?.method,
		);
	}
}

export function sendToMountainAndWait(
	method: string,

	params: any,

	timeoutMs: number = 5000,
): Promise<any> {
	return new Promise((resolve, reject) => {
		const id = nextRequestId++;

		const requestMessage: VineRequest = {
			msg_type: 1,

			id: id,

			method: method,

			params: params,
		};

		const timeoutHandle = setTimeout(() => {
			if (pendingRequests.has(id)) {
				pendingRequests.delete(id);

				const errorMsg = `[Cocoon IPC] Request ${id} (${method}) timed out after ${timeoutMs}ms.`;

				console.error(errorMsg);

				reject(new Error(errorMsg));
			}
		}, timeoutMs);

		pendingRequests.set(id, { resolve, reject, timeoutHandle });

		sendToMountain(requestMessage);
	});
}

export function sendNotificationToMountain(method: string, params: any): void {
	const notificationMessage: VineNotification = {
		msg_type: 6,

		id: null,

		method: method,

		params: params,
	};

	sendToMountain(notificationMessage);
}

export function sendResponseToMountain(
	requestId: number,

	result: any,

	error: Error | VineErrorPayload | string | null,
): void {
	let responseMessage: VineResponse | VineErrorResponse;

	if (error) {
		let errorPayload: VineErrorPayload;

		if (error instanceof Error) {
			errorPayload = {
				message: error.message,

				stack: error.stack,

				name: error.name,

				code: (error as any).code,
			};
		} else if (typeof error === "string") {
			errorPayload = { message: error };
		} else {
			// Assumed VineErrorPayload
			errorPayload = error as VineErrorPayload;
		}

		responseMessage = {
			msg_type: 4,

			id: requestId,

			method: null,

			params: null,

			error: errorPayload,
		};
	} else {
		responseMessage = {
			msg_type: 3,

			id: requestId,

			method: null,

			params: result === undefined ? null : result,

			error: null,
		};
	}

	sendToMountain(responseMessage);
}

export function sendCancelToMountain(requestId: number): void {
	if (!pendingRequests.has(requestId)) return;

	const cancelMessage: VineCancel = {
		msg_type: 5,

		id: requestId,

		method: null,

		params: null,
	};

	sendToMountain(cancelMessage);

	console.log(
		`[Cocoon IPC] Sent CANCEL request for Cocoon-initiated request ID: ${requestId}`,
	);
}

// --- RPC Protocol Adapter ---
let rpcProtocolAdapter: IMessagePassingProtocol | null = null;

let rpcProtocolAdapterReceiveRpcData: ((base64Buffer: string) => void) | null =
	null;

export function createHostProtocolInterface(): IMessagePassingProtocol {
	if (rpcProtocolAdapter) return rpcProtocolAdapter;

	console.log("[Cocoon IPC] Creating RPCProtocol Adapter...");

	// Use VS Code's Emitter for type safety with IMessagePassingProtocol
	const onMessageEmitter = new Emitter<VSBuffer>();

	// Not actively used for dispose in this simple setup
	const onDidDisposeEmitter = new Emitter<void>();

	const send = (buffer: VSBuffer): void => {
		try {
			// VSBuffer.buffer is Uint8Array
			const payload = { buffer: buffer.buffer.toString("base64") };

			sendNotificationToMountain("rpcData", payload);
		} catch (e: any) {
			console.error("[Cocoon IPC Adapter] Failed to send buffer:", e);
		}
	};

	rpcProtocolAdapterReceiveRpcData = (base64Buffer: string): void => {
		try {
			// Node.js Buffer
			const nodeBuffer = Buffer.from(base64Buffer, "base64");

			onMessageEmitter.fire(VSBuffer.wrap(nodeBuffer));
		} catch (e: any) {
			console.error(
				"[Cocoon IPC Adapter] Failed to decode/emit received RPC buffer:",

				e,
			);
		}
	};

	rpcProtocolAdapter = {
		send: send,

		onMessage: onMessageEmitter.event,

		// Can be VscodeEvent.None if not supported
		onDidDispose: onDidDisposeEmitter.event,

		// Not in current IMessagePassingProtocol typically
		// drain: async () => { /* Optional no-op */ },
	};

	return rpcProtocolAdapter;
}

// --- Stdio Listener Setup ---
const rl = readline.createInterface({
	input: process.stdin,

	// Required by readline, not used for outputting JSON lines here
	output: process.stdout,

	terminal: false,
});

console.log("[Cocoon IPC] Setting up stdin listener...");

rl.on("line", (line: string) => {
	if (!line.trim()) return;

	try {
		// Assume incoming line is valid VineMessage
		const message = JSON.parse(line) as VineMessage;

		switch (message.msg_type) {
			// Response
			case 3:
			// ErrorResponse
			case 4:
				if (message.id && pendingRequests.has(message.id)) {
					const { resolve, reject, timeoutHandle } =
						// Assert not undefined
						pendingRequests.get(message.id)!;

					clearTimeout(timeoutHandle);

					pendingRequests.delete(message.id);

					if (message.msg_type === 3) {
						// VineResponse
						console.log(
							`[Mountain -> Cocoon] Received RESULT for Request ID ${message.id}.`,
						);

						resolve(
							message.params === undefined
								? null
								: message.params,
						);
					} else {
						// VineErrorResponse
						console.error(
							`[Mountain -> Cocoon] Received ERROR response for Request ID ${message.id}:`,

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

						if (message.error?.code)
							// Ensure code is string if that's what NodeJS.ErrnoException expects
							error.code = String(message.error.code);

						reject(error);
					}
				} else {
					console.warn(
						`[Cocoon IPC] Received response/error for unknown/timed-out Request ID: ${message.id}`,
					);
				}

				break;

			// Notification
			case 6:
				if (message.method) {
					console.log(
						`[Mountain -> Cocoon] Received NOTIFICATION: ${message.method}`,
					);
				} else {
					console.warn(
						"[Cocoon IPC] Received Notification message without method:",

						message,
					);
				}

				if (
					message.method === "rpcData" &&
					message.params?.buffer &&
					rpcProtocolAdapterReceiveRpcData
				) {
					rpcProtocolAdapterReceiveRpcData(message.params.buffer);
				} else if (message.method === "$acceptConfigurationChanged") {
					internalEmitter.emit(
						"configChanged",

						message.params || [{}, {}],
					);
				} else if (message.method === "$onDidChangeWorkspaceFolders") {
					internalEmitter.emit(
						"workspaceFoldersChanged",

						message.params || {},
					);
				} else {
					// Generic message event
					internalEmitter.emit("message", message);
				}

				break;

			// Request
			case 1:
				if (message.method) {
					console.log(
						`[Mountain -> Cocoon] Received REQUEST: ${message.method} (ID: ${message.id})`,
					);
				} else {
					console.warn(
						"[Cocoon IPC] Received Request message without method:",

						message,
					);
				}

				internalEmitter.emit("message", message);

				break;

			// Cancel
			case 5:
				if (message.id) {
					console.log(
						`[Mountain -> Cocoon] Received CANCEL for Request ID: ${message.id}`,
					);
				} else {
					console.warn(
						"[Cocoon IPC] Received Cancel message without ID:",

						message,
					);
				}

				internalEmitter.emit("cancel", message.id);

				break;

			default:
				console.warn(
					"[Cocoon IPC] Received message with unknown/invalid msg_type:",

					message,
				);

				break;
		}
	} catch (e: any) {
		console.error("[Cocoon IPC] Fatal error processing incoming line:", e);

		console.error("[Cocoon IPC] Offending line:", line.substring(0, 500));
	}
});

rl.on("close", () => {
	console.log("[Cocoon IPC] Stdin closed. Exiting Cocoon process.");

	// Exit Cocoon process when input stream closes
	process.exit(0);
});

// --- Exports ---
// Keep the original export structure for compatibility with index.ts if it uses require()
// If index.ts is also TS and uses import, these can be individual named exports.
// For now, mimicking module.exports:

const ipcApis = {
	sendToMountainAndWait,

	sendNotificationToMountain,

	sendResponseToMountain,

	sendCancelToMountain,

	createHostProtocolInterface,

	onMessageFromMountain: (
		listener: (msg: VineMessage) => void,
	): EventEmitter => internalEmitter.on("message", listener),

	onCancelFromMountain: (
		listener: (requestId: number) => void,
	): EventEmitter => internalEmitter.on("cancel", listener),

	onConfigurationChanged: (
		listener: (params: [any, any]) => void,
	): EventEmitter => internalEmitter.on("configChanged", listener),

	onWorkspaceFoldersChanged: (
		listener: (params: any) => void,
	): EventEmitter => internalEmitter.on("workspaceFoldersChanged", listener),
};

export type CocoonIpcApi = typeof ipcApis;

// Default export for easy import * as ipc
export default ipcApis;

console.log("[Cocoon IPC] IPC Layer Ready.");
