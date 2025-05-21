/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim (_baseShim.ts) // Header: Seems correct and matches original intent.
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
 * - Uses `cocoon-ipc.ts` for direct IPC helpers (previously cocoon-ipc.js).
 * - Uses VS Code's `marshalling.revive`, marshalling IDs, and `Event.None` (requires bundling).
 * - Assumes common VS Code API types (Uri, Position, etc.) are available.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "events";
// For NOP event emitter type safety; Needs event code bundled
import { IDisposable, Event as VscodeEvent } from "vs/base/common/event"; // Renamed to avoid conflict with DOM Event

// Core revival function; Needs marshalling code bundled
import { revive } from "vs/base/common/marshalling"; // Assuming this is a function: (data: any, context?: any) => any

// Assuming these are classes or interfaces

// Needs marshalling code bundled
import { MarshalledId } from "vs/base/common/marshallingIds"; // Assuming this is an enum or const object

// Import direct IPC functions (use sparingly, prefer RPC proxies)
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
	// TODO: Ensure this path is correct and these functions are appropriately typed in cocoon-ipc.ts.
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
	// TODO: Ensure these imports point to the correct vscode API type definitions or shim implementations.
	// The path "../Shim/out/vscode" is assumed.
} from "../Shim/out/vscode";

// Define interfaces for injected services based on usage
// TODO: These interfaces should ideally be imported from actual VS Code type definition files if available.
export interface ILogService {
	trace(message: string, ...args: any[]): void;

	info(message: string, ...args: any[]): void;

	warn(message: string, ...args: any[]): void;

	error(message: string | Error, ...args: any[]): void; // Allow Error type for message
	// Add other methods if used: debug, critical, flush, dispose, onDidChangeLogLevel, getLogLevel, setLevel
}

export interface ProxyIdentifier<T> {
	// T is the type of the service being proxied
	sid: string; // Service identifier string
	nid?: number; // Optional numeric id, common in VS Code ProxyIdentifier
}

export interface IExtHostRpcService {
	getProxy<T>(identifier: ProxyIdentifier<T>): T;

	set<T>(identifier: ProxyIdentifier<T>, instance: T): void;
}

// Interface for structured errors parsed from JSON
interface IStructuredError {
	message?: string;

	name?: string;

	code?: string | number;

	errno?: number; // POSIX error number
	syscall?: string;

	// stack?: string; // Not typically part of the message JSON, but could be
}

/**
 * Attempts to parse a structured error from an Error's message property.
 * If the message is valid JSON representing an error structure, creates a new Error
 * object with properties from the JSON. Otherwise, returns the original error.
 *
 * @param originalError The original error caught.
 * @param logService Optional logger.
 * @param context Optional context string for logging.
 * @returns The original error or a refined error object.
 */
