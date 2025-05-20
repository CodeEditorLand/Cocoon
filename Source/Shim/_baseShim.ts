/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim (_baseShim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a base class for Cocoon shims, offering common functionality:
 * - Consistent logging with service identifiers (using injected `ILogService`).
 * - Access to injected core services like the `RPCProtocol` instance (`this._rpcService`).
 * - Helper method (`_getProxy`) to obtain RPC proxies for `MainThread...Shape` services.
 * - Helper methods (`_ipcRequestResponse`, `_ipcNotify`) for making direct `Vine` IPC
 *   calls to Mountain (less preferred than RPC proxies). Handles structured errors from IPC.
 * - Utilities for argument marshalling (`_convertApiArgToInternal`) and revival
 *   (`_reviveApiArgument` using `revive`), including specific handling for common
 *   VS Code API types (Uri, Position, Range, Selection, Location, RegExp).
 * - Helper methods for creating and managing `vscode.Event` emitters backed by Node's
 *   `EventEmitter` (`_createEventEmitter`, `_createEventFromEmitter`, `_createNopEventEmitter`).
 *
 * Key Interactions:
 * - Inherited by most specific shims (`./shims/*.ts`).
 * - Requires `ILogService` and the `RPCProtocol` instance (`IExtHostRpcService`) to be injected.
 * - Uses `cocoon-ipc.js` for direct IPC helpers.
 * - Uses VS Code's `marshalling.revive`, marshalling IDs, and `Event.None` (requires bundling).
 * - Assumes common VS Code API types (Uri, Position, etc.) are available.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events";
// For NOP event emitter type safety; Needs event code bundled
import { Event as VscodeEvent } from "vs/base/common/event"; // Renamed to avoid conflict with DOM Event
// Core revival function; Needs marshalling code bundled
import { revive } from "vs/base/common/marshalling"; // Assuming this is a function: (data: any, context?: any) => any
// Assuming these are classes or interfaces

// Needs marshalling code bundled
import { MarshalledId } from "vs/base/common/marshallingIds"; // Assuming this is an enum or const object

// Import direct IPC functions (use sparingly, prefer RPC proxies)
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
	// Adjust path as needed
} from "../cocoon-ipc";
// Assume VS Code API types are available (might require specific imports based on bundling)
// For the purpose of this conversion, we'll assume these types are correctly imported.
// If these are shimmed versions, their definitions would be in '../Shim/out/vscode'.
import {
	Location,
	Position,
	Range,
	Selection,
	Uri,
	// Adjust path as needed
} from "../Shim/out/vscode";

// Assuming these are functions: (method: string, params: any, timeout?: number) => Promise<any> and (method: string, params: any) => void

// Define interfaces for injected services based on usage
export interface ILogService {
	trace(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string, ...args: any[]): void;
	// Add other methods if used: debug, critical, flush, dispose, onDidChangeLogLevel, getLogLevel, setLevel
}

export interface ProxyIdentifier<T> {
	sid: string; // Service identifier string
}

export interface IExtHostRpcService {
	getProxy<T>(identifier: ProxyIdentifier<T>): T;
	set<T>(identifier: ProxyIdentifier<T>, instance: T): void; // Assuming 'set' takes similar ProxyIdentifier
}

// Interface for structured errors parsed from JSON
interface IStructuredError {
	message?: string;
	name?: string;
	code?: string | number; // Node.js errors often have string codes like 'ENOENT'
	errno?: number; // POSIX error number
	syscall?: string;
	// stack?: string; // Not typically part of the message JSON, but could be
}

/**
 * Attempts to parse a structured error from an Error's message property.
 * If the message is valid JSON representing an error structure, creates a new Error
 * object with properties from the JSON. Otherwise, returns the original error.
 *
 * @param {Error} originalError The original error caught.
 * @param {ILogService | undefined} logService Optional logger.
 * @param {string} context Optional context string for logging.
 * @returns {Error} The original error or a refined error object.
 */
