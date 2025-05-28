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
 *   - Offers logging methods (`_log`, `_logDebug`, `_logInfo`, `_logWarn`, `_logError`, `_logWarnOnce`)
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
 *     communication.
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
 *   imported from the local API shim (e.g., `../Shim/out/vscode.js` or the `vscode` module
 *   if resolved correctly), such as `VscodeApiUri`, `VscodeApiPosition`, etc.
 *--------------------------------------------------------------------------------------------*/

// --- Node.js Core Module Imports ---
import { EventEmitter } from "events"; // For creating internal event emitters if needed.

// --- VS Code Base/Platform Module Imports ---
// These are core utilities from VS Code, assumed to be available in Cocoon's environment.
import { VSBuffer } from "vs/base/common/buffer"; // For direct pass-through of binary data in marshalling.
import {
	DisposableStore, // Utility for managing a collection of IDisposable objects.
	toDisposable, // Utility function to create an IDisposable from a cleanup function.
	Disposable as VscodeDisposableBase, // Base Disposable class from VS Code (renamed to avoid conflict).
	Emitter as VscodeEmitterForEventCreation, // VS Code's typed Emitter class.
	Event as VscodeEvent, // VS Code's typed Event interface.
	type IDisposable, // Interface for objects that can be disposed of.
} from "vs/base/common/lifecycle";
import {
	MarshalledId, // Enum for identifying special marshalled types (e.g., Uri, RegExp).
	revive as vscodeRevive, // VS Code's standard revival function for unmarshalling DTOs.
} from "vs/base/common/marshalling";
import {
	// URI as VSCodeInternalURI, // No longer directly used here for VscodeApiUri conversion; direct property access is safer for shimmed Uri.
	type UriComponents as VSCodeInternalUriComponents, // DTO shape for URI components.
} from "vs/base/common/uri";
import type { IMarkdownString as VSCodeInternalIMarkdownString } from "vs/base/common/htmlContent"; // Internal DTO for MarkdownString.
import {
	type IPosition as VSCodeInternalIPosition, // DTO for position (1-based) from editor common.
	type IRange as VSCodeInternalIRange, // DTO for range (1-based) from editor common.
	type ISelection as VSCodeInternalISelection, // DTO for selection (1-based) from editor common.
} from "vs/editor/common/core/selection";

// --- Cocoon Specific IPC Helper Imports ---
// These functions are from `../cocoon-ipc.ts` and handle direct communication with Mountain.
import {
	sendNotificationToMountain, // For fire-and-forget IPC messages.
	sendToMountainAndWait, // For request-response IPC messages.
} from "../cocoon-ipc";

// --- VS Code Public API Type Imports ---
// These are types from the `vscode` namespace (e.g., `vscode.Uri`, `vscode.Position`).
// This shim assumes these types are available, typically resolved from Cocoon's own
// `vscode` API shim (`../Shim/out/vscode.js` or the `vscode` module if configured).
import {
	Location as VscodeApiLocation,
	MarkdownString as VscodeApiMarkdownString,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
} from "vscode"; // This path should resolve to Cocoon's shimmed `vscode` API.

// --- Type Definitions for Shim Dependencies and Payloads ---

/**
 * Defines the logging interface expected by `BaseCocoonShim` and its derivatives.
 * This allows shims to log messages with different severity levels.
 */
export interface ILogServiceForShim {
	trace(message: string, ...arguments: any[]): void;
	debug(message: string, ...arguments: any[]): void;
	info(message: string, ...arguments: any[]): void;
	warn(message: string, ...arguments: any[]): void;
	error(message: string | Error, ...arguments: any[]): void; // Can take an Error object directly for richer logging.
}

/**
 * Represents an identifier for a service proxy used in RPC communication.
 * This typically contains a service ID string.
 * @template ServiceType - The type of the service being proxied.
 */
export interface ProxyIdentifier<ServiceType> {
	readonly sid: string; // The string identifier of the service.
	readonly nid: number; // A numeric identifier, may not be actively used by all RPC systems but is part of VS Code's type.
}

/**
 * Defines the interface for an RPC protocol service adapter.
 * This is typically an instance of VS Code's `RPCProtocol` class, which handles
 * the marshalling, unmarshalling, and routing of RPC messages.
 */
export interface IRpcProtocolServiceAdapter {
	/**
	 * Gets a proxy object for a MainThread service.
	 * @param identifier - The `ProxyIdentifier` for the service.
	 * @returns A proxy object that implements the `ServiceType` interface. Calls on this proxy are sent via RPC.
	 */
	getProxy<ServiceType>(
		identifier: ProxyIdentifier<ServiceType>,
	): ServiceType; // Result is typically `Proxied<ServiceType>`.

	/**
	 * Sets (registers) an ExtHost service implementation with the RPC protocol.
	 * This makes the service callable from the MainThread.
	 * @param identifier - The `ProxyIdentifier` for the service interface.
	 * @param serviceImplementationInstance - The actual instance of the service implementation.
	 * @returns The registered service implementation instance.
	 */
	set<ServiceInterface, ServiceImplementation extends ServiceInterface>(
		identifier: ProxyIdentifier<ServiceInterface>,
		serviceImplementationInstance: ServiceImplementation,
	): ServiceImplementation;

	/** Optional method for transforming incoming URIs in RPC payloads. */
	transformIncomingURIs?<T>(objectWithUris: T): T;
	/** Optional method to wait for all pending messages to be sent. */
	drain?(): Promise<void>;
}

/**
 * Represents a structured error payload that might be received from Mountain (MainThread)
 * via IPC/RPC, or used internally within Cocoon for consistent error reporting.
 */
