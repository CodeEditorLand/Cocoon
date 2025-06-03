/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim (_baseShim.ts)
 * --------------------------------------------------------------------------------------------
 * This file provides a foundational abstract class, `BaseCocoonShim`. This class offers
 * a suite of common utilities designed to be inherited and used by other Cocoon service
 * shims (e.g., `ShimExtHostCommands`, `ShimLanguageFeatures`). The primary goal of
 * `BaseCocoonShim` is to standardize common operations across all shims, reduce
 * boilerplate code, and establish a consistent pattern for developing shims within
 * the Cocoon extension host environment.
 *
 * Core Responsibilities and Provided Utilities:
 * - Standardized Logging:
 *   - Offers logging methods (`_logTrace`, `_logDebug`, `_logInfo`, `_logWarn`, `_logError`, `_logWarnOnce`)
 *     that automatically prefix log messages with the specific shim's identifier string.
 *   - These methods use an injected `ILogServiceForShim` instance if provided.
 *   - If a dedicated log service is not available, they gracefully fall back to using
 *     standard `console` methods (e.g., `console.debug`, `console.error`).
 *
 * - RPC/IPC Communication Helpers:
 *   - Provides helper methods (`_ipcRequestResponse`, `_ipcNotify`) for direct,
 *     low-level Inter-Process Communication (IPC) with the Mountain host process.
 *     These methods utilize `sendToMountainAndWait` and `sendNotificationToMountain`
 *     from `cocoon-ipc.ts`, which implement the Vine IPC protocol over stdio.
 *   - Includes a method (`_getProxy`) to abstract access to the RPC (Remote Procedure Call)
 *     proxy mechanism. This is used for structured, typed communication with MainThread
 *     services that are exposed by Mountain via VS Code's `RPCProtocol`.
 *
 * - Argument Marshalling and Revival for IPC/RPC:
 *   - `_convertApiArgToInternal(arg)`: Implements utility functions for marshalling common
 *     VS Code public API objects (e.g., `vscode.Uri`, `vscode.Position`, `vscode.Range`,
 *     `vscode.Selection`, `RegExp`, `vscode.MarkdownString`) into their Data Transfer
 *     Object (DTO) forms, making them suitable for JSON serialization and inter-process
 *     communication, often with `$mid` markers.
 *     - This method handles basic recursion for plain JavaScript objects and arrays.
 *     - For highly complex API objects (like `vscode.Hover`, `vscode.CompletionItem`,
 *       `vscode.WorkspaceEdit`), shims are expected to use dedicated, more comprehensive
 *       converters from `cocoon-type-converters.ts` *before* passing these objects to
 *       RPC or IPC methods. If such an object reaches `_convertApiArgToInternal` without
 *       prior conversion, a warning is logged.
 *   - `_reviveApiArgument<T>(arg, context?)`: Uses VS Code's internal `revive` function
 *     (from `vs/base/common/marshalling`) to transform DTOs received from Mountain
 *     back into instances of VS Code classes (e.g., `vscode.Uri` from `UriComponents`).
 *     - The `vscodeRevive` function automatically leverages the `IURITransformer` configured
 *       on the global `RPCProtocol` instance (if `globalThis.__COC_RPC_PROTOCOL__` is set by
 *       `index.ts`) for URI transformation (e.g., local paths to remote URIs or vice-versa).
 *
 * - Event Handling Utilities:
 *   - Provides helper methods (`_createNodeEventEmitter`, `_createVscodeEventFromNodeEmitter`,
 *     `_createNopVscodeEvent`) for creating and managing event emitters. This can help
 *   in bridging Node.js's `EventEmitter` pattern with VS Code's `VscodeEvent` pattern
 *   (from `vs/base/common/event`).
 *
 * - Common TypeScript Interfaces:
 *   - Defines common TypeScript interfaces for dependencies that shims typically require,
 *     such as `ILogServiceForShim` for logging and `IRpcProtocolServiceAdapter` for RPC.
 *
 * - Error Refinement:
 *   - Offers a static utility function (`refineErrorForShim`) to parse and refine
 *     structured error messages or error objects that might be sent from Mountain
 *     or originate within Cocoon. This helps in creating more informative `Error` instances.
 *
 * - Resource Management:
 *   - Manages a `DisposableStore` (`_instanceDisposables`) for each shim instance.
 *     Subclasses can add their `IDisposable` resources to this store, and they will
 *     be automatically disposed of when the shim's `dispose()` method is called.
 *
 * Key Interactions and Dependencies:
 * - This class is intended to be the base class (extended by) most other service shims
 *   implemented within the Cocoon project.
 * - It directly uses functions exported from `../cocoon-ipc.ts` for low-level IPC calls.
 * - It interacts with an `IRpcProtocolServiceAdapter` instance (which is typically
 *   VS Code's `RPCProtocol`) to retrieve proxies for MainThread services running on Mountain.
 * - It relies on an `ILogServiceForShim` implementation (typically `ShimLogService` from
 *   `./shims/log-shim.ts`) for its logging capabilities.
 * - It utilizes VS Code's internal marshalling utilities, such as `vs/base/common/marshalling.revive`
 *   and `vs/base/common/marshallingIds.MarshalledId`.
 * - It uses VS Code's eventing types (`vs/base/common/event.Emitter`, `vs/base/common/event.Event`)
 *   and lifecycle management types (`vs/base/common/lifecycle.Disposable`, `DisposableStore`).
 * - For its argument marshalling logic, it handles basic VS Code public API types that are
 *   imported from Cocoon's API shim (`../Shim/out/vscode.js`), such as
 *   `VscodeApiUri`, `VscodeApiPosition`, etc.
 *
 * Last Reviewed/Updated: 2025-06-03 (Placeholder, based on extraction timestamp)
 *--------------------------------------------------------------------------------------------*/

// --- Node.js Core Module Imports ---
import { EventEmitter } from "events";
// --- VS Code Base/Platform Module Imports ---
import { VSBuffer } from "vs/base/common/buffer";
import type { IMarkdownString as VSCodeInternalIMarkdownString } from "vs/base/common/htmlContent";
import {
	DisposableStore,
	toDisposable,
	Disposable as VscodeDisposableBase,
	Emitter as VscodeEmitterForEventCreation, // Explicit name
	Event as VscodeEvent,
	type IDisposable,
} from "vs/base/common/lifecycle";
import {
	MarshalledId,
	revive as vscodeRevive,
} from "vs/base/common/marshalling";
import { Schemas } from "vs/base/common/network"; // For URI scheme constants
import { type UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import {
	type IPosition as VSCodeInternalIPosition,
	type IRange as VSCodeInternalIRange,
	type ISelection as VSCodeInternalISelection,
} from "vs/editor/common/core/selection";

// --- Cocoon Specific IPC Helper Imports ---
import {
	sendNotificationToMountain,
	sendToMountainAndWait,
} from "../cocoon-ipc";
// --- VS Code Public API Type Imports (from Cocoon's API Shim) ---
import {
	Location as VscodeApiLocation,
	MarkdownString as VscodeApiMarkdownString,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
} from "../Shim/out/vscode";

// Adjusted path

// --- Type Definitions for Shim Dependencies and Payloads ---

export interface ILogServiceForShim {
	trace(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	error(message: string | Error, ...args: any[]): void;
}

export interface ProxyIdentifier<ServiceType> {
	readonly sid: string;
	readonly nid: number;
}

export interface IRpcProtocolServiceAdapter {
	getProxy<ServiceType>(
		identifier: ProxyIdentifier<ServiceType>,
	): ServiceType;
	set<ServiceInterface, ServiceImplementation extends ServiceInterface>(
		identifier: ProxyIdentifier<ServiceInterface>,
		serviceImplementationInstance: ServiceImplementation,
	): ServiceImplementation;
	transformIncomingURIs?<T>(objectWithUris: T): T;
	drain?(): Promise<void>;
}

interface IStructuredErrorPayload {
	message?: string;
	name?: string;
	code?: string | number;
	errno?: number;
	syscall?: string;
	stack?: string;
	$isError?: boolean;
}

export function refineErrorForShim(
	originalError: any,
	logServiceInstance?: ILogServiceForShim,
	operationContext: string = "UnknownOperationContext",
): Error {
	let baseErrorInstance: Error;
	let potentialPayloadSource: any = null;
	let originalErrorStack: string | undefined = undefined;

	if (originalError instanceof Error) {
		baseErrorInstance = originalError;
		originalErrorStack = originalError.stack;
		if (typeof originalError.message === "string") {
			const trimmedMessage = originalError.message.trim();
			if (
				(trimmedMessage.startsWith("{") &&
					trimmedMessage.endsWith("}")) ||
				(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
			) {
				try {
					potentialPayloadSource = JSON.parse(trimmedMessage);
				} catch (jsonParseError: any) {
					logServiceInstance?.trace(
						`[RefineError][${operationContext}] Failed to parse 'error.message' as JSON. Original Message (first 100 chars): '${originalError.message.substring(0, 100)}', JSON Parse Error: '${jsonParseError.message || jsonParseError}'`,
					);
				}
			}
		}
	} else {
		baseErrorInstance = new Error(String(originalError));
		originalErrorStack = baseErrorInstance.stack;
		if (
			typeof originalError === "object" &&
			originalError !== null &&
			!Array.isArray(originalError)
		) {
			potentialPayloadSource = originalError;
		}
	}

	if (
		!potentialPayloadSource &&
		typeof originalError === "object" &&
		originalError !== null
	) {
		const errorAsObject = originalError as any;
		if (
			errorAsObject.name ||
			errorAsObject.code ||
			errorAsObject.errno ||
			errorAsObject.syscall ||
			errorAsObject.$isError
		) {
			potentialPayloadSource = errorAsObject;
		}
	}

	if (
		potentialPayloadSource &&
		typeof potentialPayloadSource === "object" &&
		!Array.isArray(potentialPayloadSource)
	) {
		const payload = potentialPayloadSource as IStructuredErrorPayload;
		if (
			payload.message !== undefined ||
			payload.name !== undefined ||
			payload.code !== undefined ||
			payload.errno !== undefined ||
			payload.syscall !== undefined ||
			payload.$isError !== undefined
		) {
			const refinedErrorMessage =
				payload.message || baseErrorInstance.message;
			const refinedError = new Error(
				refinedErrorMessage,
			) as NodeJS.ErrnoException & { $isError?: boolean };
			refinedError.name = payload.name || baseErrorInstance.name;
			if (payload.code !== undefined)
				refinedError.code = String(payload.code);
			if (payload.errno !== undefined) refinedError.errno = payload.errno;
			if (payload.syscall !== undefined)
				refinedError.syscall = payload.syscall;
			if (payload.$isError !== undefined)
				refinedError.$isError = payload.$isError;

			const payloadStack = payload.stack;
			refinedError.stack =
				payloadStack ||
				originalErrorStack ||
				`${refinedError.name}: ${refinedError.message}\n(Stack trace from original error source was unavailable or not provided in payload)`;
			if (
				payloadStack &&
				originalErrorStack &&
				originalErrorStack !== payloadStack &&
				!originalErrorStack.includes(payloadStack)
			) {
				refinedError.stack =
					`${refinedError.name}: ${refinedError.message}\n` +
					`(Stack from Payload Source):\n${payloadStack}\n` +
					`(Original Error/Wrapper Stack):\n${originalErrorStack}`;
			}
			logServiceInstance?.trace(
				`[RefineError][${operationContext}] Successfully refined error from a structured payload. New Message: '${refinedError.message}', Code: ${refinedError.code ?? "N/A"}`,
			);
			return refinedError;
		}
	}
	return baseErrorInstance;
}

export abstract class BaseCocoonShim implements IDisposable {
	public readonly _serviceBrand: undefined;
	readonly #serviceIdentifierString: string;
	readonly #rpcProtocolAdapterInstance:
		| IRpcProtocolServiceAdapter
		| undefined;
	#loggerInstance: ILogServiceForShim | undefined;
	readonly #warnOnceMessageSet = new Set<string>();
	protected readonly _instanceDisposables = new DisposableStore();

	constructor(
		serviceIdentifier: string | symbol,
		rpcServiceAdapterInstance: IRpcProtocolServiceAdapter | undefined,
		logServiceInstance: ILogServiceForShim | undefined,
	) {
		this.#serviceIdentifierString = String(serviceIdentifier);
		this.#rpcProtocolAdapterInstance = rpcServiceAdapterInstance;
		this.#loggerInstance = logServiceInstance;

		if (!this.#loggerInstance) {
			console.warn(
				`[BaseCocoonShim][${this.#serviceIdentifierString}] Constructor: ILogServiceForShim was not provided. Logging will fall back to console.`,
			);
		}

		if (!this.#rpcProtocolAdapterInstance && this._requiresRpc()) {
			const errorMessage = `Constructor: IRpcProtocolServiceAdapter was not provided for shim '${this.#serviceIdentifierString}', but this shim is marked as RPC-dependent. RPC features will be impaired.`;
			if (this.#loggerInstance) {
				this.#loggerInstance.error(errorMessage);
			} else {
				console.error(
					`[BaseCocoonShim][${this.#serviceIdentifierString}] ${errorMessage}`,
				);
			}
		}
		this._logInfo(`Initialized.`); // Changed from _log to _logInfo for initial message
	}

	protected _requiresRpc(): boolean {
		return true;
	}

	protected get _logService(): ILogServiceForShim | undefined {
		return this.#loggerInstance;
	}

	protected get _rpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#rpcProtocolAdapterInstance;
	}

	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifierString;
	}

	protected _logTrace(message: string, ...args: any[]): void {
		this._logWithLevel("trace", message, ...args);
	}
	protected _logDebug(message: string, ...args: any[]): void {
		this._logWithLevel("debug", message, ...args);
	}
	protected _logInfo(message: string, ...args: any[]): void {
		this._logWithLevel("info", message, ...args);
	}
	protected _logWarn(message: string, ...args: any[]): void {
		this._logWithLevel("warn", message, ...args);
	}
	protected _logError(messageOrError: string | Error, ...args: any[]): void {
		this._logWithLevel("error", messageOrError, ...args);
	}

	private _logWithLevel(
		logLevel: keyof ILogServiceForShim | "error",
		messageOrError: string | Error,
		...additionalArguments: any[]
	): void {
		const logPrefix = `[${this.#serviceIdentifierString}]`;
		const effectiveMessageToLog =
			messageOrError instanceof Error
				? messageOrError
				: `${logPrefix} ${messageOrError}`;

		if (this.#loggerInstance) {
			if (logLevel === "error" && messageOrError instanceof Error) {
				this.#loggerInstance.error(
					messageOrError,
					...additionalArguments,
				);
			} else if (
				typeof (this.#loggerInstance as any)[logLevel] === "function"
			) {
				(this.#loggerInstance as any)[logLevel](
					effectiveMessageToLog,
					...additionalArguments,
				);
			} else {
				console.error(
					`${logPrefix}[FallbackLog][${logLevel}] ${messageOrError instanceof Error ? messageOrError.message : messageOrError}`,
					...additionalArguments,
					messageOrError instanceof Error ? messageOrError.stack : "",
				);
			}
		} else {
			const consoleMethodToUse =
				logLevel === "error"
					? console.error
					: logLevel === "warn"
						? console.warn
						: logLevel === "info"
							? console.info
							: console.debug; // 'trace' and 'debug' map to `console.debug`.

			consoleMethodToUse(
				`${logPrefix}[${logLevel.toUpperCase()}] ${messageOrError instanceof Error ? messageOrError.message : messageOrError}`,
				...additionalArguments,
				messageOrError instanceof Error ? messageOrError.stack : "",
			);
		}
	}

	protected _logWarnOnce(message: string, ...args: any[]): void {
		if (!this.#warnOnceMessageSet.has(message)) {
			this.#warnOnceMessageSet.add(message);
			this._logWarn(message, ...args);
		}
	}

	protected _getProxy<ServiceType>(
		proxyIdentifier: ProxyIdentifier<ServiceType>,
	): ServiceType | null {
		const serviceSidForLogging =
			proxyIdentifier?.sid || String(proxyIdentifier);
		if (!this.#rpcProtocolAdapterInstance) {
			this._logError(
				`Cannot get RPC proxy for service '${serviceSidForLogging}': The IRpcProtocolServiceAdapter is unavailable.`,
			);
			return null;
		}
		try {
			return this.#rpcProtocolAdapterInstance.getProxy(proxyIdentifier);
		} catch (error: any) {
			this._logError(
				`Failed to get RPC proxy for service '${serviceSidForLogging}':`,
				refineErrorForShim(
					error,
					this.#loggerInstance,
					`_getProxy(${serviceSidForLogging})`,
				),
			);
			return null;
		}
	}

	protected async _ipcRequestResponse(
		mountainMethodName: string,
		parameters: any,
		timeoutMilliseconds = 5000,
	): Promise<any> {
		this._logDebug(
			`Sending direct IPC Request to Mountain: Method='${mountainMethodName}', ParametersSummary='${JSON.stringify(parameters)?.substring(0, 100) ?? "(null/undefined)"}...'`,
		);
		try {
			const resultPayload = await sendToMountainAndWait(
				mountainMethodName,
				parameters,
				timeoutMilliseconds,
			);
			this._logService?.trace(
				`Direct IPC Response for Method='${mountainMethodName}' successfully received.`,
			);
			return resultPayload;
		} catch (ipcError: any) {
			const refinedIpcError = refineErrorForShim(
				ipcError,
				this.#loggerInstance,
				`_ipcRequestResponse(${mountainMethodName})`,
			);
			this._logError(
				`Direct IPC Request to Mountain (Method='${mountainMethodName}') failed: ${refinedIpcError.message}`,
				refinedIpcError.stack,
			);
			throw refinedIpcError;
		}
	}

	protected _ipcNotify(mountainMethodName: string, parameters: any): void {
		const parametersSummaryForLog = parameters
			? JSON.stringify(parameters).substring(0, 100) +
				(JSON.stringify(parameters).length > 100 ? "..." : "")
			: "(no parameters)";
		this._logDebug(
			`Sending direct IPC Notification to Mountain: Method='${mountainMethodName}', ParametersSummary='${parametersSummaryForLog}'`,
		);
		try {
			sendNotificationToMountain(mountainMethodName, parameters);
		} catch (errorPreparingNotification: any) {
			this._logError(
				`Error preparing or sending direct IPC notification '${mountainMethodName}' to Mountain:`,
				errorPreparingNotification,
			);
		}
	}

	protected _convertApiArgToInternal(argumentToMarshal: any): any {
		if (argumentToMarshal === undefined || argumentToMarshal === null)
			return argumentToMarshal;
		if (argumentToMarshal instanceof VSBuffer) return argumentToMarshal;
		if (typeof argumentToMarshal !== "object") return argumentToMarshal;

		try {
			if (argumentToMarshal instanceof VscodeApiUri) {
				return {
					$mid: MarshalledId.UriSimple,
					scheme: argumentToMarshal.scheme,
					authority: argumentToMarshal.authority,
					path: argumentToMarshal.path,
					query: argumentToMarshal.query,
					fragment: argumentToMarshal.fragment,
				} as VSCodeInternalUriComponents;
			}
			if (argumentToMarshal instanceof VscodeApiPosition) {
				// Using MarshalledId.Position from VS Code directly.
				// DTO for IPosition is { lineNumber: number, column: number } (1-based)
				// VscodeApiPosition is { line: number, character: number } (0-based)
				return {
					// $mid: MarshalledId.Position, // Not a standard $mid, use DTO structure
					lineNumber: argumentToMarshal.line + 1,
					column: argumentToMarshal.character + 1,
				} as VSCodeInternalIPosition;
			}
			if (argumentToMarshal instanceof VscodeApiRange) {
				// DTO for IRange is { startLineNumber, startColumn, endLineNumber, endColumn } (1-based)
				return {
					// $mid: MarshalledId.Range, // Not a standard $mid
					startLineNumber: argumentToMarshal.start.line + 1,
					startColumn: argumentToMarshal.start.character + 1,
					endLineNumber: argumentToMarshal.end.line + 1,
					endColumn: argumentToMarshal.end.character + 1,
				} as VSCodeInternalIRange;
			}
			if (argumentToMarshal instanceof VscodeApiSelection) {
				// DTO for ISelection has selectionStart/position (1-based)
				return {
					// $mid: MarshalledId.Selection, // Not a standard $mid
					selectionStartLineNumber: argumentToMarshal.anchor.line + 1,
					selectionStartColumn:
						argumentToMarshal.anchor.character + 1,
					positionLineNumber: argumentToMarshal.active.line + 1,
					positionColumn: argumentToMarshal.active.character + 1,
				} as VSCodeInternalISelection;
			}
			if (argumentToMarshal instanceof VscodeApiLocation) {
				// DTO is { uri: UriComponents, range: IRange }
				return {
					// $mid: MarshalledId.Location, // Not a standard $mid
					uri: this._convertApiArgToInternal(argumentToMarshal.uri),
					range: this._convertApiArgToInternal(
						argumentToMarshal.range,
					),
				};
			}
			if (argumentToMarshal instanceof RegExp) {
				return {
					$mid: MarshalledId.Regexp,
					source: argumentToMarshal.source,
					flags: argumentToMarshal.flags,
				};
			}
			if (argumentToMarshal instanceof VscodeApiMarkdownString) {
				const markdownStringDto: VSCodeInternalIMarkdownString = {
					value: argumentToMarshal.value,
					isTrusted: argumentToMarshal.isTrusted,
					supportThemeIcons: argumentToMarshal.supportThemeIcons,
					supportHtml: argumentToMarshal.supportHtml,
					baseUri: argumentToMarshal.baseUri
						? (this._convertApiArgToInternal(
								argumentToMarshal.baseUri,
							) as VSCodeInternalUriComponents)
						: undefined,
				};
				return markdownStringDto;
			}
		} catch (conversionError: any) {
			this._logError(
				"Error in _convertApiArgToInternal (specific type conversion):",
				argumentToMarshal,
				conversionError,
			);
			return argumentToMarshal;
		}

		if (
			argumentToMarshal.$mid &&
			typeof argumentToMarshal.$mid === "number"
		) {
			return argumentToMarshal;
		}

		if (
			typeof (argumentToMarshal as any).toJSON === "function" &&
			!Array.isArray(argumentToMarshal)
		) {
			try {
				return (argumentToMarshal as any).toJSON();
			} catch (toJsonError: any) {
				this._logWarn(
					`Call to custom toJSON() method failed on argument. Type: ${argumentToMarshal.constructor?.name || typeof argumentToMarshal}, Error: ${toJsonError.message}`,
				);
			}
		}

		if (Array.isArray(argumentToMarshal)) {
			return argumentToMarshal.map((element) =>
				this._convertApiArgToInternal(element),
			);
		}

		if (
			typeof argumentToMarshal === "object" &&
			argumentToMarshal !== null &&
			argumentToMarshal.constructor === Object
		) {
			const marshalledPlainObject: { [key: string]: any } = {};
			for (const key in argumentToMarshal) {
				if (
					Object.prototype.hasOwnProperty.call(argumentToMarshal, key)
				) {
					marshalledPlainObject[key] = this._convertApiArgToInternal(
						(argumentToMarshal as any)[key],
					);
				}
			}
			return marshalledPlainObject;
		}

		this._logWarnOnce(
			`Unhandled complex object type encountered in _convertApiArgToInternal. Constructor: '${argumentToMarshal.constructor?.name || typeof argumentToMarshal}'. Returning original. Consider dedicated converter.`,
			String(argumentToMarshal).substring(0, 100),
		);
		return argumentToMarshal;
	}

	protected _reviveApiArgument<ExpectedType = any>(
		argumentToRevive: any,
		revivalContext?: any,
	): ExpectedType {
		if (argumentToRevive === undefined || argumentToRevive === null) {
			return argumentToRevive as ExpectedType;
		}

		try {
			const revivedObject = vscodeRevive(
				argumentToRevive,
				revivalContext,
			);

			if (
				revivedObject &&
				typeof revivedObject === "object" &&
				!VscodeApiUri.isUri(revivedObject) &&
				"scheme" in revivedObject &&
				"path" in revivedObject &&
				typeof ExpectedType === "function" &&
				(ExpectedType as any).name === "VscodeApiUri" // Heuristic check
			) {
				try {
					return VscodeApiUri.from(
						revivedObject as any,
					) as ExpectedType;
				} catch (uriConversionError) {
					this._logWarn(
						"Failed to convert revived URI components to VscodeApiUri instance post-vscodeRevive.",
						"Revived Components:",
						revivedObject,
						"Error:",
						uriConversionError,
					);
					return revivedObject as ExpectedType;
				}
			}
			return revivedObject as ExpectedType;
		} catch (revivalError: any) {
			this._logError(
				"Failed to revive argument/result using `vscodeRevive`. Returning original.",
				"Argument:",
				argumentToRevive,
				"Error:",
				revivalError,
			);
			return argumentToRevive as ExpectedType;
		}
	}

	protected _createNodeEventEmitter(): EventEmitter {
		const newEventEmitter = new EventEmitter();
		// newEventEmitter.setMaxListeners(20); // Optional: adjust if needed
		return newEventEmitter;
	}

	protected _createVscodeEventFromNodeEmitter<T>(
		nodeEventEmitter: EventEmitter,
		eventNameString: string,
	): VscodeEvent<T> {
		const vscodeEventAdapter: VscodeEvent<T> = (
			eventListener: (eventPayload: T) => any,
			listenerThisContext?: any,
			disposablesStore?: IDisposable[] | DisposableStore,
		) => {
			if (typeof eventListener !== "function") {
				this._logError(
					`_createVscodeEventFromNodeEmitter: Listener for event '${eventNameString}' is not a function.`,
					listenerValue,
				);
				return VscodeDisposableBase.None;
			}
			const eventHandlerWrapper = (...eventArguments: any[]) =>
				eventListener.call(
					listenerThisContext,
					...(eventArguments as [T]),
				);
			nodeEventEmitter.on(eventNameString, eventHandlerWrapper);
			const subscriptionDisposable = toDisposable(() =>
				nodeEventEmitter.removeListener(
					eventNameString,
					eventHandlerWrapper,
				),
			);

			if (Array.isArray(disposablesStore)) {
				disposablesStore.push(subscriptionDisposable);
			} else if (disposablesStore instanceof DisposableStore) {
				disposablesStore.add(subscriptionDisposable);
			}
			return subscriptionDisposable;
		};
		return vscodeEventAdapter;
	}

	protected _createNopVscodeEvent(): VscodeEvent<any> {
		if (
			typeof VscodeEvent.None === "function" ||
			(VscodeEvent as any).None
		) {
			return (VscodeEvent as any).None;
		}
		this._logWarnOnce(
			"VscodeEvent.None not available. Using manual NOP event stub for _createNopVscodeEvent().",
		);
		return () => VscodeDisposableBase.None;
	}

	public dispose(): void {
		if (!this._instanceDisposables.isDisposed) {
			this._instanceDisposables.dispose();
		}
		this.#loggerInstance = undefined; // Help GC
		this._logInfo("Disposed."); // Changed from _log to _logInfo
	}
}
