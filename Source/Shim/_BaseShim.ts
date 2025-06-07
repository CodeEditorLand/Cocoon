/*
 * File: Cocoon/Source/Shim/_BaseShim.ts
 * Responsibility: Provides foundational utilities and abstract patterns for VS Code API shims in the Cocoon sidecar, enabling consistent logging, IPC communication, and resource management across extension host services.
 * Modified: 2025-06-07 00:57:34 UTC
 * Dependency: ../Ipc, events, vs/base/common/buffer, vs/base/common/htmlContent, vs/base/common/uri, vs/workbench/services/extensions/common/proxyIdentifier
 * Export: ILogServiceForShim, IRpcProtocolServiceAdapter, RefineErrorForShim
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Base Shim
 * --------------------------------------------------------------------------------------------
 * This file provides a foundational abstract class, `BaseCocoonShim`. This class offers
 * a suite of common utilities designed to be inherited and used by other Cocoon service
 * shims (e.g., `ShimExtHostCommands`, `ShimLanguageFeatures`). The primary goal of
 * `BaseCocoonShim` is to standardize common operations across all shims, reduce
 * boilerplate code, and establish a consistent pattern for developing shims within
 * the Cocoon extension host environment.
 *
 * This version was synthesized from multiple sources, combining the detailed implementation
 * of the first version with the naming conventions and updated dependency paths of the second.
 *
 * Core Responsibilities and Provided Utilities:
 * - Standardized Logging:
 *   - Offers logging methods (`_LogTrace`, `_LogDebug`, `_LogInfo`, `_LogWarn`, `_LogError`, `_LogWarnOnce`)
 *     that automatically prefix log messages with the specific shim's identifier string.
 *   - These methods use an injected `ILogServiceForShim` instance if provided, falling back
 *     gracefully to standard `console` methods.
 *
 * - RPC/IPC Communication Helpers:
 *   - Provides helper methods (`_IpcRequestResponse`, `_IpcNotify`) for direct,
 *     low-level Inter-Process Communication (IPC) with the Mountain host process.
 *     These methods utilize `SendRequest` and `SendNotification` from the IPC layer.
 *   - Includes a method (`_GetProxy`) to abstract access to the RPC (Remote Procedure Call)
 *     proxy mechanism for structured communication with MainThread services.
 *
 * - Argument Marshalling and Revival for IPC/RPC:
 *   - `_ConvertApiArgToInternal(Arg)`: Implements utility functions for marshalling common
 *     VS Code public API objects into their Data Transfer Object (DTO) forms.
 *     This method handles basic recursion for plain objects and arrays. For highly complex
 *     API objects, dedicated converters should be used.
 *   - `_ReviveApiArgument<T>(Arg)`: Uses VS Code's internal `revive` function
 *     to transform DTOs received from Mountain back into instances of VS Code classes.
 *
 * - Event Handling Utilities:
 *   - Provides helper methods (`_CreateNodeEventEmitter`, `_CreateVscodeEventFromNodeEmitter`,
 *     `_CreateNopVscodeEvent`) for creating and managing event emitters.
 *
 * - Common TypeScript Interfaces:
 *   - Defines common TypeScript interfaces for dependencies like `ILogServiceForShim` and `IRpcProtocolServiceAdapter`.
 *
 * - Error Refinement:
 *   - Offers a static utility function (`RefineErrorForShim`) to parse and refine
 *     structured error messages or objects into more informative `Error` instances.
 *
 * - Resource Management:
 *   - Manages a `DisposableStore` (`_InstanceDisposables`) to automatically dispose of
 *     resources when the shim's `Dispose()` method is called.
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
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
	type IDisposable,
} from "vs/base/common/lifecycle";
import {
	MarshalledId,
	revive as VscodeRevive,
} from "vs/base/common/marshalling";
import { type UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";
import {
	type IPosition as VSCodeInternalIPosition,
	type IRange as VSCodeInternalIRange,
	type ISelection as VSCodeInternalISelection,
} from "vs/editor/common/core/selection";
import { ProxyIdentifier } from "vs/workbench/services/extensions/common/proxyIdentifier";

// --- Cocoon Specific IPC Helper Imports ---
import { SendNotification, SendRequest } from "../Ipc";
// --- VS Code Public API Type Imports (from Cocoon's API Shim) ---
import {
	Location as VscodeApiLocation,
	MarkdownString as VscodeApiMarkdownString,
	Position as VscodeApiPosition,
	Range as VscodeApiRange,
	Selection as VscodeApiSelection,
	Uri as VscodeApiUri,
} from "./vscode";

// --- Type Definitions for Shim Dependencies and Payloads ---

export interface ILogServiceForShim {
	trace(Message: string, ...Args: any[]): void;
	debug(Message: string, ...Args: any[]): void;
	info(Message: string, ...Args: any[]): void;
	warn(Message: string, ...Args: any[]): void;
	error(Message: string | Error, ...Args: any[]): void;
}

export interface IRpcProtocolServiceAdapter {
	getProxy<T>(Identifier: ProxyIdentifier<T>): T;
	set<T, I extends T>(Identifier: ProxyIdentifier<T>, Instance: I): I;
	transformIncomingURIs?<T>(ObjectWithUris: T): T;
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

export function RefineErrorForShim(
	OriginalError: any,
	LogServiceInstance?: ILogServiceForShim,
	OperationContext: string = "UnknownOperationContext",
): Error {
	let BaseErrorInstance: Error;
	let PotentialPayloadSource: any = null;
	let OriginalErrorStack: string | undefined = undefined;

	if (OriginalError instanceof Error) {
		BaseErrorInstance = OriginalError;
		OriginalErrorStack = OriginalError.stack;
		if (typeof OriginalError.message === "string") {
			const TrimmedMessage = OriginalError.message.trim();
			if (
				(TrimmedMessage.startsWith("{") &&
					TrimmedMessage.endsWith("}")) ||
				(TrimmedMessage.startsWith("[") && TrimmedMessage.endsWith("]"))
			) {
				try {
					PotentialPayloadSource = JSON.parse(TrimmedMessage);
				} catch (JsonParseError: any) {
					LogServiceInstance?.trace(
						`[RefineError][${OperationContext}] Failed to parse 'error.message' as JSON. Original Message (first 100 chars): '${OriginalError.message.substring(0, 100)}', JSON Parse Error: '${JsonParseError.message || JsonParseError}'`,
					);
				}
			}
		}
	} else {
		BaseErrorInstance = new Error(String(OriginalError));
		OriginalErrorStack = BaseErrorInstance.stack;
		if (
			typeof OriginalError === "object" &&
			OriginalError !== null &&
			!Array.isArray(OriginalError)
		) {
			PotentialPayloadSource = OriginalError;
		}
	}

	if (
		!PotentialPayloadSource &&
		typeof OriginalError === "object" &&
		OriginalError !== null
	) {
		const ErrorAsObject = OriginalError as any;
		if (
			ErrorAsObject.name ||
			ErrorAsObject.code ||
			ErrorAsObject.errno ||
			ErrorAsObject.syscall ||
			ErrorAsObject.$isError
		) {
			PotentialPayloadSource = ErrorAsObject;
		}
	}

	if (
		PotentialPayloadSource &&
		typeof PotentialPayloadSource === "object" &&
		!Array.isArray(PotentialPayloadSource)
	) {
		const Payload = PotentialPayloadSource as IStructuredErrorPayload;
		if (
			Payload.message !== undefined ||
			Payload.name !== undefined ||
			Payload.code !== undefined ||
			Payload.errno !== undefined ||
			Payload.syscall !== undefined ||
			Payload.$isError !== undefined
		) {
			const RefinedErrorMessage =
				Payload.message || BaseErrorInstance.message;
			const RefinedError = new Error(
				RefinedErrorMessage,
			) as NodeJS.ErrnoException & { $isError?: boolean };
			RefinedError.name = Payload.name || BaseErrorInstance.name;
			if (Payload.code !== undefined)
				RefinedError.code = String(Payload.code);
			if (Payload.errno !== undefined) RefinedError.errno = Payload.errno;
			if (Payload.syscall !== undefined)
				RefinedError.syscall = Payload.syscall;
			if (Payload.$isError !== undefined)
				RefinedError.$isError = Payload.$isError;

			const PayloadStack = Payload.stack;
			RefinedError.stack =
				PayloadStack ||
				OriginalErrorStack ||
				`${RefinedError.name}: ${RefinedError.message}\n(Stack trace from original error source was unavailable or not provided in payload)`;
			if (
				PayloadStack &&
				OriginalErrorStack &&
				OriginalErrorStack !== PayloadStack &&
				!OriginalErrorStack.includes(PayloadStack)
			) {
				RefinedError.stack =
					`${RefinedError.name}: ${RefinedError.message}\n` +
					`(Stack from Payload Source):\n${PayloadStack}\n` +
					`(Original Error/Wrapper Stack):\n${OriginalErrorStack}`;
			}
			LogServiceInstance?.trace(
				`[RefineError][${OperationContext}] Successfully refined error from a structured payload. New Message: '${RefinedError.message}', Code: ${RefinedError.code ?? "N/A"}`,
			);
			return RefinedError;
		}
	}
	return BaseErrorInstance;
}

export abstract class BaseCocoonShim implements IDisposable {
	public readonly _serviceBrand: undefined;
	readonly #ServiceIdentifierString: string;
	readonly #RpcProtocolAdapterInstance:
		| IRpcProtocolServiceAdapter
		| undefined;
	#LoggerInstance: ILogServiceForShim | undefined;
	readonly #WarnOnceMessageSet = new Set<string>();
	protected readonly _InstanceDisposables = new DisposableStore();

	constructor(
		ServiceIdentifier: string | symbol,
		RpcServiceAdapterInstance: IRpcProtocolServiceAdapter | undefined,
		LogServiceInstance: ILogServiceForShim | undefined,
	) {
		this.#ServiceIdentifierString = String(ServiceIdentifier);
		this.#RpcProtocolAdapterInstance = RpcServiceAdapterInstance;
		this.#LoggerInstance = LogServiceInstance;

		if (!this.#LoggerInstance) {
			console.warn(
				`[BaseCocoonShim][${this.#ServiceIdentifierString}] Constructor: ILogServiceForShim was not provided. Logging will fall back to console.`,
			);
		}

		if (!this.#RpcProtocolAdapterInstance && this._RequiresRpc()) {
			const ErrorMessage = `Constructor: IRpcProtocolServiceAdapter was not provided for shim '${this.#ServiceIdentifierString}', but this shim is marked as RPC-dependent. RPC features will be impaired.`;
			if (this.#LoggerInstance) {
				this.#LoggerInstance.error(ErrorMessage);
			} else {
				console.error(
					`[BaseCocoonShim][${this.#ServiceIdentifierString}] ${ErrorMessage}`,
				);
			}
		}
		this._LogInfo(`Initialized.`);
	}

	protected _RequiresRpc(): boolean {
		return true;
	}

	protected get _LogService(): ILogServiceForShim | undefined {
		return this.#LoggerInstance;
	}

	protected get _RpcService(): IRpcProtocolServiceAdapter | undefined {
		return this.#RpcProtocolAdapterInstance;
	}

	protected get _ServiceIdentifier(): string {
		return this.#ServiceIdentifierString;
	}

	protected _LogTrace(Message: string, ...Args: any[]): void {
		this._LogWithLevel("trace", Message, ...Args);
	}
	protected _LogDebug(Message: string, ...Args: any[]): void {
		this._LogWithLevel("debug", Message, ...Args);
	}
	protected _LogInfo(Message: string, ...Args: any[]): void {
		this._LogWithLevel("info", Message, ...Args);
	}
	protected _LogWarn(Message: string, ...Args: any[]): void {
		this._LogWithLevel("warn", Message, ...Args);
	}
	protected _LogError(MessageOrError: string | Error, ...Args: any[]): void {
		this._LogWithLevel("error", MessageOrError, ...Args);
	}

	private _LogWithLevel(
		LogLevel: keyof ILogServiceForShim,
		MessageOrError: string | Error,
		...AdditionalArgument: any[]
	): void {
		const LogPrefix = `[${this.#ServiceIdentifierString}]`;
		const EffectiveMessageToLog =
			MessageOrError instanceof Error
				? MessageOrError
				: `${LogPrefix} ${MessageOrError}`;

		if (this.#LoggerInstance) {
			if (LogLevel === "error" && MessageOrError instanceof Error) {
				this.#LoggerInstance.error(
					MessageOrError,
					...AdditionalArgument,
				);
			} else if (
				typeof (this.#LoggerInstance as any)[LogLevel] === "function"
			) {
				(this.#LoggerInstance as any)[LogLevel](
					EffectiveMessageToLog,
					...AdditionalArgument,
				);
			} else {
				console.error(
					`${LogPrefix}[FallbackLog][${LogLevel}] ${MessageOrError instanceof Error ? MessageOrError.message : MessageOrError}`,
					...AdditionalArgument,
					MessageOrError instanceof Error ? MessageOrError.stack : "",
				);
			}
		} else {
			const ConsoleMethodToUse =
				LogLevel === "error"
					? console.error
					: LogLevel === "warn"
						? console.warn
						: LogLevel === "info"
							? console.info
							: console.debug;

			ConsoleMethodToUse(
				`${LogPrefix}[${LogLevel.toUpperCase()}] ${MessageOrError instanceof Error ? MessageOrError.message : MessageOrError}`,
				...AdditionalArgument,
				MessageOrError instanceof Error ? MessageOrError.stack : "",
			);
		}
	}

	protected _LogWarnOnce(Message: string, ...Args: any[]): void {
		if (!this.#WarnOnceMessageSet.has(Message)) {
			this.#WarnOnceMessageSet.add(Message);
			this._LogWarn(Message, ...Args);
		}
	}

	protected _GetProxy<T>(ProxyIdentifier: ProxyIdentifier<T>): T | null {
		const ServiceSidForLogging =
			ProxyIdentifier?.sid || String(ProxyIdentifier);
		if (!this.#RpcProtocolAdapterInstance) {
			this._LogError(
				`Cannot get RPC proxy for service '${ServiceSidForLogging}': The IRpcProtocolServiceAdapter is unavailable.`,
			);
			return null;
		}
		try {
			return this.#RpcProtocolAdapterInstance.getProxy(ProxyIdentifier);
		} catch (Error: any) {
			this._LogError(
				`Failed to get RPC proxy for service '${ServiceSidForLogging}':`,
				RefineErrorForShim(
					Error,
					this.#LoggerInstance,
					`_GetProxy(${ServiceSidForLogging})`,
				),
			);
			return null;
		}
	}

	protected async _IpcRequestResponse(
		MountainMethodName: string,
		Parameters: any,
		TimeoutMilliseconds = 5000,
	): Promise<any> {
		this._LogDebug(
			`Sending direct IPC Request to Mountain: Method='${MountainMethodName}', ParametersSummary='${JSON.stringify(Parameters)?.substring(0, 100) ?? "(null/undefined)"}...'`,
		);
		try {
			const ResultPayload = await SendRequest(
				MountainMethodName,
				Parameters,
				TimeoutMilliseconds,
			);
			this._LogService?.trace(
				`Direct IPC Response for Method='${MountainMethodName}' successfully received.`,
			);
			return ResultPayload;
		} catch (IpcError: any) {
			const RefinedIpcError = RefineErrorForShim(
				IpcError,
				this.#LoggerInstance,
				`_IpcRequestResponse(${MountainMethodName})`,
			);
			this._LogError(
				`Direct IPC Request to Mountain (Method='${MountainMethodName}') failed: ${RefinedIpcError.message}`,
				RefinedIpcError.stack,
			);
			throw RefinedIpcError;
		}
	}

	protected _IpcNotify(MountainMethodName: string, Parameters: any): void {
		const ParametersSummaryForLog = Parameters
			? JSON.stringify(Parameters).substring(0, 100) +
				(JSON.stringify(Parameters).length > 100 ? "..." : "")
			: "(no parameters)";
		this._LogDebug(
			`Sending direct IPC Notification to Mountain: Method='${MountainMethodName}', ParametersSummary='${ParametersSummaryForLog}'`,
		);
		SendNotification(MountainMethodName, Parameters).catch((Error) =>
			this._LogError(
				`Error preparing or sending direct IPC notification '${MountainMethodName}' to Mountain:`,
				Error,
			),
		);
	}

	protected _ConvertApiArgToInternal(ArgumentToMarshal: any): any {
		if (ArgumentToMarshal === undefined || ArgumentToMarshal === null)
			return ArgumentToMarshal;
		if (ArgumentToMarshal instanceof VSBuffer) return ArgumentToMarshal;
		if (typeof ArgumentToMarshal !== "object") return ArgumentToMarshal;

		try {
			if (ArgumentToMarshal instanceof VscodeApiUri) {
				return {
					$mid: MarshalledId.UriSimple,
					scheme: ArgumentToMarshal.scheme,
					authority: ArgumentToMarshal.authority,
					path: ArgumentToMarshal.path,
					query: ArgumentToMarshal.query,
					fragment: ArgumentToMarshal.fragment,
				} as VSCodeInternalUriComponents;
			}
			if (ArgumentToMarshal instanceof VscodeApiPosition) {
				return {
					lineNumber: ArgumentToMarshal.line + 1,
					column: ArgumentToMarshal.character + 1,
				} as VSCodeInternalIPosition;
			}
			if (ArgumentToMarshal instanceof VscodeApiRange) {
				return {
					startLineNumber: ArgumentToMarshal.start.line + 1,
					startColumn: ArgumentToMarshal.start.character + 1,
					endLineNumber: ArgumentToMarshal.end.line + 1,
					endColumn: ArgumentToMarshal.end.character + 1,
				} as VSCodeInternalIRange;
			}
			if (ArgumentToMarshal instanceof VscodeApiSelection) {
				return {
					selectionStartLineNumber: ArgumentToMarshal.anchor.line + 1,
					selectionStartColumn:
						ArgumentToMarshal.anchor.character + 1,
					positionLineNumber: ArgumentToMarshal.active.line + 1,
					positionColumn: ArgumentToMarshal.active.character + 1,
				} as VSCodeInternalISelection;
			}
			if (ArgumentToMarshal instanceof VscodeApiLocation) {
				return {
					uri: this._ConvertApiArgToInternal(ArgumentToMarshal.uri),
					range: this._ConvertApiArgToInternal(
						ArgumentToMarshal.range,
					),
				};
			}
			if (ArgumentToMarshal instanceof RegExp) {
				return {
					$mid: MarshalledId.Regexp,
					source: ArgumentToMarshal.source,
					flags: ArgumentToMarshal.flags,
				};
			}
			if (ArgumentToMarshal instanceof VscodeApiMarkdownString) {
				const MarkdownStringDto: VSCodeInternalIMarkdownString = {
					value: ArgumentToMarshal.value,
					isTrusted: ArgumentToMarshal.isTrusted,
					supportThemeIcons: ArgumentToMarshal.supportThemeIcons,
					supportHtml: ArgumentToMarshal.supportHtml,
					baseUri: ArgumentToMarshal.baseUri
						? (this._ConvertApiArgToInternal(
								ArgumentToMarshal.baseUri,
							) as VSCodeInternalUriComponents)
						: undefined,
				};
				return MarkdownStringDto;
			}
		} catch (ConversionError: any) {
			this._LogError(
				"Error in _ConvertApiArgToInternal (specific type conversion):",
				ArgumentToMarshal,
				ConversionError,
			);
			return ArgumentToMarshal;
		}

		if (
			ArgumentToMarshal.$mid &&
			typeof ArgumentToMarshal.$mid === "number"
		) {
			return ArgumentToMarshal;
		}

		if (
			typeof (ArgumentToMarshal as any).toJSON === "function" &&
			!Array.isArray(ArgumentToMarshal)
		) {
			try {
				return (ArgumentToMarshal as any).toJSON();
			} catch (ToJsonError: any) {
				this._LogWarn(
					`Call to custom toJSON() method failed on argument. Type: ${ArgumentToMarshal.constructor?.name || typeof ArgumentToMarshal}, Error: ${ToJsonError.message}`,
				);
			}
		}

		if (Array.isArray(ArgumentToMarshal)) {
			return ArgumentToMarshal.map((Element) =>
				this._ConvertApiArgToInternal(Element),
			);
		}

		if (
			typeof ArgumentToMarshal === "object" &&
			ArgumentToMarshal !== null &&
			ArgumentToMarshal.constructor === Object
		) {
			const MarshalledPlainObject: { [key: string]: any } = {};
			for (const Key in ArgumentToMarshal) {
				if (
					Object.prototype.hasOwnProperty.call(ArgumentToMarshal, Key)
				) {
					MarshalledPlainObject[Key] = this._ConvertApiArgToInternal(
						(ArgumentToMarshal as any)[Key],
					);
				}
			}
			return MarshalledPlainObject;
		}

		this._LogWarnOnce(
			`Unhandled complex object type encountered in _ConvertApiArgToInternal. Constructor: '${ArgumentToMarshal.constructor?.name || typeof ArgumentToMarshal}'. Returning original. Consider dedicated converter.`,
			String(ArgumentToMarshal).substring(0, 100),
		);
		return ArgumentToMarshal;
	}

	protected _ReviveApiArgument<ExpectedType = any>(
		ArgumentToRevive: any,
		RevivalContext?: any,
	): ExpectedType {
		if (ArgumentToRevive === undefined || ArgumentToRevive === null) {
			return ArgumentToRevive as ExpectedType;
		}

		try {
			const RevivedObject = VscodeRevive(
				ArgumentToRevive,
				RevivalContext,
			);

			if (
				RevivedObject &&
				typeof RevivedObject === "object" &&
				!VscodeApiUri.isUri(RevivedObject) &&
				"scheme" in RevivedObject &&
				"path" in RevivedObject &&
				typeof ExpectedType === "function" &&
				(ExpectedType as any).name === "VscodeApiUri"
			) {
				try {
					return VscodeApiUri.from(
						RevivedObject as any,
					) as ExpectedType;
				} catch (UriConversionError) {
					this._LogWarn(
						"Failed to convert revived URI components to VscodeApiUri instance post-VscodeRevive.",
						"Revived Components:",
						RevivedObject,
						"Error:",
						UriConversionError,
					);
					return RevivedObject as ExpectedType;
				}
			}
			return RevivedObject as ExpectedType;
		} catch (RevivalError: any) {
			this._LogError(
				"Failed to revive argument/result using `VscodeRevive`. Returning original.",
				"Argument:",
				ArgumentToRevive,
				"Error:",
				RevivalError,
			);
			return ArgumentToRevive as ExpectedType;
		}
	}

	protected _CreateNodeEventEmitter(): EventEmitter {
		return new EventEmitter();
	}

	protected _CreateVscodeEventFromNodeEmitter<T>(
		NodeEventEmitter: EventEmitter,
		EventNameString: string,
	): VscodeEvent<T> {
		const VscodeEventAdapter: VscodeEvent<T> = (
			EventListener: (EventPayload: T) => any,
			ListenerThisContext?: any,
			DisposablesStore?: IDisposable[] | DisposableStore,
		) => {
			if (typeof EventListener !== "function") {
				this._LogError(
					`_CreateVscodeEventFromNodeEmitter: Listener for event '${EventNameString}' is not a function.`,
				);
				return VscodeDisposableBase.None;
			}
			const EventHandlerWrapper = (...EventArgument: any[]) =>
				EventListener.call(
					ListenerThisContext,
					...(EventArgument as [T]),
				);
			NodeEventEmitter.on(EventNameString, EventHandlerWrapper);
			const SubscriptionDisposable = toDisposable(() =>
				NodeEventEmitter.removeListener(
					EventNameString,
					EventHandlerWrapper,
				),
			);

			if (Array.isArray(DisposablesStore)) {
				DisposablesStore.push(SubscriptionDisposable);
			} else if (DisposablesStore instanceof DisposableStore) {
				DisposablesStore.add(SubscriptionDisposable);
			}
			return SubscriptionDisposable;
		};
		return VscodeEventAdapter;
	}

	protected _CreateNopVscodeEvent(): VscodeEvent<any> {
		if (
			typeof VscodeEvent.None === "function" ||
			(VscodeEvent as any).None
		) {
			return (VscodeEvent as any).None;
		}
		this._LogWarnOnce(
			"VscodeEvent.None not available. Using manual NOP event stub for _CreateNopVscodeEvent().",
		);
		return () => VscodeDisposableBase.None;
	}

	public Dispose(): void {
		if (!this._InstanceDisposables.isDisposed) {
			this._InstanceDisposables.dispose();
		}
		this.#LoggerInstance = undefined;
		this._LogInfo("Disposed.");
	}
}