interface IStructuredErrorPayload {
	message?: string; // The primary error message.
	name?: string; // The name of the error (e.g., 'TypeError', 'CustomError').
	code?: string | number; // A Node.js style error code (string, e.g., 'ENOENT') or a custom numeric code.
	errno?: number; // POSIX error number, if applicable.
	syscall?: string; // The system call related to the error, if applicable (e.g., for file system errors).
	stack?: string; // An optional stack trace string.
	$isError?: boolean; // VS Code convention: a marker indicating this object is a serialized error.
}

/**
 * Attempts to refine an error object or value into a more structured `Error` instance.
 * This function is useful for processing errors received from IPC/RPC (which might be
 * plain objects or JSON strings) or for standardizing errors created within Cocoon.
 *
 * Behavior:
 * - If `originalError.message` is a JSON string representing an `IStructuredErrorPayload`,
 *   it parses this JSON and uses its properties to create a new `Error`.
 * - If `originalError` itself is a plain JavaScript object that matches the structure of
 *   `IStructuredErrorPayload` (or has common error properties like `code`, `name`),
 *   its properties are used.
 * - A new `Error` object is constructed using the refined message and properties.
 * - It attempts to preserve or augment the stack trace from the original error or payload.
 * - If no refinement is possible (e.g., `originalError` is a simple string or an `Error`
 *   instance without a structured message), the original error is returned (or wrapped in
 *   a new `Error` instance if it wasn't one already).
 *
 * @param originalError - The error object or value to be refined. Can be of any type.
 * @param logServiceInstance - An optional `ILogServiceForShim` instance for logging trace
 *                             information during the refinement process (e.g., JSON parse failures).
 * @param operationContext - An optional context string (e.g., the name of the operation
 *                           where the error occurred) to include in log messages.
 * @returns A refined `Error` object (potentially cast to `NodeJS.ErrnoException` if it has
 *          `code`, `errno`, `syscall` properties), or the original/wrapped error if no
 *          structured information was found.
 */
export function refineErrorForShim(
	originalError: any,
	logServiceInstance?: ILogServiceForShim,
	operationContext: string = "UnknownOperationContext",
): Error {
	let baseErrorInstance: Error; // Will hold either the original Error or a newly wrapped one.
	let potentialPayloadSource: any = null; // Source from which to extract structured error properties.
	let originalErrorStack: string | undefined = undefined; // To preserve the original stack trace.

	// --- Step 1: Ensure `baseErrorInstance` is an `Error` and capture original stack ---
	if (originalError instanceof Error) {
		baseErrorInstance = originalError;
		originalErrorStack = originalError.stack;
		// Check if the error message itself might be a JSON string containing a payload.
		if (typeof originalError.message === "string") {
			const trimmedMessage = originalError.message.trim();
			// Basic check for JSON structure (starts with { or [).
			if (
				(trimmedMessage.startsWith("{") &&
					trimmedMessage.endsWith("}")) ||
				(trimmedMessage.startsWith("[") && trimmedMessage.endsWith("]"))
			) {
				try {
					potentialPayloadSource = JSON.parse(trimmedMessage);
				} catch (jsonParseError: any) {
					// This is often normal if the message is just a plain string that happens to start with '{'.
					logServiceInstance?.trace(
						`[RefineError][${operationContext}] Failed to parse 'error.message' as JSON. ` +
							`This is often expected for plain error messages. Original Message (first 100 chars): ` +
							`'${originalError.message.substring(0, 100)}', JSON Parse Error: '${jsonParseError.message || jsonParseError}'`,
					);
				}
			}
		}
	} else {
		// If `originalError` is not an Error instance, wrap it in a new Error.
		baseErrorInstance = new Error(String(originalError));
		originalErrorStack = baseErrorInstance.stack; // Capture stack of the newly created wrapper Error.
		// If `originalError` was a plain object, it might be the payload itself.
		if (
			typeof originalError === "object" &&
			originalError !== null &&
			!Array.isArray(originalError)
		) {
			potentialPayloadSource = originalError;
		}
	}

	// --- Step 2: If no payload found in message, check if `originalError` object itself is the payload ---
	// This covers cases where an Error object might have additional non-standard properties that
	// form an error DTO, or if `originalError` was a plain object from the start.
	if (
		!potentialPayloadSource &&
		typeof originalError === "object" &&
		originalError !== null
	) {
		// Test if `originalError` (even if it's an Error instance) has properties indicative of a structured payload.
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

	// --- Step 3: If a potential payload source was identified, try to create a refined Error ---
	if (
		potentialPayloadSource &&
		typeof potentialPayloadSource === "object" &&
		!Array.isArray(potentialPayloadSource)
	) {
		const payload = potentialPayloadSource as IStructuredErrorPayload;
		// Check if the payload has at least one known structured error property.
		if (
			payload.message !== undefined ||
			payload.name !== undefined ||
			payload.code !== undefined ||
			payload.errno !== undefined ||
			payload.syscall !== undefined ||
			payload.$isError !== undefined
		) {
			// Use the message from the payload if available, otherwise fall back to the base error's message.
			const refinedErrorMessage =
				payload.message || baseErrorInstance.message;
			// Create a new Error instance for the refined error.
			const refinedError = new Error(
				refinedErrorMessage,
			) as NodeJS.ErrnoException & { $isError?: boolean };

			// Populate properties from the payload, falling back to base error if payload lacks them.
			refinedError.name = payload.name || baseErrorInstance.name;
			if (payload.code !== undefined)
				refinedError.code = String(payload.code);
			if (payload.errno !== undefined) refinedError.errno = payload.errno;
			if (payload.syscall !== undefined)
				refinedError.syscall = payload.syscall;
			if (payload.$isError !== undefined)
				refinedError.$isError = payload.$isError; // Preserve VS Code's $isError marker.

			// Construct the stack trace for the refined error.
			const payloadStack = payload.stack;
			// Prioritize payload stack, then original stack, then a default constructed one.
			refinedError.stack =
				payloadStack ||
				originalErrorStack ||
				`${refinedError.name}: ${refinedError.message}\n(Stack trace from original error source was unavailable or not provided in payload)`;
			// If both payload stack and original stack exist and are different (and original doesn't already include payload's),
			// concatenate them for maximum information, clearly labeling each part.
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
				`[RefineError][${operationContext}] Successfully refined error from a structured payload. ` +
					`New Message: '${refinedError.message}', Code: ${refinedError.code ?? "N/A"}`,
			);
			return refinedError; // Return the newly constructed, refined Error.
		}
	}

	// If no refinement occurred (no structured payload found or processed),
	// return the `baseErrorInstance`. This is either the `originalError` itself (if it was already an `Error`)
	// or a new `Error` wrapping the `String(originalError)` (if it was not an `Error`).
	return baseErrorInstance;
}

