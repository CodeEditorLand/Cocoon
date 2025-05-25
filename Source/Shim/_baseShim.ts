// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/116_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): d6e466e2aeb4bafb81aa8d7f740e0a0f2d8094638546c53856ba92b07a7a7296
// Extracted to File: Backup/TSFMSC/Code/_baseShim.ts
// Extraction Timestamp: 2025-05-25T14:02:57.012Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE _baseShim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim (_baseShim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a foundational abstract class, `BaseCocoonShim`, offering common utilities
 * for other Cocoon shims. These utilities facilitate logging, RPC/IPC communication,
 * argument marshalling/revival for inter-process communication, and event handling.
 *
 * Its primary goal is to standardize common operations across shims and reduce boilerplate
 * code, particularly for interactions with the Mountain host process and for adapting
 * VS Code API patterns.
 *
 * Responsibilities:
 * - Providing standardized logging methods (`_log`, `_logError`, etc.).
 * - Offering helper methods for direct IPC communication with Mountain (`_ipcRequestResponse`, `_ipcNotify`).
 * - Abstracting access to the RPC proxy (`_getProxy`).
 * - Implementing utility functions for argument marshalling (converting VS Code API objects
 *   to DTOs suitable for JSON serialization, potentially with `$mid` markers) and revival
 *   (using VS Code's internal `revive` function).
 * - Providing helpers for creating and managing event emitters (`EventEmitter` and `VscodeEvent`).
 * - Defining common interfaces for dependencies like logging and RPC services.
 * - Offering an error refinement utility (`refineErrorForShim`) to parse structured
 *   error messages.
 *
 * Key Interactions:
 * - Extended by most other service shims (e.g., `ShimExtHostWorkspace`, `ShimExtHostCommands`).
 * - Uses `cocoon-ipc.ts` for direct IPC calls (`sendToMountainAndWait`, `sendNotificationToMountain`).
 * - Interacts with an `IRpcProtocolServiceAdapter` (representing `RPCProtocol`) for proxy retrieval.
 * - Relies on `ILogServiceForShim` for logging.
 * - Uses VS Code's marshalling utilities (`vs/base/common/marshalling`, `vs/base/common/marshallingIds`).
 * - Uses VS Code's eventing types (`vs/base/common/event`).
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events"; // Node.js EventEmitter

// VS Code internal types
import { VSBuffer } from "vs/base/common/buffer";
import {
	Emitter as VscodeEmitter, // Renamed to avoid confusion if used locally
	Event as VscodeEvent,
	type IDisposable,
} from "vs/base/common/event";
import {
	MarshalledId, // For checking marshalled types
	revive as vscodeRevive, // VS Code's standard revival function
	// type MarshalledObject, // Not directly used in this file's API
} from "vs/base/common/marshalling";
// For URI scheme constants
import { Schemas } from "vs/base/common/network";

// Cocoon-specific IPC helpers for direct communication
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
} from "../cocoon-ipc";

// Import vscode API types that this shim might handle for marshalling/revival.
// These should align with the types defined in `../Shim/out/vscode.js` or similar.
import {
	Location as VscodeApiLocation,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
	// TODO: Import other vscode API types as needed by _convertApiArgToInternal
	// e.g., MarkdownString, NotebookCellData, etc.
} from "../Shim/out/vscode";

// --- Type Definitions ---

/**
 * Defines the logging interface expected by `BaseCocoonShim` and its derivatives.
 * This allows shims to use a consistent logging API, typically provided by `ShimLogService`.
 */
export interface ILogServiceForShim {
	trace(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void; // Added debug
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string | Error, ...args: any[]): void;
}

/**
 * Represents an identifier for a service proxy used in RPC communication.
 * Based on `vs/workbench/services/extensions/common/proxyIdentifier.ts`.
 * @template T The type of the service being proxied.
 */
