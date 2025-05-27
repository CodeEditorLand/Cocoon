/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim (_baseShim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a foundational abstract class, `BaseCocoonShim`, offering common utilities
 * for other Cocoon shims. These utilities facilitate standardized logging, RPC/IPC
 * communication with the Mountain host, argument marshalling/revival for inter-process
 * communication, and event handling.
 *
 * Its primary goal is to standardize common operations across shims, reduce boilerplate
 * code, and provide a consistent pattern for shim development within the Cocoon
 * extension host environment.
 *
 * Responsibilities:
 * - Providing standardized logging methods (`_log`, `_logDebug`, `_logInfo`, `_logWarn`, `_logError`)
 *   with consistent service-specific prefixing, falling back to `console` if a dedicated
 *   log service is not available.
 * - Offering helper methods for direct IPC communication with Mountain using
 *   `sendToMountainAndWait` and `sendNotificationToMountain` from `cocoon-ipc.ts`
 *   (`_ipcRequestResponse`, `_ipcNotify`).
 * - Abstracting access to the RPC proxy mechanism (`_getProxy`) for structured
 *   communication with MainThread services on Mountain.
 * - Implementing utility functions for:
 *   - Argument Marshalling (`_convertApiArgToInternal`): Preparing VS Code API objects
 *     (e.g., Uri, Position) for JSON serialization, potentially adding `$mid` markers
 *     recognized by VS Code's `revive` function. This is a simplified version for MVP;
 *
 *     a full implementation would require more extensive type converters.
 *   - Argument Revival (`_reviveApiArgument`): Using VS Code's internal `revive`
 *     function to transform DTOs received from Mountain back into VS Code class instances.
 * - Providing helpers for creating and managing event emitters, bridging Node.js
 *   `EventEmitter` with VS Code's `VscodeEvent` pattern.
 * - Defining common TypeScript interfaces for dependencies like logging
 *   (`ILogServiceForShim`) and RPC services (`IRpcProtocolServiceAdapter`).
 * - Offering an error refinement utility (`refineErrorForShim`) to parse structured
 *   error messages that might be sent as JSON strings from Mountain.
 * - Managing a `DisposableStore` (`_instanceDisposables`) for easy cleanup of
 *   resources held by shim instances.
 *
 * Key Interactions:
 * - Intended to be extended by most other service shims within Cocoon
 *   (e.g., `ShimExtHostWorkspace`, `ShimExtHostCommands`).
 * - Uses functions from `cocoon-ipc.ts` (`sendToMountainAndWait`, `sendNotificationToMountain`)
 *   for direct IPC calls.
 * - Interacts with an `IRpcProtocolServiceAdapter` instance (typically `RPCProtocol` from
 *   VS Code) to retrieve proxies for MainThread services.
 * - Relies on an `ILogServiceForShim` implementation (typically `ShimLogService`) for logging.
 * - Utilizes VS Code's marshalling utilities (`vs/base/common/marshalling.revive`,
 *
 *   `vs/base/common/marshallingIds.MarshalledId`).
 * - Utilizes VS Code's eventing types (`vs/base/common/event.Emitter`,
 *
 *   `vs/base/common/event.Event`, `vs/base/common/lifecycle.Disposable`).
 * - Uses VS Code API types (e.g., `VscodeApiUri`, `VscodeApiPosition`) from the local
 *   API shim (`../Shim/out/vscode.js`) for marshalling logic.
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter for internal eventing
import { EventEmitter } from "events";
// VS Code internal types
// For direct pass-through in marshalling
import { VSBuffer } from "vs/base/common/buffer";
import {
	// For managing disposables within shims
	DisposableStore,
	// For converting cleanup functions to IDisposable
	toDisposable,
	// For NOP event returns
	Disposable as VscodeDisposable,
	// Renamed to avoid confusion
	Emitter as VscodeEmitterForEventCreation,
	Event as VscodeEvent,
	type IDisposable,
} from "vs/base/common/lifecycle";
// Corrected path and added DisposableStore/toDisposable
import {
	// For identifying marshalled types (e.g., Uri, RegExp)
	MarshalledId,
	// VS Code's standard revival function for unmarshalling
	revive as vscodeRevive,
	// Not directly used in this file's public API
	// type MarshalledObject,
} from "vs/base/common/marshalling";
// For URI scheme constants used in marshalling examples or checks
import { Schemas } from "vs/base/common/network";