export function refineError(
	originalError: Error,
	logService?: ILogService,
	context: string = "",
): Error {
	if (!(originalError instanceof Error) || !originalError.message) {
		// If it's not an Error object or has no message, return as is
		return originalError;
	}

	let structuredErrorPayload: IStructuredError | null = null;
	try {
		const trimmedMessage = originalError.message.trim();
		if (
			(trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}")) ||
			(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
		) {
			structuredErrorPayload = JSON.parse(
				trimmedMessage,
			) as IStructuredError;
		}
	} catch (e: any) {
		logService?.trace(
			`[RefineError][${context}] Failed to parse error message as JSON:`,
			e,
		);
		return originalError;
	}

	if (structuredErrorPayload && typeof structuredErrorPayload === "object") {
		const newMessage =
			structuredErrorPayload.message || originalError.message;
		const refinedError = new Error(newMessage);

		if (structuredErrorPayload.name)
			refinedError.name = structuredErrorPayload.name;

		// Handle 'code' which might be string or number. Error 'code' is typically string.
		if (structuredErrorPayload.code)
			(refinedError as any).code = String(structuredErrorPayload.code);
		if (structuredErrorPayload.errno)
			(refinedError as any).errno = structuredErrorPayload.errno;
		if (structuredErrorPayload.syscall)
			(refinedError as any).syscall = structuredErrorPayload.syscall;

		refinedError.stack = originalError.stack
			? `${refinedError.name}: ${refinedError.message}\n(Original Stack):\n${originalError.stack}`
			: `${refinedError.name}: ${refinedError.message}\n(Stack trace unavailable)`;

		logService?.trace(
			`[RefineError][${context}] Refined error from JSON message:`,
			refinedError,
		);
		return refinedError;
	}

	return originalError;
}

export class BaseCocoonShim {
	// Required by VSCode DI/type system, unused at runtime
	public readonly _serviceBrand: undefined;

	// String identifier (e.g., 'ExtHostWorkspace') for logging
	readonly #serviceIdentifier: string;

	// The RPCProtocol instance (provided during Cocoon init)
	readonly #rpcService: IExtHostRpcService | undefined;

	// The LogService shim instance (provided during Cocoon init)
	readonly #logService: ILogService | undefined;

	// Tracks messages logged with _logWarnOnce
	#warnOnceMessages = new Set<string>();

	constructor(
		serviceIdentifier: string | symbol,
		rpcService: IExtHostRpcService | undefined, // Allow undefined for robustness
		logService: ILogService | undefined, // Allow undefined for robustness
	) {
		this.#serviceIdentifier = String(serviceIdentifier);
		this.#rpcService = rpcService;
		this.#logService = logService;

		if (!this.#logService) {
			console.warn(
				`[BaseShim][${this.#serviceIdentifier}] LogService not provided! Falling back to console.`,
			);
		}

		if (!this.#rpcService) {
			const errorMsg = `RPCService (RPCProtocol instance) not provided! Many features will fail.`;
			this._logError(errorMsg); // Use internal logger method
		}

		this._log(`Initialized.`);
	}

	// --- Protected properties for subclasses ---
	protected get _logService(): ILogService | undefined {
		return this.#logService;
	}

	protected get _rpcService(): IExtHostRpcService | undefined {
		return this.#rpcService;
	}

	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifier;
	}

	// --- Logging Helpers ---
	protected _log(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.trace(
				`[${this.#serviceIdentifier}] ${message}`,
				...args,
			);
		} else {
			console.log(
				`[${this.#serviceIdentifier}][trace] ${message}`,
				...args,
			);
		}
	}

	protected _logInfo(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.info(
				`[${this.#serviceIdentifier}] ${message}`,
				...args,
			);
		} else {
			console.info(
				`[${this.#serviceIdentifier}][info] ${message}`,
				...args,
			);
		}
	}

	protected _logWarn(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.warn(
				`[${this.#serviceIdentifier}] ${message}`,
				...args,
			);
		} else {
			console.warn(
				`[${this.#serviceIdentifier}][warn] ${message}`,
				...args,
			);
		}
	}

	protected _logError(message: string, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.error(
				`[${this.#serviceIdentifier}] ${message}`,
				...args,
			);
		} else {
			console.error(
				`[${this.#serviceIdentifier}][error] ${message}`,
				...args,
			);
		}
	}

	protected _logWarnOnce(message: string, ...args: any[]): void {
		if (!this.#warnOnceMessages.has(message)) {
			this.#warnOnceMessages.add(message);
			this._logWarn(message, ...args);
		}
	}

	// --- RPC Proxy Helper ---
	protected _getProxy<T>(mainContextId: ProxyIdentifier<T>): T | null {
		if (!this.#rpcService) {
			this._logError(
				`Cannot get RPC proxy for ${String(mainContextId?.sid || mainContextId)}: RPCService unavailable.`,
			);
			return null;
		}
		try {
			return this.#rpcService.getProxy(mainContextId);
		} catch (e: any) {
			this._logError(
				`Failed to get RPC proxy for ${String(mainContextId?.sid || mainContextId)}:`,
				e,
			);
			return null;
		}
	}

	// --- Direct IPC Helpers (Use with caution, prefer RPC proxies) ---
	protected async _ipcRequestResponse(
		mountainMethod: string,
		params: any,
		timeoutMs: number = 5000,
	): Promise<any> {
		this._log(`Sending direct IPC request '${mountainMethod}'...`);
		try {
			const result = await sendToMountainAndWait(
				mountainMethod,
				params,
				timeoutMs,
			);
			this._log(`Received direct IPC response for '${mountainMethod}'.`);
			return result;
		} catch (error: any) {
			const refinedError = refineError(
				error,
				this._logService,
				`ipcRequestResponse(${mountainMethod})`,
			);
			this._logError(
				`Error in direct IPC request '${mountainMethod}':`,
				refinedError,
			);
			throw refinedError;
		}
	}

	protected _ipcNotify(mountainMethod: string, params: any): void {
		const paramSummary = params
			? JSON.stringify(params).substring(0, 80) + "..."
			: "(no params)";
		this._log(
			`Sending direct IPC notification '${mountainMethod}' to Mountain: ${paramSummary}`,
		);
		try {
			sendNotificationToMountain(mountainMethod, params);
		} catch (error: any) {
			this._logError(
				`Error sending direct IPC notification '${mountainMethod}':`,
				error,
			);
		}
	}

	// --- Argument Marshalling/Revival Helpers (Enhanced for Common Types) ---
	protected _convertApiArgToInternal(arg: any): any {
		if (arg === undefined || arg === null) {
			return arg;
		}

		if (typeof arg !== "object") {
			return arg;
		}

		try {
			if (arg instanceof Uri) {
				return {
					$mid: MarshalledId.UriSimple, // Assuming UriSimple is appropriate
					scheme: arg.scheme,
					authority: arg.authority,
					path: arg.path,
					query: arg.query,
					fragment: arg.fragment,
				};
			}
			if (arg instanceof Position) {
				return { line: arg.line, character: arg.character };
			}
			if (arg instanceof Range) {
				return {
					start: this._convertApiArgToInternal(arg.start),
					end: this._convertApiArgToInternal(arg.end),
				};
			}
			if (arg instanceof Selection) {
				// VS Code Selection uses anchor/active which are Positions
				return {
					// This seems to be converting to ISelection for editor, 1-based
					selectionStartLineNumber: arg.anchor.line + 1,
					selectionStartColumn: arg.anchor.character + 1,
					positionLineNumber: arg.active.line + 1,
					positionColumn: arg.active.character + 1,
				};
			}
			if (arg instanceof Location) {
				return {
					uri: this._convertApiArgToInternal(arg.uri),
					range: this._convertApiArgToInternal(arg.range),
				};
			}
			if (arg instanceof RegExp) {
				return {
					$mid: MarshalledId.Regexp,
					source: arg.source,
					flags: arg.flags,
				};
			}
		} catch (conversionError: any) {
			this._logError(
				"Failed during specific type conversion in _convertApiArgToInternal:",
				arg,
				conversionError,
			);
			return arg; // Return original on error
		}

		if (
			typeof (arg as any).toJSON === "function" &&
			!(arg instanceof Array)
		) {
			try {
				return (arg as any).toJSON();
			} catch (e: any) {
				this._logWarn("Failed to call toJSON on argument:", arg, e);
			}
		}

		if (Array.isArray(arg)) {
			return arg.map((el) => this._convertApiArgToInternal(el));
		}

		// Check for plain object
		if (arg.constructor === Object) {
			const result: { [key: string]: any } = {};
			for (const key in arg) {
				if (Object.prototype.hasOwnProperty.call(arg, key)) {
					result[key] = this._convertApiArgToInternal(arg[key]);
				}
			}
			return result;
		}

		this._logWarnOnce(
			`Unhandled object type in _convertApiArgToInternal, returning original:`,
			arg,
		);
		return arg;
	}

	protected _reviveApiArgument<T = any>(arg: any): T {
		if (arg === undefined || arg === null) {
			return arg;
		}
		try {
			return revive(arg); // revive might need a context argument in some VS Code versions/setups
		} catch (e: any) {
			this._logError("Failed to revive argument/result:", arg, e);
			return arg; // Return original on error
		}
	}

	// --- Event Handling Helpers ---
	protected _createEventEmitter(): EventEmitter {
		const emitter = new EventEmitter();
		// emitter.setMaxListeners(20); // Optionally set max listeners
		return emitter;
	}

	protected _createEventFromEmitter<T>(
		emitter: EventEmitter,
		eventName: string = "fire",
	): VscodeEvent<T> {
		const event: VscodeEvent<T> = (listener, thisArgs, disposables) => {
			const handler = (...args: any[]) =>
				listener.call(thisArgs, ...(args as [T])); // Cast args to [T]
			emitter.on(eventName, handler);

			const disposable = {
				dispose: () => {
					emitter.removeListener(eventName, handler);
				},
			};

			if (Array.isArray(disposables)) {
				disposables.push(disposable);
			}
			return disposable;
		};
		return event;
	}

	protected _createNopEventEmitter(): VscodeEvent<any> {
		try {
			if (VscodeEvent && typeof VscodeEvent.None === "function") {
				return VscodeEvent.None;
			}
		} catch (e: any) {
			this._logWarnOnce(
				`Error accessing Event.None, falling back to NOP stub. Error: ${e.message}`,
			);
		}
		this._logWarnOnce(
			"Event.None not available or failed, using NOP stub.",
		);
		return () => ({ dispose: () => {} });
	}
}

// Export helper function too
// module.exports = { BaseCocoonShim, refineError }; // Original JS export
// In TS, we use `export` keyword for classes and functions directly.
// If this file is a module, these are already exported.
// If it's intended to be requireable as an object with these two properties,
// we might need a default export or a namespace.
// For typical module usage, the class and function are already exported.