export interface ProxyIdentifier<T> {
	/** The string identifier of the service (e.g., "MainThreadCommands"). */
	readonly sid: string;
	/** A numeric identifier, crucial for some RPCProtocol implementations. */
	readonly nid: number; // Though nid is not always used by all RPCProtocol versions.
}

/**
 * Defines the interface for an RPC protocol service adapter, typically representing
 * VS Code's `RPCProtocol` instance. Shims use this to get proxies to MainThread services.
 */
export interface IRpcProtocolServiceAdapter {
	/**
	 * Retrieves a proxy object for the service identified by `identifier`.
	 * @template T The type of the service proxy.
	 * @param identifier The `ProxyIdentifier` for the service.
	 * @returns A proxy object of type `T` that forwards calls to the MainThread.
	 */
	getProxy<T>(identifier: ProxyIdentifier<T>): T; // T is typically Proxied<T>

	/**
	 * Registers a local service implementation with the RPC protocol, making it callable
	 * from the MainThread.
	 * @template T The type of the service interface.
	 * @template R The type of the service implementation (must extend T).
	 * @param identifier The `ProxyIdentifier` for the service.
	 * @param value The service implementation instance.
	 * @returns The registered service implementation instance.
	 */
	set<T, R extends T>(identifier: ProxyIdentifier<T>, value: R): R;

	/**
	 * Optional method to transform incoming URIs in an RPC message payload if a
	 * URI transformer is configured for the RPCProtocol.
	 * @template T The type of the object containing URIs.
	 * @param obj The object to transform.
	 * @returns The object with URIs transformed.
	 */
	transformIncomingURIs?<T>(obj: T): T;

	/**
	 * Optional method to ensure all pending RPC messages are sent.
	 */
	drain?(): Promise<void>;
}

/**
 * Represents a structured error payload that might be received from Mountain,
 * often when an error message is JSON-serialized.
 */
interface IStructuredErrorPayload {
	message?: string;
	name?: string;
	code?: string | number; // Node.js 'code' (e.g., 'ENOENT') or custom numeric code
	errno?: number;         // POSIX errno number
	syscall?: string;       // System call related to the error (e.g., 'stat')
	// Additional fields can be added if Mountain sends more structured error data.
}

/**
 * Attempts to refine an error object. If the error's message is a JSON string
 * representing a structured error (IStructuredErrorPayload), it parses this JSON
 * and constructs a new Error object with properties from the payload (like code, name).
 * Otherwise, it returns the original error.
 *
 * @param originalError The error object to refine.
 * @param logService An optional logger for tracing parsing attempts.
 * @param context An optional context string for logging.
 * @returns A refined Error object or the original error if refinement is not possible.
 */