// Cocoon-specific IPC helpers for direct communication with Mountain
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
} from "../cocoon-ipc";
// Import vscode API types that this shim might handle for marshalling/revival.
// These should align with the types defined in `../Shim/out/vscode.js`.
import {
	Location as VscodeApiLocation,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
	// TODO: Import other vscode API types as needed by _convertApiArgToInternal
	// e.g., MarkdownString, NotebookCellData, etc.
} from "../Shim/out/vscode";

// Path to the generated/bundled vscode API type definitions

// --- Type Definitions ---

/**
 * Defines the logging interface expected by `BaseCocoonShim` and its derivatives.
 * This allows shims to use a consistent logging API, typically provided by `ShimLogService`.
 */
export interface ILogServiceForShim {
	trace(message: string, ...args: any[]): void;

	debug(message: string, ...args: any[]): void;

	info(message: string, ...args: any[]): void;

	warn(message: string, ...args: any[]): void;

	// Can take Error object directly
	error(message: string | Error, ...args: any[]): void;
}

/**
 * Represents an identifier for a service proxy used in RPC communication.
 * Based on `vs/workbench/services/extensions/common/proxyIdentifier.ts`.
 * @template ServiceType The type of the service being proxied.
 */
export interface ProxyIdentifier<ServiceType> {
	/** The string identifier of the service (e.g., "MainThreadCommands"). */
	readonly sid: string;

	/**
	 * A numeric identifier, historically used by some RPCProtocol versions.
	 * May not be actively used in all current VS Code RPC setups but is part of the type.
	 */
	readonly nid: number;
}

/**
 * Defines the interface for an RPC protocol service adapter, typically representing
 * VS Code's `RPCProtocol` instance. Shims use this to get proxies to MainThread services
 * and to register themselves as RPC targets.
 */
export interface IRpcProtocolServiceAdapter {
	/**
	 * Retrieves a proxy object for a service residing on the MainThread.
	 * The proxy will have the same methods as the service interface `ServiceType`.
	 * @template ServiceType The interface type of the MainThread service.
	 * @param identifier The `ProxyIdentifier` for the MainThread service.
	 * @returns A proxy object of type `ServiceType` that forwards calls to the MainThread.
	 */
	getProxy<ServiceType>(
		identifier: ProxyIdentifier<ServiceType>,

		// Result is typically Proxied<ServiceType>
	): ServiceType;

	/**
	 * Registers a local (ExtHost) service implementation with the RPC protocol,
	 *
	 * making its methods callable from the MainThread.
	 * @template ServiceInterface The interface type of the ExtHost service being registered.
	 * @template ServiceImplementation The concrete implementation type of the ExtHost service.
	 * @param identifier The `ProxyIdentifier` for this ExtHost service.
	 * @param value The instance of the service implementation.
	 * @returns The registered service implementation instance.
	 */
	set<ServiceInterface, ServiceImplementation extends ServiceInterface>(
		identifier: ProxyIdentifier<ServiceInterface>,

		value: ServiceImplementation,
	): ServiceImplementation;

	/**
	 * Optional method to transform URIs within an incoming RPC message payload if a
	 * URI transformer (like `ShimUriTransformerService`) is configured for the RPCProtocol.
	 * @template T The type of the object containing URIs.
	 * @param obj The object to transform.
	 * @returns The object with its URIs transformed.
	 */
	transformIncomingURIs?<T>(obj: T): T;

	/**
	 * Optional method to ensure all pending outgoing RPC messages are flushed and sent.
	 * @returns A promise that resolves when the drain is complete.
	 */
	drain?(): Promise<void>;
}

/**
 * Represents a structured error payload that might be received from Mountain,
 *
 * often when an error message from an IPC call is a JSON-serialized string.
 */
interface IStructuredErrorPayload {
	// The primary error message.
	message?: string;

	// The name of the error (e.g., "Error", "TypeError").
	name?: string;

	// Node.js style error code (e.g., "ENOENT") or custom numeric code.
	code?: string | number;

	// POSIX errno number, if applicable.
	errno?: number;

	// System call related to the error (e.g., "stat", "read"), if applicable.
	syscall?: string;
}