export function refineError(
	originalError: Error,

	logService?: ILogService,

	context: string = "",
): Error {
	if (!(originalError instanceof Error) || !originalError.message) {
		return originalError;
	}

	let structuredErrorPayload: IStructuredError | null = null;

	try {
		const trimmedMessage = originalError.message.trim();

		if (
			(trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}")) ||
			(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]")) // Though array errors are less common as top-level
		) {
			structuredErrorPayload = JSON.parse(
				trimmedMessage,
			) as IStructuredError;
		}
	} catch (e: any) {
		logService?.trace(
			`[RefineError][${context}] Failed to parse error message as JSON:`,

			e.message || e, // Log error message
		);

		return originalError;
	}

	if (structuredErrorPayload && typeof structuredErrorPayload === "object") {
		const newMessage =
			structuredErrorPayload.message || originalError.message;

		const refinedError = new Error(newMessage);

		if (structuredErrorPayload.name)
			refinedError.name = structuredErrorPayload.name;

		if (structuredErrorPayload.code !== undefined)
			(refinedError as NodeJS.ErrnoException).code = String(
				structuredErrorPayload.code,
			);

		if (structuredErrorPayload.errno !== undefined)
			(refinedError as NodeJS.ErrnoException).errno =
				structuredErrorPayload.errno;

		if (structuredErrorPayload.syscall !== undefined)
			(refinedError as NodeJS.ErrnoException).syscall =
				structuredErrorPayload.syscall;

		// TODO: Consider copying other common error properties if Mountain sends them.

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
	public readonly _serviceBrand: undefined; // Required by VSCode DI/type system

	readonly #serviceIdentifier: string;

	readonly #rpcService: IExtHostRpcService | undefined;

	readonly #logService: ILogService | undefined;

	readonly #warnOnceMessages = new Set<string>();

	constructor(
		serviceIdentifier: string | symbol, // Usually a string
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
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
			const errorMsg = `RPCService (RPCProtocol instance) not provided for ${this.#serviceIdentifier}! Many features will fail.`;

			this._logError(errorMsg);
		}

		this._log(`Initialized.`);
	}

	protected get _logService(): ILogService | undefined {
		return this.#logService;
	}

	protected get _rpcService(): IExtHostRpcService | undefined {
		return this.#rpcService;
	}

	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifier;
	}

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

	protected _logError(message: string | Error, ...args: any[]): void {
		if (this.#logService) {
			this.#logService.error(message, ...args); // Pass message directly
		} else {
			if (message instanceof Error) {
				console.error(
					`[${this.#serviceIdentifier}][error] ${message.message}`,

					message.stack,

					...args,
				);
			} else {
				console.error(
					`[${this.#serviceIdentifier}][error] ${message}`,

					...args,
				);
			}
		}
	}

	protected _logWarnOnce(message: string, ...args: any[]): void {
		if (!this.#warnOnceMessages.has(message)) {
			this.#warnOnceMessages.add(message);

			this._logWarn(message, ...args);
		}
	}

	protected _getProxy<T>(mainContextId: ProxyIdentifier<T>): T | null {
		// The original JS used `String(mainContextId?.sid || mainContextId)`.
		// ProxyIdentifier<T> implies mainContextId is an object with `sid`.
		const idForLog =
			typeof mainContextId === "string"
				? mainContextId
				: mainContextId?.sid;

		if (!this.#rpcService) {
			this._logError(
				`Cannot get RPC proxy for ${String(idForLog)}: RPCService unavailable.`,
			);

			return null;
		}

		try {
			return this.#rpcService.getProxy(mainContextId);
		} catch (e: any) {
			this._logError(
				`Failed to get RPC proxy for ${String(idForLog)}:`,

				e,
			);

			return null;
		}
	}

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
			// error can be Error or other type if IPC layer throws non-Error
			const refined =
				error instanceof Error
					? refineError(
							error,

							this._logService,

							`ipcRequestResponse(${mountainMethod})`,
						)
					: new Error(String(error));

			this._logError(
				`Error in direct IPC request '${mountainMethod}':`,

				refined, // Log the refined/created error
			);

			throw refined; // Rethrow refined/created error
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

	protected _convertApiArgToInternal(arg: any): any {
		if (arg === undefined || arg === null) return arg;

		if (typeof arg !== "object") return arg;

		try {
			if (arg instanceof Uri) {
				return {
					$mid: MarshalledId.UriSimple, // TODO: Confirm if UriSimple is always appropriate or if full Uri marshalling is needed sometimes.
					scheme: arg.scheme,

					authority: arg.authority,

					path: arg.path,

					query: arg.query,

					fragment: arg.fragment,

					// external: arg.toString(true), fsPath: arg.fsPath // Consider if these are needed by main thread
				};
			}

			if (arg instanceof Position)
				return { line: arg.line, character: arg.character };

			if (arg instanceof Range)
				return {
					start: this._convertApiArgToInternal(arg.start),

					end: this._convertApiArgToInternal(arg.end),
				};

			if (arg instanceof Selection) {
				// This seems to be marshalling for ISelection (1-based)
				return {
					selectionStartLineNumber: arg.anchor.line + 1,

					selectionStartColumn: arg.anchor.character + 1,

					positionLineNumber: arg.active.line + 1,

					positionColumn: arg.active.character + 1,
				};
			}

			if (arg instanceof Location)
				return {
					uri: this._convertApiArgToInternal(arg.uri),

					range: this._convertApiArgToInternal(arg.range),
				};

			if (arg instanceof RegExp)
				return {
					$mid: MarshalledId.Regexp,

					source: arg.source,

					flags: arg.flags,
				};
		} catch (conversionError: any) {
			this._logError(
				"Failed during specific type conversion in _convertApiArgToInternal:",

				arg,

				conversionError,
			);

			return arg;
		}

		if (typeof (arg as any).toJSON === "function" && !Array.isArray(arg)) {
			try {
				return (arg as any).toJSON();
			} catch (e: any) {
				this._logWarn("Failed to call toJSON on argument:", arg, e);
			}
		}

		if (Array.isArray(arg)) {
			return arg.map((el) => this._convertApiArgToInternal(el));
		}

		if (arg.constructor === Object) {
			// Plain object
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

			arg.constructor ? arg.constructor.name : typeof arg,

			arg,
		);

		return arg;
	}

	protected _reviveApiArgument<T = any>(arg: any, context?: any): T {
		// Added optional context for revive
		if (arg === undefined || arg === null) return arg;

		try {
			return revive(arg, context); // Pass context if available/needed by revive
		} catch (e: any) {
			this._logError("Failed to revive argument/result:", arg, e);

			return arg;
		}
	}

	protected _createEventEmitter(): EventEmitter {
		const emitter = new EventEmitter();

		// emitter.setMaxListeners(20); // Default is 10, increase if many listeners are expected per emitter.
		return emitter;
	}

	protected _createEventFromEmitter<T>(
		emitter: EventEmitter,

		eventName: string = "fire",
	): VscodeEvent<T> {
		const event: VscodeEvent<T> = (listener, thisArgs, disposables?) => {
			// Make disposables optional
			// Ensure listener is a function
			if (typeof listener !== "function") {
				this._logError(
					"_createEventFromEmitter: listener is not a function",

					listener,
				);

				// Return a NOP disposable or throw, depending on strictness
				return { dispose: () => {} };
			}

			const handler = (...args: any[]) =>
				listener.call(thisArgs, ...(args as [T]));

			emitter.on(eventName, handler);

			const disposable: IDisposable = {
				dispose: () => emitter.removeListener(eventName, handler),
			};

			if (Array.isArray(disposables)) disposables.push(disposable);

			return disposable;
		};

		return event;
	}

	protected _createNopEventEmitter(): VscodeEvent<any> {
		try {
			// VscodeEvent.None is a function that returns a disposable.
			if (VscodeEvent && typeof VscodeEvent.None === "function") {
				return VscodeEvent.None;
			}
		} catch (e: any) {
			this._logWarnOnce(
				`Error accessing VscodeEvent.None, falling back to NOP stub. Error: ${e.message}`,
			);
		}

		this._logWarnOnce(
			"VscodeEvent.None not available or failed, using NOP stub.",
		);

		return () => ({ dispose: () => {} });
	}
}

// Exports are handled by `export class BaseCocoonShim` and `export function refineError`
