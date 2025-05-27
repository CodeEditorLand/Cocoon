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
 *   - Argument Marshalling (`_convertApiArgToInternal`): Prepares common VS Code API
 *     objects (e.g., Uri, Position, Range, Selection, RegExp) for JSON serialization
 *     by converting them to their DTO forms (e.g., UriComponents, IPosition, IRange).
 *     Complex API objects (Hover, CompletionItem, WorkspaceEdit) are typically handled
 *     by dedicated converters in `cocoon-type-converters.ts` before being passed to RPC/IPC.
 *     This method handles basic recursion for plain objects/arrays.
 *   - Argument Revival (`_reviveApiArgument`): Uses VS Code's internal `revive`
 *     function (from `vs/base/common/marshalling`) to transform DTOs received from
 *     Mountain back into VS Code class instances (e.g., `vscode.Uri` from `UriComponents`).
 *     `vscodeRevive` leverages the `RPCProtocol`'s configured `IURITransformer` for URIs.
 * - Providing helpers for creating and managing event emitters, bridging Node.js
 *   `EventEmitter` with VS Code's `VscodeEvent` pattern.
 * - Defining common TypeScript interfaces for dependencies like logging
 *   (`ILogServiceForShim`) and RPC services (`IRpcProtocolServiceAdapter`).
 * - Offering an error refinement utility (`refineErrorForShim`) to parse structured
 *   error messages or objects that might be sent from Mountain or originate in Cocoon.
 * - Managing a `DisposableStore` (`_instanceDisposables`) for easy cleanup of
 *   resources held by shim instances.
 *
 * Key Interactions:
 * - Intended to be extended by most other service shims within Cocoon.
 * - Uses functions from `cocoon-ipc.ts` for direct IPC calls.
 * - Interacts with an `IRpcProtocolServiceAdapter` instance (typically `RPCProtocol`)
 *   to retrieve proxies for MainThread services.
 * - Relies on an `ILogServiceForShim` implementation (typically `ShimLogService`) for logging.
 * - Utilizes VS Code's marshalling utilities (`vs/base/common/marshalling.revive`,
 *   `vs/base/common/marshallingIds.MarshalledId`).
 * - Utilizes VS Code's eventing types (`vs/base/common/event.Emitter`, `vs/base/common/event.Event`,
 *   `vs/base/common/lifecycle.Disposable`).
 * - Handles basic VS Code API types from the local API shim (`../Shim/out/vscode.js`)
 *   for its marshalling logic (e.g., `VscodeApiUri`, `VscodeApiPosition`).
 *
 *--------------------------------------------------------------------------------------------*/

// Node.js EventEmitter for internal eventing
import { EventEmitter } from "events";
// VS Code internal types
// For direct pass-through in marshalling
import { VSBuffer } from "vs/base/common/buffer";
import {
	DisposableStore,
	toDisposable,
	// For NOP event returns
	Disposable as VscodeDisposable,
	// Renamed to avoid confusion
	Emitter as VscodeEmitterForEventCreation,
	Event as VscodeEvent,
	type IDisposable,
} from "vs/base/common/lifecycle";
import {
	// For identifying marshalled types (e.g., Uri, RegExp)
	MarshalledId,
	// VS Code's standard revival function for unmarshalling
	revive as vscodeRevive,
} from "vs/base/common/marshalling";
// For URI scheme constants
import { Schemas } from "vs/base/common/network";
// Ensure these are the DTO shapes
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import {
	// DTO from editor common
	IPosition,
	// DTO from editor common
	IRange,
	// DTO from editor common
	ISelection,
} from "vs/editor/common/core/selection";

// Cocoon-specific IPC helpers for direct communication with Mountain
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
} from "../cocoon-ipc";
// Import vscode API types that this shim might handle for marshalling/revival.
import {
	Location as VscodeApiLocation,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
} from "../Shim/out/vscode";

// --- Type Definitions ---

/**
 * Defines the logging interface expected by `BaseCocoonShim` and its derivatives.
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
 */
export interface ProxyIdentifier<ServiceType> {
	readonly sid: string;

	// May not be actively used but part of type
	readonly nid: number;
}

/**
 * Defines the interface for an RPC protocol service adapter, typically `RPCProtocol`.
 */
export interface IRpcProtocolServiceAdapter {
	getProxy<ServiceType>(
		identifier: ProxyIdentifier<ServiceType>,

		// Result is typically Proxied<ServiceType>
	): ServiceType;

	set<ServiceInterface, ServiceImplementation extends ServiceInterface>(
		identifier: ProxyIdentifier<ServiceInterface>,

		value: ServiceImplementation,
	): ServiceImplementation;

	// Optional
	transformIncomingURIs?<T>(obj: T): T;

	// Optional
	drain?(): Promise<void>;
}