/**
 * `BaseCocoonShim` is an abstract base class designed to provide common utilities
 * and a standardized structure for other Cocoon service shims.
 */
export abstract class BaseCocoonShim implements IDisposable {
	// `_serviceBrand` is a property used by VS Code's Dependency Injection system
	// for nominal typing, helping to ensure that services are correctly identified.
	// It's typically `undefined` for ExtHost services.
	public readonly _serviceBrand: undefined;

	// A string identifier for the specific shim service (e.g., "ExtHostCommandsService").
	// Used primarily for prefixing log messages.
	readonly #serviceIdentifierString: string;

	// An adapter for the RPC protocol (typically an instance of `RPCProtocol`).
	// Used to get proxies for MainThread services and to register ExtHost services.
	readonly #rpcProtocolAdapterInstance:
		| IRpcProtocolServiceAdapter
		| undefined;

	// An instance of a logging service. Made mutable to allow clearing on dispose.
	#loggerInstance: ILogServiceForShim | undefined;

	// A Set to keep track of messages that have been logged with `_logWarnOnce`
	// to prevent them from being logged repeatedly.
	readonly #warnOnceMessageSet = new Set<string>();

	// A `DisposableStore` to manage all `IDisposable` resources created by this
	// shim instance (or its subclasses). These are automatically disposed of when
	// the shim's `dispose()` method is called.
	protected readonly _instanceDisposables = new DisposableStore();

	/**
	 * Constructor for `BaseCocoonShim`.
	 * @param serviceIdentifier - A string or symbol uniquely identifying the shim service (for logging).
	 * @param rpcServiceAdapterInstance - An optional instance of `IRpcProtocolServiceAdapter` (e.g., `RPCProtocol`)
	 *                                    for RPC communication.
	 * @param logServiceInstance - An optional instance of `ILogServiceForShim` for logging.
	 */
	constructor(
		serviceIdentifier: string | symbol,
		rpcServiceAdapterInstance: IRpcProtocolServiceAdapter | undefined,
		logServiceInstance: ILogServiceForShim | undefined,
	) {
		this.#serviceIdentifierString = String(serviceIdentifier);
		this.#rpcProtocolAdapterInstance = rpcServiceAdapterInstance;
		this.#loggerInstance = logServiceInstance;

		// Log a warning if no logger is provided, as logging will fall back to `console`.
		if (!this.#loggerInstance) {
			console.warn(
				`[BaseCocoonShim][${this.#serviceIdentifierString}] Constructor: ILogServiceForShim was not provided. ` +
					`Logging for this shim will fall back to standard console methods (console.debug, console.error, etc.).`,
			);
		}

		// Log an error if an RPC adapter is not provided but the shim (by default or override)
		// indicates that it requires RPC for its functionality.
		if (!this.#rpcProtocolAdapterInstance && this._requiresRpc()) {
			const errorMessage =
				`Constructor: IRpcProtocolServiceAdapter was not provided for shim '${this.#serviceIdentifierString}', ` +
				`but this shim is marked as RPC-dependent (requiresRpc() returns true). ` +
				`RPC-dependent features of this shim will fail or be severely impaired.`;
			// Use the logger if available, otherwise fallback to console.error.
			if (this.#loggerInstance) {
				this.#loggerInstance.error(errorMessage);
			} else {
				console.error(
					`[BaseCocoonShim][${this.#serviceIdentifierString}] ${errorMessage}`,
				);
			}
		}
	}

	/**
	 * Indicates whether this specific shim fundamentally requires an RPC service adapter
	 * to be available for its core functionality. Subclasses should override this method
	 * and return `false` if their primary operations do not depend on RPC communication
	 * (e.g., if they use direct IPC or are purely local).
	 * @returns `true` by default, meaning an RPC adapter is expected.
	 */
	protected _requiresRpc(): boolean {
		return true;
	}

	/** Provides access to the configured logging service instance for subclasses. */
	protected get _logService(): ILogServiceForShim | undefined {
		return this.#loggerInstance;
	}