export function refineErrorForShim(
	originalError: any, // Accept any to handle non-Error throws
	logService?: ILogServiceForShim,
	context = "",
): Error {
	if (!(originalError instanceof Error) || !originalError.message) {
        // If not an Error or no message, return as a new Error or original if already Error
		return originalError instanceof Error ? originalError : new Error(String(originalError));
    }

	let structuredErrorPayload: IStructuredErrorPayload | null = null;
	try {
		const trimmedMessage = originalError.message.trim();
		// Attempt to parse only if it looks like JSON
		if (
			(trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}")) ||
			(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
		) {
			structuredErrorPayload = JSON.parse(trimmedMessage) as IStructuredErrorPayload;
		}
	} catch (parseError: any) {
		logService?.trace(
			`[RefineError][${context}] Failed to parse error message as JSON (this is often normal):`,
			parseError.message || parseError,
		);
		// If parsing fails, it's not a structured JSON error message; return original.
		return originalError;
	}

	if (structuredErrorPayload && typeof structuredErrorPayload === "object") {
		// Create a new error from the structured payload.
		const newMessage = structuredErrorPayload.message || originalError.message; // Fallback to original message
		const refinedError = new Error(newMessage) as NodeJS.ErrnoException; // Cast for properties like 'code'

		if (structuredErrorPayload.name) refinedError.name = structuredErrorPayload.name;
		if (structuredErrorPayload.code !== undefined) refinedError.code = String(structuredErrorPayload.code);
		if (structuredErrorPayload.errno !== undefined) refinedError.errno = structuredErrorPayload.errno;
		if (structuredErrorPayload.syscall !== undefined) refinedError.syscall = structuredErrorPayload.syscall;

		// Preserve original stack if available, prefixed with new error info.
		refinedError.stack = originalError.stack
			? `${refinedError.name}: ${refinedError.message}\n(Original Stack from Mountain/IPC):\n${originalError.stack}`
			: `${refinedError.name}: ${refinedError.message}\n(Stack trace unavailable or not from original error)`;

		logService?.trace(`[RefineError][${context}] Refined error from JSON:`, refinedError.message);
		return refinedError;
	}

	// If not a structured JSON error, return the original error.
	return originalError;
}


/**
 * Base class for Cocoon shims, providing common utilities.
 */
export class BaseCocoonShim implements IDisposable {
	public readonly _serviceBrand: undefined; // For DI compatibility with VS Code services

	readonly #serviceIdentifierString: string;
	readonly #rpcProtocolAdapter: IRpcProtocolServiceAdapter | undefined;
	readonly #logger: ILogServiceForShim | undefined;
	readonly #warnOnceMessageSet = new Set<string>(); // Renamed for clarity
    protected readonly _instanceDisposables = new DisposableStore(); // For managing disposables within the shim instance


	/**
	 * Creates an instance of BaseCocoonShim.
	 * @param serviceIdentifier A string or symbol uniquely identifying the shim, used for logging.
	 * @param rpcServiceAdapter The RPC protocol adapter for communication with the MainThread, or undefined if not used.
	 * @param logService The logging service instance, or undefined to use console logging.
	 */
	constructor(
		serviceIdentifier: string | symbol,
		rpcServiceAdapter: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		this.#serviceIdentifierString = String(serviceIdentifier);
		this.#rpcProtocolAdapter = rpcServiceAdapter;
		this.#logger = logService;

		if (!this.#logger) {
			console.warn(
				`[BaseShim][${this.#serviceIdentifierString}] LogService (ILogServiceForShim) not provided! Falling back to console logging.`,
			);
		}
		if (!this.#rpcProtocolAdapter && this._requiresRpc()) {
			// Subclasses can override _requiresRpc if RPC is optional for them.
			this._logError( // Use internal logger which falls back to console
				`RPCService Adapter (IRpcProtocolServiceAdapter) not provided for ${this.#serviceIdentifierString}, but it appears to be required. Many features will be impaired.`,
			);
		}
		this._log(`Initialized.`);
	}

    /**
     * Indicates if this shim fundamentally requires an RPC service adapter to function.
     * Subclasses can override this if RPC is optional.
     * @returns `true` if RPC is required, `false` otherwise. Default is `true`.
     */
    protected _requiresRpc(): boolean {
        return true;
    }

	/** Provides access to the configured logger. */
	protected get _logService(): ILogServiceForShim | undefined {
		return this.#logger;
	}

	/** Provides access to the configured RPC service adapter. */
	protected get _rpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#rpcProtocolAdapter;
	}

	/** Gets the string identifier for this shim service. */
	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifierString;
	}

	// --- Logging Helpers ---
	protected _log(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;
		if (this.#logger) {
			this.#logger.trace(`${prefix} ${message}`, ...args);
		} else {
			console.trace(`${prefix}[trace] ${message}`, ...args);
		}
	}

	protected _logInfo(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;
		if (this.#logger) {
			this.#logger.info(`${prefix} ${message}`, ...args);
		} else {
			console.info(`${prefix}[info] ${message}`, ...args);
		}
	}

	protected _logWarn(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;
		if (this.#logger) {
			this.#logger.warn(`${prefix} ${message}`, ...args);
		} else {
			console.warn(`${prefix}[warn] ${message}`, ...args);
		}
	}

	protected _logError(message: string | Error, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;
		if (this.#logger) {
            // Pass the message directly, ShimLogService._formatMessage handles Error instances
			this.#logger.error(message instanceof Error ? message : `${prefix} ${message}`, ...args);
		} else {
			if (message instanceof Error) {
				console.error(`${prefix}[error] ${message.message}`, message.stack, ...args);
			} else {
				console.error(`${prefix}[error] ${message}`, ...args);
			}
		}
	}

	protected _logWarnOnce(message: string, ...args: any[]): void {
		if (!this.#warnOnceMessageSet.has(message)) {
			this.#warnOnceMessageSet.add(message);
			this._logWarn(message, ...args);
		}
	}

	/**
	 * Retrieves an RPC proxy for a MainThread service.
	 * @template T The type of the service proxy.
	 * @param identifier The `ProxyIdentifier` for the service.
	 * @returns The service proxy, or `null` if the RPC adapter is unavailable or proxy creation fails.
	 */
	protected _getProxy<T>(identifier: ProxyIdentifier<T>): T | null {
		const serviceSidForLog = identifier?.sid || String(identifier);
		if (!this.#rpcProtocolAdapter) {
			this._logError(`Cannot get RPC proxy for ${serviceSidForLog}: RPCService Adapter (IRpcProtocolServiceAdapter) is unavailable.`);
			return null;
		}
		try {
			return this.#rpcProtocolAdapter.getProxy(identifier);
		} catch (e: any) {
			this._logError(
				`Failed to get RPC proxy for ${serviceSidForLog}:`,
				refineErrorForShim(e, this.#logger, `getProxy(${serviceSidForLog})`),
			);
			return null;
		}
	}

	// --- Direct IPC Helpers (using cocoon-ipc.ts) ---

	/**
	 * Sends a request to Mountain via direct IPC and waits for a response.
	 * @param mountainMethod The IPC method name to call on Mountain.
	 * @param params The parameters for the IPC call.
	 * @param timeoutMs The timeout for the request in milliseconds.
	 * @returns A promise that resolves with the result from Mountain.
	 * @throws An error if the IPC call fails or times out, refined by `refineErrorForShim`.
	 */
	protected async _ipcRequestResponse(mountainMethod: string, params: any, timeoutMs = 5000): Promise<any> {
		// Verbose by default, can be commented out in subclasses if too noisy.
		this._log(`IPC Req: '${mountainMethod}', Params: ${JSON.stringify(params).substring(0, 80)}...`);
		try {
			const result = await sendToMountainAndWait(mountainMethod, params, timeoutMs);
			// this._log(`IPC Resp for '${mountainMethod}' received.`);
			return result;
		} catch (error: any) {
			// refineErrorForShim expects an Error object ideally
			const refined = refineErrorForShim(error, this.#logger, `ipcRequest(${mountainMethod})`);
			this._logError(`IPC Req Error for '${mountainMethod}': ${refined.message}`, refined.stack);
			throw refined; // Rethrow the refined error
		}
	}

	/**
	 * Sends a notification to Mountain via direct IPC (fire-and-forget).
	 * @param mountainMethod The IPC notification method name on Mountain.
	 * @param params The parameters for the notification.
	 */
	protected _ipcNotify(mountainMethod: string, params: any): void {
		const paramSummary = params ? JSON.stringify(params).substring(0, 80) + (JSON.stringify(params).length > 80 ? "..." : "") : "(no params)";
		this._log(`IPC Notify: '${mountainMethod}', Params: ${paramSummary}`);
		try {
			sendNotificationToMountain(mountainMethod, params);
		} catch (error: any) {
            // sendNotificationToMountain typically doesn't throw for send errors but logs them.
            // This catch is for synchronous errors during payload construction, if any.
			this._logError(`Error preparing direct IPC notification '${mountainMethod}':`, error);
		}
	}

	// --- Argument Marshalling/Revival Helpers ---

	/**
	 * Converts a VS Code API object (e.g., Uri, Position) into an internal representation
	 * suitable for JSON serialization and RPC/IPC, potentially adding a `$mid` marker
	 * for VS Code's `revive` function.
	 *
	 * This method handles common VS Code types. For types not explicitly handled,
	 * it attempts to use their `toJSON()` method or recurses through plain objects/arrays.
	 *
	 * @param arg The VS Code API argument to convert.
	 * @returns The marshalled representation of the argument.
	 */
	protected _convertApiArgToInternal(arg: any): any {
		if (arg === undefined || arg === null) return arg;
		if (arg instanceof VSBuffer) return arg; // VSBuffer is handled by RPCProtocol
		if (typeof arg !== "object") return arg; // Primitives are fine

		try {
			// Handle vscode.Uri (from ../Shim/out/vscode)
			if (arg instanceof VscodeApiUri) {
				return {
					$mid: MarshalledId.UriSimple, // Or MarshalledId.Uri if full components always needed
					scheme: arg.scheme,
					authority: arg.authority,
					path: arg.path,
					query: arg.query,
					fragment: arg.fragment,
					// external: arg.toString(true), // Optional: useful for debugging on other side
					// fsPath: arg.scheme === Schemas.file ? arg.fsPath : undefined, // Optional
				};
			}
			if (arg instanceof VscodeApiPosition) {
				return { $mid: MarshalledId.Position, line: arg.line, character: arg.character };
			}
			if (arg instanceof VscodeApiRange) {
				return {
					$mid: MarshalledId.Range,
					start: this._convertApiArgToInternal(arg.start),
					end: this._convertApiArgToInternal(arg.end),
				};
			}
			if (arg instanceof VscodeApiSelection) {
				// Aligns with internal ISelection DTO for editor use
				return {
					$mid: MarshalledId.Selection, // Ensure this ID exists or use a custom one
					selectionStartLineNumber: arg.anchor.line + 1, // 1-based for protocol
					selectionStartColumn: arg.anchor.character + 1,
					positionLineNumber: arg.active.line + 1,
					positionColumn: arg.active.character + 1,
				};
			}
			if (arg instanceof VscodeApiLocation) {
				return {
					$mid: MarshalledId.Location,
					uri: this._convertApiArgToInternal(arg.uri),
					range: this._convertApiArgToInternal(arg.range),
				};
			}
			if (arg instanceof RegExp) {
				return { $mid: MarshalledId.Regexp, source: arg.source, flags: arg.flags };
			}
			// TODO: Add more explicit type conversions based on `extHostTypeConverters.ts` patterns
			// (e.g., MarkdownString, NotebookCellData) if they need specific DTOs.
		} catch (conversionError: any) {
			this._logError("Error in _convertApiArgToInternal (specific type conversion):", arg, conversionError);
			return arg; // Fallback to original on error during specific conversion
		}

		// If object has a toJSON method (and not an array, which also has toJSON), let it serialize itself.
		if (typeof (arg as any).toJSON === "function" && !Array.isArray(arg)) {
			try {
				return (arg as any).toJSON();
			} catch (e: any) {
				this._logWarn("Call to toJSON() failed on argument, proceeding with recursive conversion:", arg, e);
				// Fall through to recursive conversion if toJSON fails
			}
		}

		if (Array.isArray(arg)) {
			return arg.map((el) => this._convertApiArgToInternal(el));
		}

		// For plain objects, recurse through properties.
		if (typeof arg === 'object' && arg !== null && arg.constructor === Object) {
			const result: { [key: string]: any } = {};
			for (const key in arg) {
				if (Object.prototype.hasOwnProperty.call(arg, key)) {
					result[key] = this._convertApiArgToInternal((arg as any)[key]);
				}
			}
			return result;
		}

		// For unhandled complex objects, log a warning and return the original.
		// This might lead to serialization issues if the object isn't directly JSON-serializable.
		this._logWarnOnce(
			`Unhandled object type in _convertApiArgToInternal (constructor: ${arg.constructor?.name || typeof arg}). Returning original. This may cause issues if not JSON serializable or if MainThread expects a specific DTO.`,
			arg,
		);
		return arg;
	}

	/**
	 * Revives an argument received from RPC/IPC, potentially transforming DTOs with `$mid`
	 * markers back into VS Code class instances (e.g., Uri, Position) using VS Code's
	 * internal `vscodeRevive` function.
	 *
	 * If RPCProtocol has a URI transformer, URIs might already be revived. `vscodeRevive`
	 * handles other `$mid` objects.
	 *
	 * @template T The expected type of the revived argument.
	 * @param arg The argument received from RPC/IPC.
	 * @param context Optional context for `vscodeRevive` (rarely used by shims).
	 * @returns The revived argument, or the original argument if revival fails or is not applicable.
	 */
	protected _reviveApiArgument<T = any>(arg: any, context?: any): T {
		if (arg === undefined || arg === null) return arg as T;

		try {
            // `vscodeRevive` uses the global RPCProtocol's transformer if available for URIs,
            // and handles other $mid objects.
			return vscodeRevive(arg, context) as T;
		} catch (e: any) {
			this._logError("Failed to revive argument/result with vscodeRevive. Returning original argument.", arg, e);
			return arg as T; // Fallback to original on error
		}
	}

	// --- Event Handling Helpers ---

	/**
	 * Creates a standard Node.js `EventEmitter`.
	 * @returns A new `EventEmitter` instance.
	 */
	protected _createEventEmitter(): EventEmitter {
		return new EventEmitter();
		// emitter.setMaxListeners(20); // Consider if default of 10 is too low.
	}

	/**
	 * Creates a VS Code-style `VscodeEvent<T>` from a Node.js `EventEmitter`.
	 * @template T The type of the event payload.
	 * @param emitter The Node.js `EventEmitter` instance.
	 * @param eventName The name of the event on the `EventEmitter` to listen to.
	 * @returns A `VscodeEvent<T>` interface.
	 */
	protected _createEventFromEmitter<T>(emitter: EventEmitter, eventName: string): VscodeEvent<T> {
		const event: VscodeEvent<T> = (listener, thisArgs?, disposables?) => {
			if (typeof listener !== "function") {
				this._logError(`_createEventFromEmitter: listener is not a function for event '${eventName}'`, listener);
				return Disposable.None; // Return a NOP disposable
			}
			const handler = (...args: any[]) => listener.call(thisArgs, ...(args as [T]));
			emitter.on(eventName, handler);
			const disposable = toDisposable(() => emitter.removeListener(eventName, handler));

			if (Array.isArray(disposables)) {
				disposables.push(disposable);
			} else if (disposables instanceof DisposableStore) {
                disposables.add(disposable);
            }
			return disposable;
		};
		return event;
	}

	/**
	 * Creates a NOP (No Operation) `VscodeEvent<any>` that never fires and has an empty dispose.
	 * Useful for stubbing events that are not implemented.
	 * @returns A NOP `VscodeEvent<any>`.
	 */
	protected _createNopEventEmitter(): VscodeEvent<any> {
		if (VscodeEvent && typeof VscodeEvent.None === "function") {
			return VscodeEvent.None; // Use VS Code's official NOP event if available
		}
		this._logWarnOnce("VscodeEvent.None not available or failed, using NOP event stub.");
		return () => Disposable.None;
	}

	/**
	 * Disposes of resources held by this base shim instance, primarily the `_instanceDisposables` store.
	 * Subclasses should call `super.dispose()` if they override this method.
	 */
	public dispose(): void {
        this._instanceDisposables.dispose();
		this._log("Disposed.");
	}
}
--- END OF FILE _baseShim.ts ---