/**
 * Represents a structured error payload that might be received from Mountain or used internally.
 */
interface IStructuredErrorPayload {
	message?: string;

	name?: string;

	// Node.js style error code or custom
	code?: string | number;

	// POSIX errno
	errno?: number;

	// System call related to error
	syscall?: string;

	// Potentially other fields like `stack` if errors are fully serialized/deserialized.
}

/**
 * Attempts to refine an error object.
 * - If `originalError.message` is a JSON string representing `IStructuredErrorPayload`, it's parsed.
 * - If `originalError` itself is a plain object matching `IStructuredErrorPayload`, its properties are used.
 * A new `Error` object is constructed with these details, attempting to preserve the original stack.
 * If no refinement is possible, the original error is returned (or wrapped if not an `Error` instance).
 *
 * @param originalError The error object or value to refine.
 * @param logService Optional logger for tracing parsing attempts.
 * @param context Optional context string (e.g., operation name) for logging.
 * @returns A refined `Error` (potentially `NodeJS.ErrnoException`-like), or the original/wrapped error.
 */
export function refineErrorForShim(
	originalError: any,

	logService?: ILogServiceForShim,

	context: string = "UnknownContext",
): Error {
	let baseErrorInstance: Error;

	let potentialPayloadSource: any = null;

	let originalStack: string | undefined = undefined;

	if (originalError instanceof Error) {
		baseErrorInstance = originalError;

		originalStack = originalError.stack;

		if (typeof originalError.message === "string") {
			const trimmedMessage = originalError.message.trim();

			if (
				(trimmedMessage.startsWith("{") &&
					trimmedMessage.endsWith("}")) ||
				(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
			) {
				try {
					potentialPayloadSource = JSON.parse(trimmedMessage);
				} catch (parseError: any) {
					logService?.trace(
						`[RefineError][${context}] Failed to parse error.message as JSON (this is often normal): OrigMsg='${originalError.message.substring(0, 100)}', ParseErr='${parseError.message || parseError}'`,
					);

					// Message wasn't JSON, proceed to check if originalError itself is a payload
				}
			}
		}
	} else {
		// Not an Error instance, wrap it. Its string form might be a payload.
		baseErrorInstance = new Error(String(originalError));

		// Stack of the new Error
		originalStack = baseErrorInstance.stack;

		// If String(originalError) was a JSON string, it would have been caught above if it were an Error.
		// For non-Error types, check if originalError itself is a plain object payload.
		if (
			typeof originalError === "object" &&
			originalError !== null &&
			!Array.isArray(originalError)
		) {
			potentialPayloadSource = originalError;
		}
	}

	// If originalError itself is a plain object and no payload was parsed from message
	if (
		!potentialPayloadSource &&
		typeof originalError === "object" &&
		originalError !== null &&
		!(originalError instanceof Error) &&
		!Array.isArray(originalError)
	) {
		potentialPayloadSource = originalError;
	}

	if (
		potentialPayloadSource &&
		typeof potentialPayloadSource === "object" &&
		!Array.isArray(potentialPayloadSource)
	) {
		const payload = potentialPayloadSource as IStructuredErrorPayload;

		// Check for at least one known payload property to consider it structured
		if (
			payload.message !== undefined ||
			payload.name !== undefined ||
			payload.code !== undefined ||
			payload.errno !== undefined ||
			payload.syscall !== undefined
		) {
			// Prefer payload message
			const newMessage = payload.message || baseErrorInstance.message;

			const refinedError = new Error(newMessage) as NodeJS.ErrnoException;

			// Prefer payload name
			refinedError.name = payload.name || baseErrorInstance.name;

			if (payload.code !== undefined)
				refinedError.code = String(payload.code);

			if (payload.errno !== undefined) refinedError.errno = payload.errno;

			if (payload.syscall !== undefined)
				refinedError.syscall = payload.syscall;

			// Augment stack
			// If stack was part of the payload
			const payloadStack = (payload as any).stack;

			refinedError.stack =
				payloadStack ||
				originalStack ||
				`${refinedError.name}: ${refinedError.message}\n(Stack trace from original error source unavailable)`;

			if (
				payloadStack &&
				originalStack &&
				originalStack !== payloadStack
			) {
				refinedError.stack = `${refinedError.name}: ${refinedError.message}\n(Payload Stack):\n${payloadStack}\n(Original/Wrapper Stack):\n${originalStack}`;
			}

			logService?.trace(
				`[RefineError][${context}] Refined error from structured payload. NewMsg: '${refinedError.message}', Code: ${refinedError.code ?? "N/A"}`,
			);

			return refinedError;
		}
	}

	// If no refinement occurred, return the baseErrorInstance (which is originalError if it was an Error, or a wrapped version)
	return baseErrorInstance;
}

/**
 * Base class for Cocoon shims, providing common utilities.
 */
export class BaseCocoonShim implements IDisposable {
	// For DI compatibility
	public readonly _serviceBrand: undefined;

	readonly #serviceIdentifierString: string;

	readonly #rpcProtocolAdapter: IRpcProtocolServiceAdapter | undefined;

	readonly #logger: ILogServiceForShim | undefined;

	readonly #warnOnceMessageSet = new Set<string>();

	protected readonly _instanceDisposables = new DisposableStore();

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
	}

	/**
	 * Indicates if this shim fundamentally requires an RPC service adapter.
	 * Subclasses should override to `false` if RPC is optional/unused. Default is `true`.
	 */
	protected _requiresRpc(): boolean {
		return true;
	}

	protected get _logService(): ILogServiceForShim | undefined {
		return this.#logger;
	}

	protected get _rpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#rpcProtocolAdapter;
	}

	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifierString;
	}

	// --- Logging Helpers ---
	protected _log(message: string, ...args: any[]): void {
		const prefix = `[${this.#serviceIdentifierString}]`;

		if (this.#logger) this.#logger.trace(`${prefix} ${message}`, ...args);
		else console.trace(`${prefix}[trace] ${message}`, ...args);
	}

	protected _logDebug(message: string, ...args: any[]): void {
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

	// --- RPC Proxy Helper ---
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

	// --- Direct IPC Helpers ---
	protected async _ipcRequestResponse(
		mountainMethod: string,

		params: any,

		timeoutMs = 5000,
	): Promise<any> {
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

			throw refined;
		}
	}

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
			this._logError(
				`Error preparing direct IPC notification '${mountainMethod}':`,

				error,
			);
		}
	}

	// --- Argument Marshalling/Revival Helpers ---

	/**
	 * Converts common VS Code API objects (Uri, Position, Range, Selection, RegExp) to their
	 * DTO forms for JSON serialization. For other complex types, it performs basic recursion
	 * on plain objects/arrays or calls `toJSON()` if available.
	 * More complex API types (Hover, CompletionItem, etc.) should be handled by dedicated
	 * converters in `cocoon-type-converters.ts` *before* being passed to RPC/IPC.
	 *
	 * Note: URI transformation (local <-> remote) is handled by the `RPCProtocol`'s
	 * configured `IURITransformer` for DTOs marked with `$mid: MarshalledId.Uri`.
	 * This method focuses on structural conversion to DTOs.
	 *
	 * @param arg The VS Code API argument to convert/marshal.
	 * @returns The marshalled representation of the argument.
	 */
	protected _convertApiArgToInternal(arg: any): any {
		if (arg === undefined || arg === null) return arg;

		// Pass through directly
		if (arg instanceof VSBuffer) return arg;

		// Primitives
		if (typeof arg !== "object") return arg;

		// --- VscodeApiUri to UriComponents DTO ---
		// This ensures it's a plain object suitable for JSON and for `URI.revive()`
		// It does NOT apply remote transformations; that's RPCProtocol's job via IURITransformer.
		if (arg instanceof VscodeApiUri) {
			// Convert public API URI to internal VS Code URI
			const internalUri = VSCodeInternalURI.from(arg);

			// internalURI.toJSON() produces UriComponents
			return internalUri.toJSON();
		}

		// --- VscodeApiPosition to IPosition DTO ---
		if (arg instanceof VscodeApiPosition) {
			return {
				// API is 0-based, IPosition DTO is 1-based
				lineNumber: arg.line + 1,

				// API is 0-based, IPosition DTO is 1-based
				column: arg.character + 1,
			} as IPosition;
		}

		// --- VscodeApiRange to IRange DTO ---
		if (arg instanceof VscodeApiRange) {
			return {
				startLineNumber: arg.start.line + 1,

				startColumn: arg.start.character + 1,

				endLineNumber: arg.end.line + 1,

				endColumn: arg.end.character + 1,
			} as IRange;
		}

		// --- VscodeApiSelection to ISelection DTO ---
		if (arg instanceof VscodeApiSelection) {
			// ISelection DTO is 1-based for all line/column numbers
			return {
				selectionStartLineNumber: arg.anchor.line + 1,

				selectionStartColumn: arg.anchor.character + 1,

				positionLineNumber: arg.active.line + 1,

				positionColumn: arg.active.character + 1,

				// These are the primary fields for ISelection DTO.
				// Additional fields like `endLineNumber`, `endColumn` are part of the `Range` aspect
				// of `Selection` if MainThread needs the full range info beyond anchor/active.
				// VS Code's internal `Selection.from()` in extHostTypeConverter often just sends these four.
			} as ISelection;
		}

		// --- VscodeApiLocation (simple structural conversion, relies on Uri/Range conversion) ---
		if (arg instanceof VscodeApiLocation) {
			return {
				// Recursively convert
				// Will become UriComponents via VscodeApiUri case
				uri: this._convertApiArgToInternal(arg.uri),

				// Will become IRange DTO
				range: this._convertApiArgToInternal(arg.range),
			};
		}

		// --- RegExp to DTO ---
		if (arg instanceof RegExp) {
			return {
				$mid: MarshalledId.Regexp,

				source: arg.source,

				flags: arg.flags,
			};
		}

		// --- Custom toJSON() ---
		if (typeof (arg as any).toJSON === "function" && !Array.isArray(arg)) {
			try {
				return (arg as any).toJSON();
			} catch (e: any) {
				this._logWarn(
					`Call to custom toJSON() failed on argument (Proceeding with recursive conversion):`,

					arg,

					"Error:",

					e,
				);
			}
		}

		// --- Arrays and Plain Objects (Recursive) ---
		if (Array.isArray(arg)) {
			return arg.map((element) => this._convertApiArgToInternal(element));
		}

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

		// --- Unhandled Complex Types ---
		// For types like Hover, CompletionItem, WorkspaceEdit, etc., shims should use
		// dedicated converters from `cocoon-type-converters.ts` *before* calling RPC/IPC methods.
		// If such an object reaches here, it means it wasn't pre-converted.
		this._logWarnOnce(
			`Unhandled complex object type in _convertApiArgToInternal (Constructor: ${arg.constructor?.name || typeof arg}). Returning original. This may cause RPC/IPC serialization issues or type mismatches on MainThread if not a plain DTO. Consider using a dedicated type converter.`,

			"Argument causing warning:",

			arg,
		);

		return arg;
	}

	/**
	 * Revives an argument received from RPC/IPC, using VS Code's internal `vscodeRevive`.
	 * `vscodeRevive` handles DTOs with `$mid` markers (like `UriComponents` or `RegExp` DTOs
	 * produced by `_convertApiArgToInternal`) and uses the `RPCProtocol`'s configured
	 * `IURITransformer` (if `globalThis.__COC_RPC_PROTOCOL__` is set) for URI revival.
	 * For other complex DTOs without standard `$mid`s that need revival into specific API
	 * classes, dedicated converters in `cocoon-type-converters.ts` should be used by shims.
	 *
	 * @template ExpectedType The expected type of the revived argument.
	 * @param arg The argument received from RPC/IPC, potentially a DTO.
	 * @param context Optional context for `vscodeRevive` (rarely used by shims).
	 * @returns The revived argument. If revival fails or is not applicable, the original argument is returned.
	 */
	protected _reviveApiArgument<ExpectedType = any>(
		arg: any,

		context?: any,
	): ExpectedType {
		if (arg === undefined || arg === null) return arg as ExpectedType;

		try {
			// `vscodeRevive` leverages `__COC_RPC_PROTOCOL__` for URI transformation.
			// It reconstructs instances for known $mid values (Uri, RegExp).
			// For other DTOs (e.g., IPosition to vscode.Position), specific `toApiType` converters are needed.
			return vscodeRevive(arg, context) as ExpectedType;
		} catch (e: any) {
			this._logError(
				"Failed to revive argument/result with vscodeRevive. Returning original argument.",

				"Argument:",

				arg,

				"Error:",

				e,
			);

			return arg as ExpectedType;
		}
	}

	// --- Event Handling Helpers ---
	protected _createNodeEventEmitter(): EventEmitter {
		const emitter = new EventEmitter();

		// Default is 10
		// emitter.setMaxListeners(20);

		return emitter;
	}

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
					`_createVscodeEventFromNodeEmitter: Listener for event '${eventName}' is not a function. Listener:`,

					listener,
				);

				return VscodeDisposable.None;
			}

			const handler = (...eventArgs: any[]) =>
				listener.call(thisArgs, ...(eventArgs as [T]));

			nodeEmitter.on(eventName, handler);

			const disposableSubscription = toDisposable(() =>
				nodeEmitter.removeListener(eventName, handler),
			);

			if (Array.isArray(disposables))
				disposables.push(disposableSubscription);
			else if (disposables instanceof DisposableStore)
				disposables.add(disposableSubscription);

			return disposableSubscription;
		};

		return eventAdapter;
	}

	protected _createNopVscodeEvent(): VscodeEvent<any> {
		// VscodeEvent.None from `vs/base/common/event` is preferred.
		if (
			VscodeEmitterForEventCreation &&
			typeof (VscodeEvent as any).None === "function"
		) {
			// Check against VscodeEvent itself
			return VscodeEvent.None;
		}

		this._logWarnOnce(
			"VscodeEvent.None not available, using manual NOP event stub for _createNopVscodeEvent().",
		);

		return () => VscodeDisposable.None;
	}

	public dispose(): void {
		if (!this._instanceDisposables.isDisposed) {
			this._instanceDisposables.dispose();
		}
	}
}