/**
 * Attempts to refine an error object. If the error's message is a JSON string
 * representing a structured error (matching `IStructuredErrorPayload`), this function
 * parses the JSON and constructs a new `Error` object. The new error incorporates
 * properties like `code`, `name`, `errno`, and `syscall` from the payload, and
 * attempts to preserve the original stack trace.
 *
 * If the message is not parseable JSON or does not conform to the expected structure,
 *
 * the original error is returned (or a new `Error` if the input was not an `Error` instance).
 *
 * @param originalError The error object or value to refine.
 * @param logService An optional logger for tracing parsing attempts or issues.
 * @param context An optional context string (e.g., operation name) for logging.
 * @returns A refined `Error` object (potentially `NodeJS.ErrnoException`-like if `code` is set),
 *
 *          or the original error if refinement is not applicable.
 */
export function refineErrorForShim(
	// Accept 'any' to handle cases where non-Error types are thrown/rejected
	originalError: any,

	logService?: ILogServiceForShim,

	context: string = "UnknownContext",
): Error {
	if (!(originalError instanceof Error) || !originalError.message) {
		// If it's not an Error instance or has no message, wrap it or return as is.
		return originalError instanceof Error
			? originalError
			: new Error(String(originalError));
	}

	let structuredErrorPayload: IStructuredErrorPayload | null = null;

	try {
		const trimmedMessage = originalError.message.trim();

		// Attempt to parse only if the message string looks like a JSON object or array.
		if (
			(trimmedMessage.startsWith("{") && trimmedMessage.endsWith("}")) ||
			(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
		) {
			structuredErrorPayload = JSON.parse(
				trimmedMessage,
			) as IStructuredErrorPayload;
		}
	} catch (parseError: any) {
		// This is often not an error in itself, just means the message wasn't JSON.
		logService?.trace(
			`[RefineError][${context}] Failed to parse error message as JSON (this is often normal, message was not JSON): OrigMsg='${originalError.message.substring(0, 100)}', ParseErr='${parseError.message || parseError}'`,
		);

		return originalError;
	}

	if (
		structuredErrorPayload &&
		typeof structuredErrorPayload === "object" &&
		!Array.isArray(structuredErrorPayload)
	) {
		// Successfully parsed a structured error object.
		const newMessage =
			// Prefer message from payload.
			structuredErrorPayload.message || originalError.message;

		// Cast for properties like 'code'.
		const refinedError = new Error(newMessage) as NodeJS.ErrnoException;

		if (structuredErrorPayload.name)
			refinedError.name = structuredErrorPayload.name;

		if (structuredErrorPayload.code !== undefined)
			refinedError.code = String(structuredErrorPayload.code);

		if (structuredErrorPayload.errno !== undefined)
			refinedError.errno = structuredErrorPayload.errno;

		if (structuredErrorPayload.syscall !== undefined)
			refinedError.syscall = structuredErrorPayload.syscall;

		// Attempt to preserve or augment the stack trace.
		refinedError.stack = originalError.stack
			? `${refinedError.name}: ${refinedError.message}\n(Original Stack from IPC/Error Source):\n${originalError.stack}`
			: `${refinedError.name}: ${refinedError.message}\n(Stack trace from original error unavailable or not applicable)`;

		logService?.trace(
			`[RefineError][${context}] Refined error from JSON payload. New Message: '${refinedError.message}', Code: ${refinedError.code ?? "N/A"}`,
		);

		return refinedError;
	}

	// If not a recognized structured error payload, return the original error.
	return originalError;
}

/**
 * Base class for Cocoon shims, providing common utilities for logging,
 *
 * RPC/IPC communication, argument marshalling/revival, and event handling.
 */
export class BaseCocoonShim implements IDisposable {
	// For DI compatibility with VS Code services
	public readonly _serviceBrand: undefined;

	readonly #serviceIdentifierString: string;

	readonly #rpcProtocolAdapter: IRpcProtocolServiceAdapter | undefined;

	readonly #logger: ILogServiceForShim | undefined;

	readonly #warnOnceMessageSet = new Set<string>();

	/** Manages disposables created by this shim instance or its subclasses. Disposed in `this.dispose()`. */
	protected readonly _instanceDisposables = new DisposableStore();

	/**
	 * Creates an instance of BaseCocoonShim.
	 * @param serviceIdentifier A string or symbol uniquely identifying the shim, used for logging prefixes.
	 * @param rpcServiceAdapter The RPC protocol adapter for communication with the MainThread, or `undefined` if not used by this shim.
	 * @param logService The logging service instance, or `undefined` to use `console` logging as a fallback.
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
				`[BaseShim][${this.#serviceIdentifierString}] ILogServiceForShim not provided! Logging will fall back to console methods.`,
			);
		}

		if (!this.#rpcProtocolAdapter && this._requiresRpc()) {
			const msg = `IRpcProtocolServiceAdapter not provided for ${this.#serviceIdentifierString}, but it is marked as required. RPC-dependent features will fail or be impaired.`;

			if (this.#logger) this.#logger.error(msg);
			else
				console.error(
					`[BaseShim][${this.#serviceIdentifierString}] ${msg}`,
				);
		}

		// Initial log message can be verbose for every shim. Use trace if desired.
		// this._log(`Initialized base.`);
	}

	/**
	 * Indicates if this shim fundamentally requires an RPC service adapter to function.
	 * Subclasses should override this and return `false` if RPC is optional or not used.
	 * @returns `true` if RPC is required, `false` otherwise. Default is `true`.
	 */
	protected _requiresRpc(): boolean {
		return true;
	}

	/** Provides access to the configured logger instance. */
	protected get _logService(): ILogServiceForShim | undefined {
		return this.#logger;
	}

	/** Provides access to the configured RPC service adapter instance. */
	protected get _rpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#rpcProtocolAdapter;
	}

	/** Gets the string identifier for this shim service, used in logging. */
	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifierString;
	}

	// --- Logging Helpers ---
	protected _log(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;

		if (this.#logger) this.#logger.trace(`${prefix} ${message}`, ...args);
		// console.trace includes stack
		else console.trace(`${prefix}[trace] ${message}`, ...args);
	}

	protected _logDebug(message: string, ...args: any[]): void {
		// New debug level helper
		const prefix = `[${this.#serviceIdentifierString}]`;

		if (this.#logger) this.#logger.debug(`${prefix} ${message}`, ...args);
		else console.debug(`${prefix}[debug] ${message}`, ...args);
	}

	protected _logInfo(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;

		if (this.#logger) this.#logger.info(`${prefix} ${message}`, ...args);
		else console.info(`${prefix}[info] ${message}`, ...args);
	}

	protected _logWarn(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;

		if (this.#logger) this.#logger.warn(`${prefix} ${message}`, ...args);
		else console.warn(`${prefix}[warn] ${message}`, ...args);
	}

	protected _logError(message: string | Error, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;

		if (this.#logger) {
			this.#logger.error(
				message instanceof Error ? message : `${prefix} ${message}`,

				...args,
			);
		} else {
			if (message instanceof Error)
				console.error(
					`${prefix}[error] ${message.message}`,

					message.stack,

					...args,
				);
			else console.error(`${prefix}[error] ${message}`, ...args);
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
	 * @template ServiceType The interface type of the MainThread service.
	 * @param identifier The `ProxyIdentifier` for the MainThread service.
	 * @returns The service proxy of type `ServiceType`, or `null` if the RPC adapter is unavailable or proxy creation fails.
	 */
	protected _getProxy<ServiceType>(
		identifier: ProxyIdentifier<ServiceType>,
	): ServiceType | null {
		const serviceSidForLog = identifier?.sid || String(identifier);

		if (!this.#rpcProtocolAdapter) {
			this._logError(
				`Cannot get RPC proxy for '${serviceSidForLog}': IRpcProtocolServiceAdapter is unavailable.`,
			);

			return null;
		}

		try {
			return this.#rpcProtocolAdapter.getProxy(identifier);
		} catch (e: any) {
			this._logError(
				`Failed to get RPC proxy for '${serviceSidForLog}':`,

				refineErrorForShim(
					e,

					this.#logger,

					`getProxy(${serviceSidForLog})`,
				),
			);

			return null;
		}
	}

	// --- Direct IPC Helpers (using functions from `cocoon-ipc.ts`) ---

	/**
	 * Sends a request to Mountain via direct IPC (Vine protocol) and awaits a response.
	 * @param mountainMethod The IPC method name to invoke on Mountain.
	 * @param params The parameters for the IPC call.
	 * @param timeoutMs The timeout for the request in milliseconds (default: 5000ms).
	 * @returns A promise that resolves with the result from Mountain.
	 * @throws An error (refined by `refineErrorForShim`) if the IPC call fails, times out, or Mountain returns an error.
	 */
	protected async _ipcRequestResponse(
		mountainMethod: string,

		params: any,

		timeoutMs = 5000,
	): Promise<any> {
		// Use _logDebug for less noise by default, or trace for very verbose.
		this._logDebug(
			`IPC Req: '${mountainMethod}', Params: ${JSON.stringify(params).substring(0, 80)}...`,
		);

		try {
			const result = await sendToMountainAndWait(
				mountainMethod,

				params,

				timeoutMs,
			);

			this._logDebug(`IPC Resp for '${mountainMethod}' received.`);

			return result;
		} catch (error: any) {
			const refined = refineErrorForShim(
				error,

				this.#logger,

				`ipcRequest(${mountainMethod})`,
			);

			this._logError(
				`IPC Request Error for method '${mountainMethod}': ${refined.message}`,

				refined.stack,
			);

			// Rethrow the refined error to the caller
			throw refined;
		}
	}

	/**
	 * Sends a notification to Mountain via direct IPC (Vine protocol, fire-and-forget).
	 * @param mountainMethod The IPC notification method name to invoke on Mountain.
	 * @param params The parameters for the notification.
	 */
	protected _ipcNotify(mountainMethod: string, params: any): void {
		const paramSummary = params
			? JSON.stringify(params).substring(0, 80) +
				(JSON.stringify(params).length > 80 ? "..." : "")
			: "(no params)";

		this._logDebug(
			`IPC Notify: '${mountainMethod}', Params: ${paramSummary}`,
		);

		try {
			sendNotificationToMountain(mountainMethod, params);
		} catch (error: any) {
			// Catches synchronous errors during payload construction, if any.
			this._logError(
				`Error preparing direct IPC notification '${mountainMethod}':`,

				error,
			);
		}
	}

	// --- Argument Marshalling/Revival Helpers ---

	/**
	 * Converts a VS Code API object (e.g., `VscodeApiUri`, `VscodeApiPosition`) into an internal
	 * representation or DTO (Data Transfer Object) suitable for JSON serialization and
	 * transmission over RPC/IPC. This may involve adding a `$mid` (MarshalledId) marker
	 * that VS Code's `vscodeRevive` function can use for unmarshalling on the receiving end.
	 *
	 * This method handles common VS Code types. For types not explicitly handled,
	 *
	 * it attempts to use their `toJSON()` method if present, or recurses through plain
	 * objects and arrays. Unhandled complex objects are returned as-is with a warning.
	 *
	 * @param arg The VS Code API argument to convert/marshal.
	 * @returns The marshalled representation of the argument.
	 */
	protected _convertApiArgToInternal(arg: any): any {
		if (arg === undefined || arg === null) return arg;

		// VSBuffer is specially handled by RPCProtocol's transformer or directly.
		if (arg instanceof VSBuffer) return arg;

		// Primitives (string, number, boolean) are fine as is.
		if (typeof arg !== "object") return arg;

		// Try explicit conversions for known VS Code API types
		try {
			if (arg instanceof VscodeApiUri) {
				// MarshalledId.UriSimple is often used for lighter DTOs.
				// MarshalledId.Uri implies full components for `URI.revive(dto)`.
				return {
					$mid: MarshalledId.UriSimple,

					scheme: arg.scheme,

					authority: arg.authority,

					path: arg.path,

					query: arg.query,

					fragment: arg.fragment,

					// Optional: external string representation for debugging or if receiver expects it.
					// external: arg.toString(true),

					// fsPath is implicitly part of path for file URIs, or can be added if needed.
					// fsPath: arg.scheme === Schemas.file ? arg.fsPath : undefined,
				};
			}

			if (arg instanceof VscodeApiPosition) {
				return {
					$mid: MarshalledId.Position,

					line: arg.line,

					character: arg.character,
				};
			}

			if (arg instanceof VscodeApiRange) {
				return {
					$mid: MarshalledId.Range,

					// Recursively convert nested Position
					start: this._convertApiArgToInternal(arg.start),

					// Recursively convert nested Position
					end: this._convertApiArgToInternal(arg.end),
				};
			}

			if (arg instanceof VscodeApiSelection) {
				// This DTO structure aligns with VS Code's internal `ISelection` for editor use.
				return {
					// Or a custom ID if this specific DTO is not standard in marshallingIds
					$mid: MarshalledId.Selection,

					// Protocol often uses 1-based for selection/position line/col
					selectionStartLineNumber: arg.anchor.line + 1,

					selectionStartColumn: arg.anchor.character + 1,

					positionLineNumber: arg.active.line + 1,

					positionColumn: arg.active.character + 1,
				};
			}

			if (arg instanceof VscodeApiLocation) {
				return {
					$mid: MarshalledId.Location,

					// Recursively convert nested Uri
					uri: this._convertApiArgToInternal(arg.uri),

					// Recursively convert nested Range
					range: this._convertApiArgToInternal(arg.range),
				};
			}

			if (arg instanceof RegExp) {
				// RegExp is a standard JS object but often needs specific marshalling
				return {
					$mid: MarshalledId.Regexp,

					source: arg.source,

					flags: arg.flags,
				};
			}

			// TODO: Add explicit converters for other common vscode API types if they need specific DTOs
			// (e.g., MarkdownString, NotebookCellData, various Event payloads) based on patterns
			// from `vs/workbench/api/common/extHostTypeConverters.ts`.
		} catch (conversionError: any) {
			this._logError(
				"Error during explicit type conversion in _convertApiArgToInternal:",

				"Argument:",

				arg,

				"Error:",

				conversionError,
			);

			// Fallback to original on error during specific conversion
			return arg;
		}

		// For objects with a toJSON method (and not arrays, which also have toJSON but are handled by map below)
		if (typeof (arg as any).toJSON === "function" && !Array.isArray(arg)) {
			try {
				// Let the object serialize itself
				return (arg as any).toJSON();
			} catch (e: any) {
				this._logWarn(
					"Call to custom toJSON() method failed on argument. Proceeding with recursive object/array conversion.",

					"Argument:",

					arg,

					"Error:",

					e,
				);

				// Fall through to recursive conversion if toJSON fails.
			}
		}

		if (Array.isArray(arg)) {
			// Handle arrays by recursively converting each element
			return arg.map((element) => this._convertApiArgToInternal(element));
		}

		// For plain JavaScript objects (POJOs), recurse through their properties.
		if (
			typeof arg === "object" &&
			arg !== null &&
			arg.constructor === Object
		) {
			const result: { [key: string]: any } = {};

			for (const key in arg) {
				if (Object.prototype.hasOwnProperty.call(arg, key)) {
					result[key] = this._convertApiArgToInternal(
						(arg as any)[key],
					);
				}
			}

			return result;
		}

		// If the object type is unhandled and not a POJO, log a warning and return the original.
		// This might lead to serialization issues if the object isn't directly JSON-serializable
		// or if the receiving end (Mountain) expects a specific DTO.
		this._logWarnOnce(
			`Unhandled complex object type in _convertApiArgToInternal (Constructor: ${arg.constructor?.name || typeof arg}). Returning original. This may cause issues if not directly JSON serializable or if MainThread expects a specific DTO structure. Consider adding an explicit converter.`,

			"Argument causing warning:",

			arg,
		);

		return arg;
	}

	/**
	 * Revives an argument received from RPC/IPC, potentially transforming Data Transfer Objects (DTOs)
	 * that have `$mid` (MarshalledId) markers back into instances of corresponding VS Code classes
	 * (e.g., `vscode.Uri`, `vscode.Position`). This process uses VS Code's internal `vscodeRevive` function.
	 *
	 * If the `RPCProtocol` instance has a URI transformer configured (like `ShimUriTransformerService`),
	 *
	 * URIs within the `arg` might have already been revived by the RPC layer before this method is called.
	 * `vscodeRevive` then handles other objects marked with `$mid`.
	 *
	 * @template ExpectedType The expected type of the revived argument.
	 * @param arg The argument received from RPC/IPC, potentially a DTO.
	 * @param context Optional context for `vscodeRevive` (rarely used directly by shims, usually handled by RPC layer).
	 * @returns The revived argument, ideally of `ExpectedType`. If revival fails or is not applicable,
	 *
	 *          the original argument is returned.
	 */
	protected _reviveApiArgument<ExpectedType = any>(
		arg: any,

		context?: any,
	): ExpectedType {
		// Return undefined/null as is
		if (arg === undefined || arg === null) return arg as ExpectedType;

		try {
			// `vscodeRevive` leverages the global RPCProtocol's transformer (if set via globalThis.__COC_RPC_PROTOCOL__)
			// for URI revival, and handles other $mid objects.
			return vscodeRevive(arg, context) as ExpectedType;
		} catch (e: any) {
			this._logError(
				"Failed to revive argument/result with vscodeRevive. Returning original argument as is.",

				"Argument:",

				arg,

				"Error:",

				e,
			);

			// Fallback to original on error
			return arg as ExpectedType;
		}
	}

	// --- Event Handling Helpers ---

	/**
	 * Creates a standard Node.js `EventEmitter` instance.
	 * Useful for shims that need to implement event emission conforming to Node.js patterns internally,
	 *
	 * which can then be adapted to `VscodeEvent<T>` for the public API.
	 * @returns A new `EventEmitter` instance.
	 */
	protected _createNodeEventEmitter(): EventEmitter {
		// Renamed for clarity
		const emitter = new EventEmitter();

		// Default is 10; increase if many listeners per emitter instance are expected.
		// emitter.setMaxListeners(20);

		return emitter;
	}

	/**
	 * Creates a VS Code-style `VscodeEvent<T>` from a Node.js `EventEmitter` instance.
	 * This adapter function allows shims to use Node's `EventEmitter` internally for managing
	 * events, while exposing a `VscodeEvent<T>` interface (which uses a listener function
	 * and returns an `IDisposable`) to consumers, aligning with VS Code's API patterns.
	 *
	 * @template T The type of the event payload.
	 * @param nodeEmitter The Node.js `EventEmitter` instance that will be the source of the events.
	 * @param eventName The name of the event on the `nodeEmitter` to listen to.
	 * @returns A `VscodeEvent<T>` interface.
	 */
	protected _createVscodeEventFromNodeEmitter<T>(
		nodeEmitter: EventEmitter,

		eventName: string,
	): VscodeEvent<T> {
		const eventAdapter: VscodeEvent<T> = (
			listener,

			thisArgs?,

			disposables?,
		) => {
			if (typeof listener !== "function") {
				this._logError(
					`_createVscodeEventFromNodeEmitter: Provided listener for event '${eventName}' is not a function. Listener was:`,

					listener,
				);

				// Return a No-Operation disposable
				return DisposableStore.None;
			}

			const handler = (...eventArgs: any[]) =>
				// Adapt Node emitter args to VscodeEvent listener
				listener.call(thisArgs, ...(eventArgs as [T]));

			nodeEmitter.on(eventName, handler);

			const disposableSubscription = toDisposable(() =>
				nodeEmitter.removeListener(eventName, handler),
			);

			if (Array.isArray(disposables)) {
				// Optional disposables collection (array)
				disposables.push(disposableSubscription);
			} else if (disposables instanceof DisposableStore) {
				// Optional disposables collection (DisposableStore)
				disposables.add(disposableSubscription);
			}

			return disposableSubscription;
		};

		return eventAdapter;
	}

	/**
	 * Creates a NOP (No Operation) `VscodeEvent<any>` that never fires and has an empty `dispose` method.
	 * This is useful for stubbing event properties in shims where the event functionality is not
	 * yet implemented or not applicable for Cocoon.
	 * @returns A NOP `VscodeEvent<any>`.
	 */
	protected _createNopVscodeEvent(): VscodeEvent<any> {
		// Renamed for clarity
		// `VscodeEvent.None` from `vs/base/common/event` is the preferred way to get a NOP event.
		if (
			VscodeEmitterForEventCreation &&
			typeof VscodeEmitterForEventCreation.None === "function"
		) {
			// Check against VscodeEvent directly from import
			return VscodeEvent.None;
		}

		// Fallback if VscodeEvent.None is not available for some reason (e.g., import issue)
		this._logWarnOnce(
			"VscodeEvent.None not available, using manual NOP event stub for _createNopVscodeEvent().",
		);

		// Returns a function that, when called, returns a NOP disposable.
		return () => VscodeDisposable.None;
	}

	/**
	 * Disposes of resources held by this base shim instance, primarily by disposing
	 * the `_instanceDisposables` store. This store should contain all disposables
	 * added by the shim instance or its subclasses (e.g., event listeners, registered
	 * RPC handlers).
	 * Subclasses should call `super.dispose()` if they override this method to ensure
	 * base class cleanup occurs.
	 */
	public dispose(): void {
		if (!this._instanceDisposables.isDisposed) {
			// Check if already disposed
			this._instanceDisposables.dispose();
		}

		// Can be verbose for every shim, use trace if needed.
		// this._log("BaseCocoonShim disposed.");
	}
}