	/** Provides access to the configured RPC service adapter instance for subclasses. */
	protected get _rpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#rpcProtocolAdapterInstance;
	}

	/** Returns the string identifier for this shim service. */
	protected get _serviceIdentifier(): string {
		return this.#serviceIdentifierString;
	}

	// --- Standardized Logging Helper Methods ---
	// These methods automatically prefix messages with the shim's identifier
	// and use the configured logger or fallback to `console`.

	/** Logs a trace message. */
	protected _logTrace(message: string, ...arguments: any[]): void {
		this._logWithLevel("trace", message, ...arguments);
	}
	/** Logs a debug message. */
	protected _logDebug(message: string, ...arguments: any[]): void {
		this._logWithLevel("debug", message, ...arguments);
	}
	/** Logs an informational message. */
	protected _logInfo(message: string, ...arguments: any[]): void {
		this._logWithLevel("info", message, ...arguments);
	}
	/** Logs a warning message. */
	protected _logWarn(message: string, ...arguments: any[]): void {
		this._logWithLevel("warn", message, ...arguments);
	}
	/** Logs an error message or Error object. */
	protected _logError(
		messageOrError: string | Error,
		...arguments: any[]
	): void {
		this._logWithLevel("error", messageOrError, ...arguments);
	}

	/** Internal helper to route log messages to the appropriate logger method or console. */
	private _logWithLevel(
		logLevel:
			| keyof ILogServiceForShim
			| "error" /* 'error' allows Error type for message */,
		messageOrError: string | Error,
		...additionalArguments: any[]
	): void {
		const logPrefix = `[${this.#serviceIdentifierString}]`;
		// If messageOrError is an Error instance, the logger's `error` method should handle it directly.
		// For other levels, or if messageOrError is a string for the 'error' level, prepend the prefix.
		const effectiveMessageToLog =
			messageOrError instanceof Error
				? messageOrError
				: `${logPrefix} ${messageOrError}`;

		if (this.#loggerInstance) {
			// If a logger instance is available, use its methods.
			if (logLevel === "error" && messageOrError instanceof Error) {
				// The ILogServiceForShim interface specifies that `error` can take an Error object.
				// The logger implementation is responsible for formatting it (e.g., including stack trace).
				// The prefix might be added by the logger itself for Error objects, or we could pass it as an arg.
				// For simplicity, let logger handle Error objects directly if it supports it.
				this.#loggerInstance.error(
					messageOrError,
					...additionalArguments,
				);
			} else if (
				typeof (this.#loggerInstance as any)[logLevel] === "function"
			) {
				// For other log levels or string error messages, call the corresponding method.
				(this.#loggerInstance as any)[logLevel](
					effectiveMessageToLog,
					...additionalArguments,
				);
			} else {
				// Fallback if a specific log level method is somehow missing on the logger
				// (should not happen if ILogServiceForShim is correctly implemented).
				console.error(
					`${logPrefix}[FallbackLog][${logLevel}] ${messageOrError instanceof Error ? messageOrError.message : messageOrError}`,
					...additionalArguments,
					messageOrError instanceof Error ? messageOrError.stack : "", // Include stack for Errors.
				);
			}
		} else {
			// Fallback to standard console methods if no logger instance is configured.
			// Map trace to debug for console, as console.trace includes a stack trace by default.
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
				messageOrError instanceof Error ? messageOrError.stack : "", // Include stack for Errors.
			);
		}
	}

	/**
	 * Logs a warning message, but only if the exact same message string has not
	 * already been logged by this instance using this method. This is useful for
	 * preventing repetitive warnings in logs.
	 * @param message - The warning message string.
	 * @param arguments - Additional arguments to log with the message.
	 */
	protected _logWarnOnce(message: string, ...arguments: any[]): void {
		if (!this.#warnOnceMessageSet.has(message)) {
			this.#warnOnceMessageSet.add(message);
			this._logWarn(message, ...arguments); // Call the standard _logWarn method.
		}
	}

	// --- RPC Proxy Helper Method ---
	/**
	 * Retrieves an RPC proxy object for a MainThread service identified by `proxyIdentifier`.
	 * @template ServiceType - The interface type of the MainThread service.
	 * @param proxyIdentifier - The `ProxyIdentifier` for the service.
	 * @returns A proxy object implementing `ServiceType`, or `null` if the RPC adapter
	 *          is unavailable or if proxy creation fails.
	 */
	protected _getProxy<ServiceType>(
		proxyIdentifier: ProxyIdentifier<ServiceType>,
	): ServiceType | null {
		const serviceSidForLogging =
			proxyIdentifier?.sid || String(proxyIdentifier); // Get SID for logging.
		// Check if the RPC adapter is available.
		if (!this.#rpcProtocolAdapterInstance) {
			this._logError(
				`Cannot get RPC proxy for service '${serviceSidForLogging}': The IRpcProtocolServiceAdapter is unavailable. ` +
					`Ensure it was provided to the BaseCocoonShim constructor.`,
			);
			return null;
		}
		try {
			// Attempt to get the proxy from the adapter.
			return this.#rpcProtocolAdapterInstance.getProxy(proxyIdentifier);
		} catch (error: any) {
			// Log and refine any error during proxy creation.
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

	// --- Direct IPC Helper Methods (using cocoon-ipc.ts) ---
	/**
	 * Sends a request to Mountain via direct IPC and asynchronously awaits its response.
	 * Uses `sendToMountainAndWait` from `cocoon-ipc.ts`.
	 * @param mountainMethodName - The name of the method to invoke on Mountain.
	 * @param parameters - The parameters for the method.
	 * @param timeoutMilliseconds - Optional timeout for awaiting the response (defaults to 5000ms).
	 * @returns A promise that resolves with the response from Mountain, or rejects on error/timeout.
	 */
	protected async _ipcRequestResponse(
		mountainMethodName: string,
		parameters: any,
		timeoutMilliseconds = 5000,
	): Promise<any> {
		// Log the outgoing IPC request (summary of parameters to avoid large logs).
		this._logDebug(
			`Sending direct IPC Request to Mountain: Method='${mountainMethodName}', ParametersSummary='${
				JSON.stringify(parameters)?.substring(0, 100) ??
				"(null/undefined)"
			}...'`,
		);
		try {
			// Call the underlying IPC function.
			const resultPayload = await sendToMountainAndWait(
				mountainMethodName,
				parameters,
				timeoutMilliseconds,
			);
			// Log successful receipt of response (at trace level to reduce noise for successful calls).
			this._logService?.trace(
				`Direct IPC Response for Method='${mountainMethodName}' successfully received from Mountain.`,
			);
			return resultPayload;
		} catch (ipcError: any) {
			// Refine and log the error.
			const refinedIpcError = refineErrorForShim(
				ipcError,
				this.#loggerInstance,
				`_ipcRequestResponse(${mountainMethodName})`,
			);
			this._logError(
				`Direct IPC Request to Mountain (Method='${mountainMethodName}') failed: ${refinedIpcError.message}`,
				refinedIpcError.stack,
			);
			throw refinedIpcError; // Rethrow the refined error.
		}
	}

	/**
	 * Sends a fire-and-forget notification to Mountain via direct IPC.
	 * Uses `sendNotificationToMountain` from `cocoon-ipc.ts`.
	 * @param mountainMethodName - The name of the notification method on Mountain.
	 * @param parameters - The parameters for the notification.
	 */
	protected _ipcNotify(mountainMethodName: string, parameters: any): void {
		// Log the outgoing IPC notification (summary of parameters).
		const parametersSummaryForLog = parameters
			? JSON.stringify(parameters).substring(0, 100) +
				(JSON.stringify(parameters).length > 100 ? "..." : "")
			: "(no parameters)";
		this._logDebug(
			`Sending direct IPC Notification to Mountain: Method='${mountainMethodName}', ParametersSummary='${parametersSummaryForLog}'`,
		);
		try {
			// Call the underlying IPC function.
			sendNotificationToMountain(mountainMethodName, parameters);
		} catch (errorPreparingNotification: any) {
			// Log errors that occur during the preparation or sending of the notification
			// (e.g., JSON stringification failure if params are complex and not pre-marshalled).
			this._logError(
				`Error preparing or sending direct IPC notification '${mountainMethodName}' to Mountain:`,
				errorPreparingNotification,
			);
		}
	}

	// --- Argument Marshalling and Revival Helper Methods ---

	/**
	 * Converts common VS Code public API objects (like `vscode.Uri`, `vscode.Position`, `vscode.Range`,
	 * `vscode.Selection`, `RegExp`, `vscode.MarkdownString`) into their corresponding Data Transfer
	 * Object (DTO) forms. This prepares them for JSON serialization and transmission over IPC/RPC.
	 *
	 * For more complex API types (e.g., `vscode.Hover`, `vscode.CompletionItem`, `vscode.WorkspaceEdit`),
	 * shims should ideally use dedicated, comprehensive converters from `cocoon-type-converters.ts`
	 * *before* these objects are passed to RPC or IPC methods that would use this generic marshaller.
	 * This method provides basic recursive conversion for plain JavaScript objects and arrays.
	 *
	 * Note on URI Transformation:
	 * This method focuses on structural conversion to DTOs (e.g., `vscode.Uri` to `UriComponents`).
	 * It does NOT perform URI transformation (e.g., local filesystem paths to remote URIs or vice-versa).
	 * URI transformation is typically handled by the `IURITransformer` configured on the `RPCProtocol`
	 * instance itself, which processes DTOs marked with `$mid: MarshalledId.Uri` during marshalling/revival.
	 *
	 * @param argumentToMarshal - The VS Code public API argument to convert/marshal.
	 * @returns The marshalled representation of the argument, suitable for JSON serialization.
	 */
	protected _convertApiArgToInternal(argumentToMarshal: any): any {
		// Handle undefined or null directly.
		if (argumentToMarshal === undefined || argumentToMarshal === null) {
			return argumentToMarshal;
		}

		// Pass VSBuffer through directly. RPCProtocol handles VSBuffer transmission.
		if (argumentToMarshal instanceof VSBuffer) {
			return argumentToMarshal;
		}

		// Pass through primitive types directly.
		if (typeof argumentToMarshal !== "object") {
			return argumentToMarshal;
		}

		// --- Specific VS Code API Type Conversions to DTOs ---

		// Convert `vscode.Uri` (public API type) to `UriComponents` DTO.
		// This uses direct property access, assuming `VscodeApiUri` is the shimmed API type.
		if (argumentToMarshal instanceof VscodeApiUri) {
			return {
				$mid: MarshalledId.UriSimple, // Or `MarshalledId.Uri` if full components like 'external' are needed by MainThread.
				scheme: argumentToMarshal.scheme,
				authority: argumentToMarshal.authority,
				path: argumentToMarshal.path,
				query: argumentToMarshal.query,
				fragment: argumentToMarshal.fragment,
				// `fsPath` and `external` can be added if the receiving end (Mountain) requires them
				// for certain schemes or operations. Standard `UriComponents` primarily includes the above.
			} as VSCodeInternalUriComponents;
		}

		// Convert `vscode.Position` (0-based) to `IPosition` DTO (1-based).
		if (argumentToMarshal instanceof VscodeApiPosition) {
			return {
				lineNumber: argumentToMarshal.line + 1, // API `line` is 0-based.
				column: argumentToMarshal.character + 1, // API `character` is 0-based.
			} as VSCodeInternalIPosition;
		}

		// Convert `vscode.Range` (0-based) to `IRange` DTO (1-based).
		if (argumentToMarshal instanceof VscodeApiRange) {
			return {
				startLineNumber: argumentToMarshal.start.line + 1,
				startColumn: argumentToMarshal.start.character + 1,
				endLineNumber: argumentToMarshal.end.line + 1,
				endColumn: argumentToMarshal.end.character + 1,
			} as VSCodeInternalIRange;
		}

		// Convert `vscode.Selection` (0-based anchor/active) to `ISelection` DTO (1-based).
		if (argumentToMarshal instanceof VscodeApiSelection) {
			return {
				selectionStartLineNumber: argumentToMarshal.anchor.line + 1,
				selectionStartColumn: argumentToMarshal.anchor.character + 1,
				positionLineNumber: argumentToMarshal.active.line + 1,
				positionColumn: argumentToMarshal.active.character + 1,
				// Note: `ISelection` DTO also includes `startLineNumber`, `startColumn`, `endLineNumber`, `endColumn`
				// for the visual range. These can be derived from `apiSelection.start` and `apiSelection.end`
				// if the MainThread strictly requires the full `ISelection` DTO structure beyond anchor/active.
				// VS Code's internal `Selection.from()` in `extHostTypeConverter` often just sends these four primary fields.
			} as VSCodeInternalISelection;
		}

		// Convert `vscode.Location` by recursively converting its `uri` and `range`.
		if (argumentToMarshal instanceof VscodeApiLocation) {
			return {
				uri: this._convertApiArgToInternal(argumentToMarshal.uri), // Will become `UriComponents` DTO.
				range: this._convertApiArgToInternal(argumentToMarshal.range), // Will become `IRange` DTO.
			};
		}

		// Convert `RegExp` to its DTO form (marked with `$mid`).
		if (argumentToMarshal instanceof RegExp) {
			return {
				$mid: MarshalledId.Regexp, // Marker for `vscodeRevive` to reconstruct `RegExp`.
				source: argumentToMarshal.source,
				flags: argumentToMarshal.flags,
			};
		}

		// Convert `vscode.MarkdownString` to `IMarkdownString` DTO.
		if (argumentToMarshal instanceof VscodeApiMarkdownString) {
			const markdownStringDto: VSCodeInternalIMarkdownString = {
				value: argumentToMarshal.value,
				isTrusted: argumentToMarshal.isTrusted, // `isTrusted` can be boolean or `MarkdownStringTrustedOptions`.
				supportThemeIcons: argumentToMarshal.supportThemeIcons,
				supportHtml: argumentToMarshal.supportHtml,
				// `baseUri` needs to be marshalled if it's a `VscodeApiUri` instance.
				baseUri: argumentToMarshal.baseUri
					? (this._convertApiArgToInternal(
							argumentToMarshal.baseUri,
						) as VSCodeInternalUriComponents)
					: undefined,
				// `uris` (if part of `vscode.MarkdownString` API and used) would also need recursive conversion.
				// uris: argumentToMarshal.uris ? this._convertApiArgToInternal(argumentToMarshal.uris) : undefined,
			};
			return markdownStringDto;
		}

		// --- Handling for Objects Already in DTO Form ---
		// If an object already has a `$mid` property (VS Code's marshalling ID),
		// assume it's a DTO that `vscodeRevive` can handle on the other side.
		// No further conversion is needed before sending it over RPC if using VS Code's `RPCProtocol`.
		// For direct IPC (`JSON.stringify`), this structure is also fine.
		if (
			argumentToMarshal.$mid &&
			typeof argumentToMarshal.$mid === "number"
		) {
			return argumentToMarshal;
		}

		// --- Custom `toJSON()` Method ---
		// If an object has a custom `toJSON()` method (and is not an Array, which is handled separately),
		// call it to get its serializable representation. This is a standard JavaScript pattern.
		if (
			typeof (argumentToMarshal as any).toJSON === "function" &&
			!Array.isArray(argumentToMarshal)
		) {
			try {
				return (argumentToMarshal as any).toJSON();
			} catch (toJsonError: any) {
				this._logWarn(
					`Call to custom toJSON() method failed on argument. Proceeding with recursive conversion for this object. ` +
						`Argument type: ${argumentToMarshal.constructor?.name || typeof argumentToMarshal}, Error: ${toJsonError.message}`,
					"Argument causing toJSON error:",
					argumentToMarshal, // Be cautious logging full object.
				);
				// If toJSON fails, fall through to general recursive conversion for plain objects.
			}
		}

		// --- Recursive Conversion for Arrays and Plain Objects ---
		if (Array.isArray(argumentToMarshal)) {
			// If it's an array, map over its elements and recursively convert each one.
			return argumentToMarshal.map((element) =>
				this._convertApiArgToInternal(element),
			);
		}

		// Check if it's a plain JavaScript object (i.e., `obj.constructor === Object`).
		if (
			typeof argumentToMarshal === "object" &&
			argumentToMarshal !== null &&
			argumentToMarshal.constructor === Object
		) {
			const marshalledPlainObject: { [key: string]: any } = {};
			// Iterate over its own properties and recursively convert each value.
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

		// --- Fallback for Unhandled Complex Types ---
		// If the argument is an instance of a complex class that wasn't handled by the specific
		// `instanceof` checks above (and isn't a plain object/array or a DTO with `$mid`),
		// it means it likely needs a dedicated converter in `cocoon-type-converters.ts`.
		// Such objects should ideally be pre-converted by the calling shim *before* being
		// passed to RPC/IPC methods that use this generic `_convertApiArgToInternal` marshaller.
		// If such an object reaches here, log a warning and return the original argument.
		// This might lead to serialization issues or type mismatches on the MainThread if the
		// object is not a plain DTO that `JSON.stringify` can handle robustly or if MainThread
		// expects a specific DTO structure.
		this._logWarnOnce(
			`Unhandled complex object type encountered in _convertApiArgToInternal. ` +
				`Constructor: '${argumentToMarshal.constructor?.name || typeof argumentToMarshal}'. ` +
				`Returning the original argument. This may cause RPC/IPC serialization issues or type mismatches ` +
				`on the MainThread if this object is not already a plain DTO or if MainThread expects a specific DTO structure. ` +
				`Consider implementing and using a dedicated type converter for this type in 'cocoon-type-converters.ts'.`,
			"Argument causing warning (first 100 chars if stringified):",
			String(argumentToMarshal).substring(0, 100), // Avoid logging large objects directly.
		);
		return argumentToMarshal; // Return original argument as a last resort.
	}

	/**
	 * Revives an argument received from RPC/IPC (which is potentially a DTO) into its
	 * corresponding VS Code class instance or rich object type. This method primarily
	 * delegates to VS Code's internal `vscodeRevive` function from `vs/base/common/marshalling`.
	 *
	 * How `vscodeRevive` Works:
	 * - It specifically looks for objects with a `$mid` (MarshalledId) property (e.g.,
	 *   `UriComponents` produced by `_convertApiArgToInternal` for `vscode.Uri`, or the
	 *   DTO for `RegExp`). It reconstructs class instances for these known `$mid` values.
	 * - For URIs, if a global `IURITransformer` is available (typically set on
	 *   `globalThis.__COC_RPC_PROTOCOL__` by `index.ts` when `RPCProtocol` is initialized),
	 *   `vscodeRevive` will use this transformer to potentially convert URIs between local
	 *   and remote representations.
	 *
	 * Limitations and Usage with Custom Converters:
	 * - `vscodeRevive` only handles a limited set of built-in DTOs marked with `$mid`.
	 * - For other complex DTOs that need to be revived into specific VS Code public API
	 *   class instances (e.g., an `IPosition` DTO into a `vscode.Position` instance, or
	 *   an `IMarkdownString` DTO into `vscode.MarkdownString`), shims should use dedicated
	 *   `toApiType` converters from `cocoon-type-converters.ts`. This `_reviveApiArgument`
	 *   method is primarily for the `$mid`-based revival and URI transformation.
	 *   Often, shims will call `_reviveApiArgument` first (for URI transformation if applicable)
	 *   and then pass the result to a more specific `toApiType` converter.
	 *
	 * @template ExpectedType - The TypeScript type expected for the revived argument.
	 * @param argumentToRevive - The argument received from RPC/IPC, potentially a DTO.
	 * @param revivalContext - Optional context object that might be used by `vscodeRevive`
	 *                         (though rarely used directly by shims).
	 * @returns The revived argument. If revival fails or is not applicable to the argument's
	 *          structure, the original argument is typically returned.
	 */
	protected _reviveApiArgument<ExpectedType = any>(
		argumentToRevive: any,
		revivalContext?: any,
	): ExpectedType {
		// Handle undefined or null directly.
		if (argumentToRevive === undefined || argumentToRevive === null) {
			return argumentToRevive as ExpectedType;
		}

		try {
			// Delegate to VS Code's standard `revive` function.
			// This function handles:
			// 1. Reconstruction of instances for DTOs with known `$mid` values (e.g., `MarshalledId.Uri`, `MarshalledId.Regexp`).
			// 2. URI transformation if `globalThis.__COC_RPC_PROTOCOL__` is set and has an `IURITransformer`.
			//    `vscodeRevive` internally checks for this global to access the transformer.
			const revivedObject = vscodeRevive(
				argumentToRevive,
				revivalContext,
			);

			// --- Post-Revival Heuristic for VscodeApiUri ---
			// `vscodeRevive` (when used with an RPCProtocol that has a transformer) should ideally return
			// live URI instances if the transformer is set up to do so (e.g., if `transformIncoming` on the
			// IURITransformer directly returns `vscode.Uri` instances for `UriComponents`).
			// However, if `vscodeRevive` only returns plain `UriComponents`-like objects (even after transformation),
			// and the `ExpectedType` is `VscodeApiUri`, we might need an explicit conversion here.
			// This check is a bit heuristic and depends on the exact behavior of the `IURITransformer` used by `RPCProtocol`.
			if (
				revivedObject && // If `revivedObject` is not null/undefined.
				typeof revivedObject === "object" && // And it's an object.
				!VscodeApiUri.isUri(revivedObject) && // And it's NOT already an instance of `VscodeApiUri`.
				"scheme" in revivedObject &&
				"path" in revivedObject && // And it looks like `UriComponents` (has scheme and path).
				// And the expected type (if known at compile time via generic) is VscodeApiUri.
				// This `ExpectedType.name` check is a runtime approximation and might not always be reliable
				// for generics, especially if `ExpectedType` is an interface or union.
				typeof ExpectedType === "function" &&
				(ExpectedType as any).name === "VscodeApiUri"
			) {
				// If all conditions match, attempt to create a `VscodeApiUri` from the `UriComponents`-like object.
				try {
					return VscodeApiUri.from(
						revivedObject as any,
					) as ExpectedType;
				} catch (uriConversionError) {
					// If conversion to `VscodeApiUri` fails, log a warning and return the `UriComponents`-like object.
					this._logWarn(
						"Failed to convert revived URI components to VscodeApiUri instance after `vscodeRevive`. " +
							"Returning the revived components object instead. This might cause type issues if a VscodeApiUri instance was strictly expected.",
						"Revived Components Object:",
						revivedObject,
						"URI Conversion Error:",
						uriConversionError,
					);
					return revivedObject as ExpectedType;
				}
			}
			// If no post-revival conversion to VscodeApiUri was needed or done, return the result from `vscodeRevive`.
			return revivedObject as ExpectedType;
		} catch (revivalError: any) {
			// Log errors during the revival process.
			this._logError(
				"Failed to revive argument/result using `vscodeRevive`. Returning the original argument. " +
					"This might lead to type mismatches if the consuming code expected a revived class instance.",
				"Argument that failed revival:",
				argumentToRevive,
				"Revival Error:",
				revivalError,
			);
			// Fallback to returning the original argument if revival fails.
			return argumentToRevive as ExpectedType;
		}
	}

	// --- Event Handling Helper Methods ---
	/**
	 * Creates a new Node.js `EventEmitter` instance.
	 * @returns A new `EventEmitter`.
	 */
	protected _createNodeEventEmitter(): EventEmitter {
		const newEventEmitter = new EventEmitter();
		// `emitter.setMaxListeners(N)` can be called here if a higher limit than the default (10) is needed.
		// Example: `newEventEmitter.setMaxListeners(20);`
		return newEventEmitter;
	}

	/**
	 * Creates a VS Code `VscodeEvent<T>` from a Node.js `EventEmitter` and a specific event name.
	 * This allows shims to expose events using VS Code's typed event pattern, while internally
	 * using a Node.js `EventEmitter` for emitting those events.
	 *
	 * @template T - The type of the event payload.
	 * @param nodeEventEmitter - The Node.js `EventEmitter` instance that will emit the raw events.
	 * @param eventNameString - The name of the event on the `nodeEventEmitter` to listen to.
	 * @returns A `VscodeEvent<T>` that can be subscribed to.
	 */
	protected _createVscodeEventFromNodeEmitter<T>(
		nodeEventEmitter: EventEmitter,
		eventNameString: string,
	): VscodeEvent<T> {
		// The `VscodeEvent<T>` interface is essentially a function that takes a listener
		// and returns an `IDisposable` for unsubscribing.
		const vscodeEventAdapter: VscodeEvent<T> = (
			eventListener: (eventPayload: T) => any, // The listener function provided by the subscriber.
			listenerThisContext?: any, // Optional `this` context for the listener.
			disposablesStore?: IDisposable[] | DisposableStore, // Optional store to add the subscription disposable to.
		) => {
			// Validate that the provided listener is actually a function.
			if (typeof eventListener !== "function") {
				this._logError(
					`_createVscodeEventFromNodeEmitter: Attempted to register a listener for event '${eventNameString}', ` +
						`but the provided listener was not a function. Listener:`,
					eventListener,
				);
				// Return a NOP disposable if the listener is invalid.
				return VscodeDisposableBase.None;
			}

			// Create a handler function that will call the original `eventListener`
			// with the correct `this` context and spread arguments.
			const eventHandlerWrapper = (...eventArguments: any[]) =>
				eventListener.call(
					listenerThisContext,
					...(eventArguments as [T]),
				); // Assumes event payload matches T.

			// Subscribe the handler to the specified event on the Node.js EventEmitter.
			nodeEventEmitter.on(eventNameString, eventHandlerWrapper);

			// Create an IDisposable that will remove the handler when disposed.
			const subscriptionDisposable = toDisposable(() =>
				nodeEventEmitter.removeListener(
					eventNameString,
					eventHandlerWrapper,
				),
			);

			// If a `disposables` store (array or `DisposableStore`) was provided, add the subscription
			// disposable to it for automatic cleanup when the store is disposed.
			if (Array.isArray(disposablesStore)) {
				disposablesStore.push(subscriptionDisposable);
			} else if (disposablesStore instanceof DisposableStore) {
				disposablesStore.add(subscriptionDisposable);
			}

			// Return the subscription disposable so the subscriber can manually unsubscribe if needed.
			return subscriptionDisposable;
		};
		return vscodeEventAdapter;
	}

	/**
	 * Creates a NOP (No-Operation) `VscodeEvent`. This is an event that, when subscribed to,
	 * immediately returns a NOP disposable and never fires. It's useful for shims that need
	 * to satisfy an API contract requiring an event property, but where the event is not
	 * actually implemented or applicable in the Cocoon environment.
	 * @returns A `VscodeEvent<any>` that does nothing.
	 */
	protected _createNopVscodeEvent(): VscodeEvent<any> {
		// `VscodeEvent.None` (from `vs/base/common/event`) is the preferred way to get a NOP event.
		// Check if it's available (it might be a function or a direct property depending on VS Code version/imports).
		if (
			typeof VscodeEvent.None === "function" ||
			(VscodeEvent as any).None
		) {
			return (VscodeEvent as any).None;
		}

		// Fallback if `VscodeEvent.None` is not found (should be rare if `vs/base/common/event` is correctly imported).
		this._logWarnOnce(
			"VscodeEvent.None was not available from 'vs/base/common/event'. " +
				"Using a manually created NOP event stub for _createNopVscodeEvent(). " +
				"This might indicate an issue with VS Code module imports or bundling.",
		);
		// Manually create a NOP event function.
		return () => VscodeDisposableBase.None;
	}

	/**
	 * Disposes of resources held by this `BaseCocoonShim` instance.
	 * This primarily disposes of all `IDisposable` objects that were added to
	 * the `_instanceDisposables` store by this class or its subclasses.
	 * It also clears the logger reference to help with garbage collection if the
	 * shim instance might be held onto by other parts of the system after disposal.
	 */
	public dispose(): void {
		if (!this._instanceDisposables.isDisposed) {
			this._instanceDisposables.dispose(); // Dispose all collected disposables.
		}
		// Clear the logger reference. This helps if the logger itself has a complex lifecycle
		// or if this shim instance might be retained in memory after disposal without
		// the logger also being needed.
		this.#loggerInstance = undefined;
	}
}
