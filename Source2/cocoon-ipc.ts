/*---------------------------------------------------------------------------------------------
 * Cocoon Vine IPC Implementation 
 * --------------------------------------------------------------------------------------------
 * Implements the Cocoon-side of the "Vine" IPC protocol for communication with Mountain
 * (host process) over stdio. Provides the adapter for VS Code's RPCProtocol.
 * Also handles messages forwarded from the Sky webview (via Mountain) to extensions
 * running in Cocoon, using an internal event bus (`skyToCocoonMessageBus`).
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events";
import * as readline from "readline";
import { VSBuffer } from "vs/base/common/buffer";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { toDisposable, type IDisposable } from "vs/base/common/lifecycle";
import { type IMessagePassingProtocol } from "vs/base/parts/ipc/common/ipc";
import { ILogService } from "vs/platform/log/common/log"; // For initializeSkyIpcRouter
import type {
	IConfigurationChange,
	IConfigurationInitData,
	IWorkspaceFoldersChangeEventData,
} from "vs/workbench/api/common/extHost.protocol";

import type { CancellationTokenRegistry } from "./cancellation-token-registry";

console.log(
	"[Cocoon IPC] Initializing Vine IPC layer for communication with Mountain...",
);

// --- Type Definitions for the Vine Protocol ---
export type VineMsgType = 1 | 3 | 4 | 5 | 6;
export interface VineMessageBase {
	msg_type: VineMsgType;
	id: number | null;
	method: string | null;
}
export interface VineRequest extends VineMessageBase {
	msg_type: 1;
	id: number;
	method: string;
	params: any;
}
export interface VineResponse extends VineMessageBase {
	msg_type: 3;
	id: number;
	method: null;
	params: any;
	error: null;
}
export interface VineErrorPayload {
	message: string;
	stack?: string;
	name?: string;
	code?: string | number;
	$isError?: boolean;
}
export interface VineErrorResponse extends VineMessageBase {
	msg_type: 4;
	id: number;
	method: null;
	params: null;
	error: VineErrorPayload;
}
export interface VineCancel extends VineMessageBase {
	msg_type: 5;
	id: number;
	method: null;
	params: null;
}
export interface VineNotification extends VineMessageBase {
	msg_type: 6;
	id: null;
	method: string;
	params: any;
}
export type VineMessage =
	| VineRequest
	| VineResponse
	| VineErrorResponse
	| VineCancel
	| VineNotification;

interface PendingRequestEntry {
	resolve: (value: any) => void;
	reject: (reason?: any) => void;
	timeoutHandle: NodeJS.Timeout;
	methodForLog: string;
}

// --- Module-Scoped State Variables ---
const pendingRequests = new Map<number, PendingRequestEntry>();
let nextRequestId = 1;
const internalAppEmitter = new EventEmitter();
let globalCancellationTokenRegistry: CancellationTokenRegistry | null = null;

// Emitter for messages from Sky (via Mountain) to Cocoon extensions
export const skyToCocoonMessageBus = new EventEmitter();
let _ipcRouterLogService: ILogService | undefined;

// Placeholder for actual invoke handler lookup
// This needs to be implemented and populated by a service where extensions register their ipcRenderer.handle callbacks.
const cocoonInvokeHandlers = new Map<
	string,
	(...args: any[]) => Promise<any> | any
>();

export function registerCocoonInvokeHandler(
	channel: string,
	handler: (...args: any[]) => Promise<any> | any,
) {
	_ipcRouterLogService?.info(
		`[Cocoon IPC Router] Registering invoke handler for channel: ${channel}`,
	);
	cocoonInvokeHandlers.set(channel, handler);
	return toDisposable(() => {
		_ipcRouterLogService?.info(
			`[Cocoon IPC Router] Unregistering invoke handler for channel: ${channel}`,
		);
		cocoonInvokeHandlers.delete(channel);
	});
}

function findCocoonInvokeHandler(
	channel: string,
): ((...args: any[]) => Promise<any> | any) | undefined {
	return cocoonInvokeHandlers.get(channel);
}

export function initializeSkyIpcRouter(logService?: ILogService): void {
	_ipcRouterLogService = logService;
	_ipcRouterLogService?.info(
		"[Cocoon IPC Router] Sky IPC Router initialized (handlers can now be registered).",
	);
}

// --- Core IPC Communication Functions ---
function sendToMountainRaw(vineMessagePayload: VineMessage): void {
	try {
		const jsonStringToSend = JSON.stringify(vineMessagePayload);
		const methodInfoForLog = vineMessagePayload.method
			? ` Method=${vineMessagePayload.method}`
			: "";
		const idInfoForLog =
			vineMessagePayload.id !== null
				? ` ID=${vineMessagePayload.id}`
				: "";
		const payloadSummaryForLog =
			jsonStringToSend.length > 200
				? jsonStringToSend.substring(0, 200) +
					`... (len ${jsonStringToSend.length})`
				: jsonStringToSend;
		// Use _ipcRouterLogService or console.debug if service not yet available
		(_ipcRouterLogService || console).debug(
			`[Cocoon IPC -> Mtn] Type=${vineMessagePayload.msg_type}${idInfoForLog}${methodInfoForLog}, PayloadSum=${payloadSummaryForLog}`,
		);
		process.stdout.write(jsonStringToSend + "\n");
	} catch (error: any) {
		console.error(
			`[Cocoon IPC] FATAL: Failed to stringify/send payload to Mountain. MsgType: ${vineMessagePayload?.msg_type}, Method: ${vineMessagePayload?.method}, ID: ${vineMessagePayload?.id}. Error: ${error.message}`,
			error.stack,
		);
	}
}

export function sendToMountainAndWait(
	methodName: string,
	parameters: any,
	timeoutMilliseconds: number = 5000,
): Promise<any> {
	return new Promise((resolvePromiseCallback, rejectPromiseCallback) => {
		const currentRequestId = nextRequestId++;
		const requestMessageToSend: VineRequest = {
			msg_type: 1,
			id: currentRequestId,
			method: methodName,
			params: parameters,
		};
		const timeoutHandle = setTimeout(() => {
			if (pendingRequests.has(currentRequestId)) {
				pendingRequests.delete(currentRequestId);
				const timeoutErrorMessage = `[Cocoon IPC] Request ${currentRequestId} ('${methodName}') to Mountain timed out after ${timeoutMilliseconds}ms.`;
				console.error(timeoutErrorMessage);
				const requestTimeoutError = new Error(timeoutErrorMessage);
				(requestTimeoutError as NodeJS.ErrnoException).code =
					"ETIMEDOUT";
				rejectPromiseCallback(requestTimeoutError);
			}
		}, timeoutMilliseconds);
		pendingRequests.set(currentRequestId, {
			resolve: resolvePromiseCallback,
			reject: rejectPromiseCallback,
			timeoutHandle: timeoutHandle,
			methodForLog: methodName,
		});
		sendToMountainRaw(requestMessageToSend);
	});
}

export function sendNotificationToMountain(
	methodName: string,
	parameters: any,
): void {
	const notificationMessageToSend: VineNotification = {
		msg_type: 6,
		id: null,
		method: methodName,
		params: parameters,
	};
	sendToMountainRaw(notificationMessageToSend);
}

export function sendResponseToMountain(
	requestIdFromMountain: number,
	resultPayload: any,
	errorObjectOrMessage: Error | VineErrorPayload | string | null,
): void {
	let responseMessageToSend: VineResponse | VineErrorResponse;
	if (errorObjectOrMessage) {
		let vineErrorPayloadToSerialize: VineErrorPayload;
		if (errorObjectOrMessage instanceof Error) {
			vineErrorPayloadToSerialize = {
				$isError: true,
				message: errorObjectOrMessage.message,
				stack: errorObjectOrMessage.stack,
				name: errorObjectOrMessage.name,
				code: (errorObjectOrMessage as NodeJS.ErrnoException).code,
			};
		} else if (typeof errorObjectOrMessage === "string") {
			vineErrorPayloadToSerialize = {
				$isError: true,
				message: errorObjectOrMessage,
			};
		} else {
			vineErrorPayloadToSerialize = {
				$isError: true,
				...errorObjectOrMessage,
			};
		}
		responseMessageToSend = {
			msg_type: 4,
			id: requestIdFromMountain,
			method: null,
			params: null,
			error: vineErrorPayloadToSerialize,
		};
	} else {
		responseMessageToSend = {
			msg_type: 3,
			id: requestIdFromMountain,
			method: null,
			params: resultPayload === undefined ? null : resultPayload,
			error: null,
		};
	}
	sendToMountainRaw(responseMessageToSend);
}

export function sendCancelToMountain(requestIdToCancel: number): void {
	if (!pendingRequests.has(requestIdToCancel)) {
		console.warn(
			`[Cocoon IPC] Attempted to send CANCEL for non-pending/unknown Request ID: ${requestIdToCancel}.`,
		);
		return;
	}
	const cancelMessageToSend: VineCancel = {
		msg_type: 5,
		id: requestIdToCancel,
		method: null,
		params: null,
	};
	sendToMountainRaw(cancelMessageToSend);
	const pendingEntry = pendingRequests.get(requestIdToCancel);
	console.log(
		`[Cocoon IPC] Sent CANCEL to Mountain for Cocoon-initiated request ID: ${requestIdToCancel} (Method: ${pendingEntry?.methodForLog}).`,
	);
}

// --- RPCProtocol Adapter Setup ---
let rpcMessagePassingProtocolInstance: IMessagePassingProtocol | null = null;
let rpcAdapterReceiveDataCallback:
	| ((base64EncodedBufferData: string) => void)
	| null = null;

export function createHostProtocolInterface(): IMessagePassingProtocol {
	if (rpcMessagePassingProtocolInstance)
		return rpcMessagePassingProtocolInstance;
	console.log(
		"[Cocoon IPC] Creating RPCProtocol Adapter for communication with Mountain host...",
	);
	const onMessageEventFromMountainForRpc = new VscodeEmitter<VSBuffer>();
	const sendVSBufferToMountainViaNotification = (
		vsBufferToSend: VSBuffer,
	): void => {
		try {
			const base64EncodedDataString = Buffer.from(
				vsBufferToSend.buffer,
				vsBufferToSend.byteOffset,
				vsBufferToSend.byteLength,
			).toString("base64");
			sendNotificationToMountain("rpcData", {
				buffer: base64EncodedDataString,
			});
		} catch (error: any) {
			console.error(
				`[Cocoon IPC Adapter] Failed to serialize/send VSBuffer to Mountain via 'rpcData'. Error: ${error.message}`,
				error.stack,
			);
		}
	};
	rpcAdapterReceiveDataCallback = (base64EncodedBufferData: string): void => {
		try {
			const nodeJsBuffer = Buffer.from(base64EncodedBufferData, "base64");
			onMessageEventFromMountainForRpc.fire(VSBuffer.wrap(nodeJsBuffer));
		} catch (error: any) {
			console.error(
				`[Cocoon IPC Adapter] Failed to decode/emit received RPC VSBuffer from Mountain. Error: ${error.message}`,
				error.stack,
			);
		}
	};
	rpcMessagePassingProtocolInstance = {
		send: sendVSBufferToMountainViaNotification,
		onMessage: onMessageEventFromMountainForRpc.event,
		onDidDispose: VscodeEvent.None,
	};
	return rpcMessagePassingProtocolInstance;
}

// --- Stdio Listener Setup ---
const lineReaderFromMountain = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});
console.log(
	"[Cocoon IPC] Setting up stdin listener for newline-delimited JSON messages from Mountain...",
);

async function handleIncomingLineFromMountain(
	lineFromStringTransport: string,
): Promise<void> {
	if (!lineFromStringTransport.trim()) return;
	try {
		const incomingMessageFromMountain = JSON.parse(
			lineFromStringTransport,
		) as VineMessage;
		switch (incomingMessageFromMountain.msg_type) {
			case 3:
			case 4: // Response or Error from Mountain
				if (
					incomingMessageFromMountain.id !== null &&
					pendingRequests.has(incomingMessageFromMountain.id)
				) {
					const pendingEntry = pendingRequests.get(
						incomingMessageFromMountain.id,
					)!;
					clearTimeout(pendingEntry.timeoutHandle);
					pendingRequests.delete(incomingMessageFromMountain.id);
					if (incomingMessageFromMountain.msg_type === 3) {
						pendingEntry.resolve(
							incomingMessageFromMountain.params === undefined
								? null
								: incomingMessageFromMountain.params,
						);
					} else {
						console.error(
							`[Cocoon IPC <- Mtn] Received ERROR response for Request '${pendingEntry.methodForLog}' (ID ${incomingMessageFromMountain.id}):`,
							incomingMessageFromMountain.error,
						);
						const err = new Error(
							incomingMessageFromMountain.error?.message ||
								"Unknown error from Mountain",
						);
						if (incomingMessageFromMountain.error?.name)
							err.name = incomingMessageFromMountain.error.name;
						if (incomingMessageFromMountain.error?.stack)
							err.stack = incomingMessageFromMountain.error.stack;
						if (
							incomingMessageFromMountain.error?.code !==
							undefined
						)
							(err as NodeJS.ErrnoException).code = String(
								incomingMessageFromMountain.error.code,
							);
						if (incomingMessageFromMountain.error?.$isError)
							(err as any).$isError = true;
						pendingEntry.reject(err);
					}
				} else {
					console.warn(
						`[Cocoon IPC <- Mtn] Received response/error for unknown/processed/timed-out Request ID: ${incomingMessageFromMountain.id}. Discarding.`,
						incomingMessageFromMountain,
					);
				}
				break;
			case 6: // Notification from Mountain
				if (
					incomingMessageFromMountain.method === "rpcData" &&
					incomingMessageFromMountain.params?.buffer &&
					typeof incomingMessageFromMountain.params.buffer ===
						"string"
				) {
					if (rpcAdapterReceiveDataCallback)
						rpcAdapterReceiveDataCallback(
							incomingMessageFromMountain.params.buffer,
						);
					else
						console.warn(
							"[Cocoon IPC <- Mtn] Received 'rpcData' but RPC adapter callback not set.",
						);
				} else if (
					incomingMessageFromMountain.method?.startsWith("ipc:send:")
				) {
					// Forwarded from Sky
					const originalChannel =
						incomingMessageFromMountain.method.substring(
							"ipc:send:".length,
						);
					const originalArgument = incomingMessageFromMountain.params;
					(_ipcRouterLogService || console).debug(
						`[Cocoon IPC] Received forwarded 'send' from Sky (via Mountain) for channel '${originalChannel}'`,
						originalArgument,
					);
					const mockIpcEvent = { sender: { id: "sky-forwarder" } };
					skyToCocoonMessageBus.emit(
						originalChannel,
						mockIpcEvent,
						...(Array.isArray(originalArgument)
							? originalArgument
							: [originalArgument]),
					);
				} else if (
					incomingMessageFromMountain.method ===
						"$acceptConfigurationChanged" &&
					incomingMessageFromMountain.params
				) {
					internalAppEmitter.emit(
						"configChanged",
						incomingMessageFromMountain.params as ConfigurationChangedEventPayload,
					);
				} else if (
					incomingMessageFromMountain.method ===
						"$onDidChangeWorkspaceFolders" &&
					incomingMessageFromMountain.params
				) {
					internalAppEmitter.emit(
						"workspaceFoldersChanged",
						incomingMessageFromMountain.params as WorkspaceFoldersChangedEventPayload,
					);
				} else {
					internalAppEmitter.emit(
						"message",
						incomingMessageFromMountain,
					);
				}
				break;
			case 1: // Request from Mountain
				if (
					incomingMessageFromMountain.method?.startsWith(
						"ipc:invoke:",
					)
				) {
					// Forwarded invoke from Sky
					const originalChannel =
						incomingMessageFromMountain.method.substring(
							"ipc:invoke:".length,
						);
					const originalArgument = incomingMessageFromMountain.params;
					const requestIdFromMountain =
						incomingMessageFromMountain.id!;
					(_ipcRouterLogService || console).debug(
						`[Cocoon IPC] Received forwarded 'invoke' from Sky for channel '${originalChannel}' (MountainReqID: ${requestIdFromMountain})`,
						originalArgument,
					);
					let promiseResult: any;
					let promiseError: any = null;
					try {
						const invokeHandler =
							findCocoonInvokeHandler(originalChannel);
						if (invokeHandler)
							promiseResult = await invokeHandler(
								...(Array.isArray(originalArgument)
									? originalArgument
									: [originalArgument]),
							);
						else
							throw new Error(
								`No handler registered in Cocoon for invoke channel: ${originalChannel} (forwarded from Sky)`,
							);
					} catch (e) {
						console.error(
							`[Cocoon IPC] Error executing forwarded invoke for channel '${originalChannel}':`,
							e,
						);
						promiseError = e;
					}
					sendResponseToMountain(
						requestIdFromMountain,
						promiseResult,
						promiseError,
					);
				} else {
					// Likely an RPC request for an ExtHost service
					internalAppEmitter.emit(
						"message",
						incomingMessageFromMountain,
					);
				}
				break;
			case 5: // Cancel from Mountain
				if (incomingMessageFromMountain.id !== null) {
					const tokenIdToCancel = incomingMessageFromMountain.id;
					console.debug(
						`[Cocoon IPC <- Mtn] Received CANCEL from Mountain for operation/token ID: ${tokenIdToCancel}.`,
					);
					if (globalCancellationTokenRegistry)
						globalCancellationTokenRegistry.cancel(tokenIdToCancel);
					else
						console.warn(
							`[Cocoon IPC <- Mtn] CancellationTokenRegistry not available to process CANCEL for token ID ${tokenIdToCancel}.`,
						);
					if (pendingRequests.has(tokenIdToCancel))
						console.warn(
							`[Cocoon IPC <- Mtn] CANCEL ID ${tokenIdToCancel} also matches a pending Cocoon-to-Mountain request. Interpreting as Mountain cancelling Cocoon's operation.`,
						);
					internalAppEmitter.emit(
						"cancelRequestFromMountain",
						tokenIdToCancel,
					);
				} else {
					console.warn(
						"[Cocoon IPC <- Mtn] Received CANCEL from Mountain without valid Request ID.",
						incomingMessageFromMountain,
					);
				}
				break;
			default:
				console.warn(
					"[Cocoon IPC <- Mtn] Received message with unknown or invalid `msg_type`:",
					incomingMessageFromMountain,
				);
		}
	} catch (jsonParseError: any) {
		console.error(
			"[Cocoon IPC] Fatal error parsing incoming line from Mountain as JSON.",
			"Error:",
			jsonParseError.message,
			"Line (first 500 chars):",
			lineFromStringTransport.substring(0, 500),
		);
	}
}

lineReaderFromMountain.on("line", (line) => {
	handleIncomingLineFromMountain(line).catch((err) => {
		console.error(
			"[Cocoon IPC] Unhandled error in handleIncomingLineFromMountain async processing:",
			err,
		);
	});
});

lineReaderFromMountain.on("close", () => {
	console.log(
		"[Cocoon IPC] Stdin stream closed by Mountain. Cocoon process attempting graceful exit.",
	);
	process.exit(0);
});

// --- Named Event Emitter Wrapper Functions ---
export function onMessageFromMountain(
	listenerCallback: (vineMessage: VineMessage) => void,
): IDisposable {
	internalAppEmitter.on("message", listenerCallback);
	return toDisposable(() =>
		internalAppEmitter.removeListener("message", listenerCallback),
	);
}
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
export type ConfigurationChangedEventPayload = {
	data: IConfigurationInitData;
	change: IConfigurationChange;
};
export function onConfigurationChanged(
	listenerCallback: (payload: ConfigurationChangedEventPayload) => void,
): IDisposable {
	internalAppEmitter.on("configChanged", listenerCallback);
	return toDisposable(() =>
		internalAppEmitter.removeListener("configChanged", listenerCallback),
	);
}
export type WorkspaceFoldersChangedEventPayload =
	IWorkspaceFoldersChangeEventData;
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
export function initializeIpcCancellation(
	cancellationTokenRegistryInstance: CancellationTokenRegistry,
): void {
	globalCancellationTokenRegistry = cancellationTokenRegistryInstance;
	console.log(
		"[Cocoon IPC] CancellationTokenRegistry linked. Cancellation messages from Mountain can now be processed.",
	);
}

const ipcInterface = {
	sendToMountainAndWait,
	sendNotificationToMountain,
	sendResponseToMountain,
	sendCancelToMountain,
	createHostProtocolInterface,
	onMessageFromMountain,
	onCancelRequestFromMountain,
	onConfigurationChanged,
	onWorkspaceFoldersChanged,
	initializeIpcCancellation,
	registerCocoonInvokeHandler, // Expose for internal services to register handlers
};
export type CocoonPrimaryIpc = typeof ipcInterface;
export default ipcInterface;

console.log("[Cocoon IPC] Vine IPC Layer fully initialized and operational.");
