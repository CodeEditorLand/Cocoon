/*---------------------------------------------------------------------------------------------
 * Cocoon Commands Shim (commands-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.commands` API namespace for the Cocoon environment, primarily
 * by fulfilling the `IExtHostCommands` service interface. This shim manages the
 * registration and execution of commands, acting as a bridge between extensions running
 * in Cocoon and the Mountain host process.
 *
 * Responsibilities:
 * - `registerCommand(global, id, handler, thisArg?, options?)`:
 *   - Stores command callbacks locally within Cocoon.
 *   - If the command is marked as "global" (true), it notifies Mountain via an RPC
 *     call (`$registerCommand`) to make the command ID known system-wide.
 *   - Returns a `VscodeDisposable` to unregister the command.
 * - `executeCommand(commandId, ...args)`:
 *   - If the command is registered locally within Cocoon, it executes the callback directly,
 *     after attempting argument validation if metadata is provided.
 *   - If the command is not found locally, it proxies the execution request to Mountain
 *     via an RPC call (`$executeCommand`), assuming Mountain manages or knows about
 *     other command providers (e.g., built-in VS Code commands).
 * - Handling RPC calls from Mountain:
 *   - `$executeContributedCommand(commandId, args)`: Called by Mountain to execute a
 *     command that was registered by an extension running in Cocoon. Arguments are processed
 *     by `ArgumentProcessor`s and `CocoonCommandsConverterInternal` before execution.
 *   - `$getContributedCommandMetadata()`: Called by Mountain to retrieve metadata about
 *     commands registered within Cocoon.
 * - Argument Marshalling/Revival: Uses `CocoonCommandsConverterInternal` for `vscode.Command`
 *   objects and helpers from `BaseCocoonShim` for basic types.
 * - API Command Abstraction: Introduces `ApiCommand`, `ApiCommandArgument`, `ApiCommandResult`
 *   to define known VS Code commands, handling their argument/result conversions between
 *   API types and internal/DTO types for RPC.
 * - Telemetry: Reports command execution (source extension, duration) if `IExtHostTelemetry`
 *   is available.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostCommands` is registered with DI in `Cocoon/index.ts`
 *   as `IExtHostCommands`.
 * - The `vscode.commands` API object provided to extensions (via the API factory)
 *   delegates its calls to this service instance.
 * - Communicates with `MainThreadCommands` (on Mountain) via RPC, using methods defined
 *   in `MainContext.MainThreadCommands`.
 * - Is itself an RPC service target for calls from Mountain, identified by
 *   `ExtHostContext.ExtHostCommands`.
 * - Uses `BaseCocoonShim` for common utilities (logging, RPC proxy, basic marshalling).
 * - Uses VS Code's `validateConstraint` for argument validation if
 *   command metadata specifies constraints.
 *
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import { DisposableStore } from "vs/base/common/lifecycle";
import { StopWatch } from "vs/base/common/stopwatch";
import { validateConstraint as vscodeValidateConstraint } from "vs/base/common/types.js";
import {
	URI as VscodeUriInternal,
	type UriComponents,
} from "vs/base/common/uri";
import type { IURITransformer } from "vs/base/common/uriIpc";
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// import type { ILogService } from 'vs/platform/log/common/log'; // For direct use if BaseCocoonShim's logService isn't sufficient for converter
import { TelemetryTrustedValue } from "vs/platform/telemetry/common/telemetryUtils";
import {
	ExtHostContext,
	MainContext,
	type EditorGroupColumn as ExtHostProtocolEditorGroupColumn,
	type IHoverDto as ExtHostProtocolHoverDto,
	type IPosition as ExtHostProtocolPosition,
	type IRange as ExtHostProtocolRange,
	type ISelection as ExtHostProtocolSelection,
	type ICommandDto,
	type ICommandMetadataDto,
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";
import * as extHostTypeConverter from "vs/workbench/api/common/extHostTypeConverters";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";
import {
	Disposable as VscodeDisposable,
	type Command as VscodeCommandFromApi,
} from "vscode";

import { CommandsConverter as CocoonCommandsConverterInternal } from "../cocoon-type-converters";
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Custom Error Type ---
/**
 * Custom error class for errors originating from command execution within Cocoon.
 */
export class CocoonCommandError extends Error {
	public readonly commandId: string;
	public readonly extensionId?: string;
	public readonly originalError?: any;

	constructor(
		originalError: any,
		commandId: string,
		extension?: IExtensionDescription,
	) {
		const extName =
			extension?.displayName ||
			extension?.identifier.value ||
			"Unknown Extension";
		const originalMessage =
			originalError instanceof Error
				? originalError.message
				: String(originalError);
		super(
			`[${extName}] Error executing command '${commandId}': ${originalMessage}`,
		);
		this.name = "CocoonCommandError";
		this.commandId = commandId;
		this.extensionId = extension?.identifier.value;
		this.originalError = originalError;
		if (originalError instanceof Error && originalError.stack) {
			this.stack = `${this.name}: ${this.message}\nCaused by:\n${originalError.stack}`;
		}
		Object.setPrototypeOf(this, CocoonCommandError.prototype);
	}
}

// --- Type Definitions ---

/** Defines the RPC interface for the `MainThreadCommands` service expected on Mountain. */
interface MainThreadCommandsProxyServiceShape {
	$registerCommand(id: string): Promise<void>;
	$unregisterCommand(id: string): Promise<void>;
	$executeCommand(
		id: string,
		args: any[] | SerializableObjectWithBuffers<any[]>,
		retry?: boolean,
	): Promise<any>;
	$getCommands(): Promise<string[]>;
	$fireCommandActivationEvent?(commandId: string): void;
}

/** Defines the RPC interface for this `ExtHostCommands` service, for methods called BY Mountain. */
interface CocoonExtHostCommandsRpcShape {
	$executeContributedCommand(
		commandId: string,
		marshalledArgs: any[], // Expecting an array from RPC
	): Promise<any>;
	$getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDto;
	}>;
}

/** DTO for command metadata sent over RPC. */
type CommandMetadataDtoShim = ICommandMetadataDto;

/** Internal structure for storing command registration details. */
interface CommandHandlerEntry {
	callback: Function;
	thisArg: any;
	metadata?: ICommandMetadata;
	extension?: IExtensionDescription;
}

/** Interface for argument processors used by $executeContributedCommand. */
export interface ArgumentProcessor {
	processArgument(
		arg: any,
		extensionSource: IExtensionDescription | undefined,
		commandId: string,
	): any;
}

// --- API Command Definition (align with VS Code's internal structure) ---
export class ApiCommandArgument<V_ApiType, O_DtoType = V_ApiType> {
	static readonly Uri = new ApiCommandArgument<
		extHostTypes.URI,
		UriComponents
	>(
		"uri",
		"Uri of a text document",
		(v) => v instanceof VscodeUriInternal,
		(v) => v.toJSON(),
	);
	static readonly Position = new ApiCommandArgument<
		extHostTypes.Position,
		ExtHostProtocolPosition
	>(
		"position",
		"A position in a text document",
		(v) => v instanceof extHostTypes.Position,
		extHostTypeConverter.Position.from,
	);
	static readonly Range = new ApiCommandArgument<
		extHostTypes.Range,
		ExtHostProtocolRange
	>(
		"range",
		"A range in a text document",
		(v) => v instanceof extHostTypes.Range,
		extHostTypeConverter.Range.from,
	);
	static readonly Selection = new ApiCommandArgument<
		extHostTypes.Selection,
		ExtHostProtocolSelection
	>(
		"selection",
		"A selection in a text document",
		(v) => v instanceof extHostTypes.Selection,
		extHostTypeConverter.Selection.from,
	);
	static readonly Number = new ApiCommandArgument<number>(
		"number",
		"",
		(v) => typeof v === "number",
		(v) => v,
	);
	static readonly String = new ApiCommandArgument<string>(
		"string",
		"",
		(v) => typeof v === "string",
		(v) => v,
	);
	static readonly Boolean = new ApiCommandArgument<boolean>(
		"boolean",
		"",
		(v) => typeof v === "boolean",
		(v) => v,
	);
	static readonly Object = new ApiCommandArgument<object>(
		"object",
		"",
		(v) => typeof v === "object",
		(v) => v,
	); // Careful with 'object', might need deep conversion
	static readonly StringArray: ApiCommandArgument<string[]> =
		ApiCommandArgument.Arr(ApiCommandArgument.String);

	static Arr<T, O = T>(
		element: ApiCommandArgument<T, O>,
	): ApiCommandArgument<T[], O[]> {
		return new ApiCommandArgument<T[], O[]>(
			`${element.name}_array`,
			`Array of ${element.name}, ${element.description}`,
			(v: unknown): v is T[] =>
				Array.isArray(v) && v.every((e) => element.validate(e as T)),
			(v: T[], uriTransformer?: IURITransformer): O[] =>
				v.map((e) => element.convert(e, uriTransformer)),
		);
	}

	constructor(
		readonly name: string,
		readonly description: string,
		readonly validate: (v: V_ApiType) => boolean,
		// Converts API type V_ApiType to internal/DTO type O_DtoType for sending TO MainThread
		readonly convert: (
			v: V_ApiType,
			uriTransformer?: IURITransformer,
		) => O_DtoType,
	) {}

	public optional(): ApiCommandArgument<
		V_ApiType | undefined | null,
		O_DtoType | undefined | null
	> {
		return new ApiCommandArgument(
			this.name,
			`(optional) ${this.description}`,
			(value): value is V_ApiType | undefined | null =>
				value === undefined || value === null || this.validate(value),
			(value, uriTransformer): O_DtoType | undefined | null =>
				value === undefined
					? undefined
					: value === null
						? null
						: this.convert(value, uriTransformer),
		);
	}

	public with(
		name: string | undefined,
		description: string | undefined,
	): ApiCommandArgument<V_ApiType, O_DtoType> {
		return new ApiCommandArgument(
			name ?? this.name,
			description ?? this.description,
			this.validate,
			this.convert,
		);
	}
}

export class ApiCommandResult<V_InternalDTO, R_ApiType = V_InternalDTO> {
	static readonly Void = new ApiCommandResult<void, void>(
		"no result",
		(v) => v,
	);
	static readonly String = new ApiCommandResult<string, string>(
		"string result",
		(v) => v,
	);
	static readonly Boolean = new ApiCommandResult<boolean, boolean>(
		"boolean result",
		(v) => v,
	);
	// Add more static results as needed, e.g., for URI, Position, etc.

	constructor(
		readonly description: string,
		// Converts internal/DTO type V_InternalDTO (received FROM MainThread) to API type R_ApiType
		readonly convert: (
			value: V_InternalDTO,
			uriTransformer?: IURITransformer,
			_originalApiArgs?: any[], // For reviving args originally passed if result conversion depends on them
			_commandsConverter?: CocoonCommandsConverterInternal, // For reviving nested commands in results
		) => R_ApiType,
	) {}
}

export class ApiCommand {
	constructor(
		readonly id: string, // Public API command ID
		readonly internalId: string, // Internal command ID used for RPC (e.g., prefixed)
		readonly description: string,
		readonly args: ApiCommandArgument<any, any>[],
		readonly result: ApiCommandResult<any, any>,
	) {}
}

// Helper for stubs in BUILTIN_COMMANDS
function _cocoonWarnStub(context: string, method: string, message?: string) {
	console.warn(
		`COCOON STUB: ${context}#${method} - ${message || "Not fully implemented or requires review."}`,
	);
}

// --- Known API Commands (Examples - this list needs to be populated extensively) ---
const BUILTIN_COMMANDS: ReadonlyArray<ApiCommand> = [
	new ApiCommand(
		"vscode.open", // Public ID
		"_workbench.open", // Internal ID used for RPC with MainThread
		"Opens the given resource with the given options.",
		[
			new ApiCommandArgument<extHostTypes.URI, UriComponents>(
				"resourceUri",
				"URI of the resource to open",
				(v) => v instanceof VscodeUriInternal,
				(v) => v.toJSON(),
			),
			new ApiCommandArgument<
				| extHostTypes.ViewColumn
				| extHostTypes.TextDocumentShowOptions
				| undefined,
				ExtHostProtocolEditorGroupColumn | any | undefined
			>( // Second type is DTO
				"columnOrOptions",
				"(optional) View column or editor options",
				(v) =>
					v === undefined ||
					typeof v === "number" ||
					typeof v === "object", // vscode.ViewColumn is number
				(v, uriTransformer) => {
					if (typeof v === "object" && v !== null) {
						// ITextDocumentShowOptions
						// A real one would use a proper DTO and revive/marshal URIs in options
						// Assuming extHostTypeConverter.TextEditorOpenOptions.from handles this
						return extHostTypeConverter.TextEditorOpenOptions.from(
							v as extHostTypes.TextDocumentShowOptions,
							uriTransformer,
						);
					}
					// If number, it's a ViewColumn
					return v !== undefined
						? extHostTypeConverter.ViewColumn.from(
								v as extHostTypes.ViewColumn,
							)
						: undefined;
				},
			).optional(),
			new ApiCommandArgument<string | undefined, string | undefined>( // label for the editor
				"label",
				"(optional) Label for the editor",
				(v) => v === undefined || typeof v === "string",
				(v) => v,
			).optional(),
		],
		ApiCommandResult.Void, // Typically opens editor, result not directly used by caller
	),
	new ApiCommand(
		"vscode.diff",
		"_workbench.diff",
		"Opens the diff editor for the given resources.",
		[
			new ApiCommandArgument<extHostTypes.URI, UriComponents>(
				"left",
				"Left resource URI",
				(v) => v instanceof VscodeUriInternal,
				(v) => v.toJSON(),
			),
			new ApiCommandArgument<extHostTypes.URI, UriComponents>(
				"right",
				"Right resource URI",
				(v) => v instanceof VscodeUriInternal,
				(v) => v.toJSON(),
			),
			new ApiCommandArgument<string | undefined, string | undefined>(
				"title",
				"(optional) Title for diff editor",
				(v) => v === undefined || typeof v === "string",
				(v) => v,
			).optional(),
			new ApiCommandArgument<
				extHostTypes.TextDocumentShowOptions | undefined,
				any
			>(
				"options",
				"(optional) Editor options",
				(v) => v === undefined || typeof v === "object",
				(v, ut) =>
					v
						? extHostTypeConverter.TextEditorOpenOptions.from(v, ut)
						: undefined,
			).optional(),
		],
		ApiCommandResult.Void,
	),
	new ApiCommand(
		"vscode.executeHoverProvider", // Example name, actual is different
		"_editor.executeHoverProvider", // Example internal name
		"Triggers hover provider execution.",
		[
			ApiCommandArgument.Uri, // resource
			ApiCommandArgument.Position, // position
		],
		new ApiCommandResult<ExtHostProtocolHoverDto[], extHostTypes.Hover[]>(
			"Array of hovers",
			(internalHovers, _uriTransformer, _origArgs, cmdConverter) => {
				if (!internalHovers) return [];
				// This is where a proper HoverConverter.toApiType would be used.
				// extHostTypeConverter.Hover.to moves from DTO to API type
				_cocoonWarnStub(
					"ApiCommandResult(executeHoverProvider)",
					"convert",
					"Ensure extHostTypeConverter.Hover.to is correct.",
				);
				return internalHovers.map(
					(h) =>
						extHostTypeConverter.Hover.to(h) ||
						new extHostTypes.Hover([]),
				);
			},
		),
	),
];
// --- End Known API Commands ---

/** Cocoon's implementation of `IExtHostCommands`. */
export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	public readonly _serviceBrand: undefined; // Required for IExtHostCommands DI

	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;
	readonly #commands = new Map<string, CommandHandlerEntry>();
	readonly #apiCommands = new Map<string, ApiCommand>(); // For known API commands with marshalling defs
	readonly #extHostTelemetry?: IExtHostTelemetry;
	readonly #argumentProcessors: ArgumentProcessor[] = [];
	readonly converter: CocoonCommandsConverterInternal;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		extHostTelemetry?: IExtHostTelemetry,
		uriTransformer?: IURITransformer | null, // Injected for converter
	) {
		super("ExtHostCommands", rpcService, logService);
		this._logInfo("Initializing with CocoonCommandsConverterInternal...");
		this.#extHostTelemetry = extHostTelemetry;

		this.converter = new CocoonCommandsConverterInternal(
			this as any, // Pass self for executeCommand and _reviveApiArgument access from converter
			this._logService,
			(id: string) => this.#apiCommands.get(id), // Provide lookup for API commands
			uriTransformer || undefined, // Pass URI transformer
		);
		this._logInfo(
			`CommandsConverter initialized. Delegating command ID: ${this.converter.delegatingCommandId}`,
		);

		// Populate #apiCommands with built-in definitions
		for (const apiCmd of BUILTIN_COMMANDS) {
			if (this.#apiCommands.has(apiCmd.id)) {
				this._logWarn(
					`API Command '${apiCmd.id}' multiply defined. Keeping first.`,
				);
			} else {
				this.#apiCommands.set(apiCmd.id, apiCmd);
			}
		}
		this._logInfo(
			`Initialized ${this.#apiCommands.size} built-in API command definitions.`,
		);

		// Default Argument Processor for arguments coming FROM MainThread TO an extension's command handler.
		this.registerArgumentProcessor({
			processArgument: (
				arg: any,
				_extensionSource: IExtensionDescription | undefined,
				_commandId: string,
			) => {
				// If arg is an ICommandDto, convert it to vscode.Command
				if (
					arg &&
					(arg.$ident ||
						(typeof arg.id === "string" &&
							typeof arg.title === "string"))
				) {
					const potentialCommand = this.converter.fromInternal(
						arg as ICommandDto,
					);
					if (potentialCommand) {
						// if fromInternal returns something, it's a command
						return potentialCommand;
					}
				}
				// Fallback to generic revival for other types (URIs, etc.)
				return this._reviveApiArgument(arg);
			},
		});

		if (this._rpcService) {
			this.#mainThreadCmdProxy = this._getProxy(
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsProxyServiceShape>,
			);
			if (!this.#mainThreadCmdProxy) {
				this._logError(
					"Failed to obtain MainThreadCommands RPC proxy. Global command registration and remote execution will be impaired.",
				);
			}
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostCommands as ProxyIdentifier<CocoonExtHostCommandsRpcShape>,
					this,
				);
				this._logInfo(
					"Registered self for RPC calls from Mountain (ExtHostCommands).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostCommands:",
					e,
				);
			}
		} else {
			this._logError(
				"RPCService Adapter unavailable. Cannot register self or proxy commands.",
			);
		}
	}

	public registerArgumentProcessor(processor: ArgumentProcessor): void {
		this.#argumentProcessors.push(processor);
	}

	public registerApiCommand(apiCommand: ApiCommand): VscodeDisposable {
		this._logService?.debug(
			`[ExtHostCommands] Registering API command: ${apiCommand.id} (internal: ${apiCommand.internalId})`,
		);
		if (this.#apiCommands.has(apiCommand.id)) {
			this._logService?.warn(
				`[ExtHostCommands] API command '${apiCommand.id}' is already registered. Overwriting definition. Handler will also be overwritten if ID is the same.`,
			);
		}
		this.#apiCommands.set(apiCommand.id, apiCommand);

		// Register the public-facing command that an extension would call via vscode.commands.executeCommand(apiCommand.id, ...)
		const registration = this.registerCommand(
			false, // API commands are typically not "global" in the sense of needing explicit MainThread $registerCommand. Their internal counterparts are.
			apiCommand.id,
			async (...apiArgs: any[]) => {
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}' invoked with ${apiArgs.length} arguments.`,
				);
				// 1. Validate and Convert API arguments to internal/DTO types using ApiCommandArgument.convert
				const internalArgs = apiCommand.args.map((argDef, i) => {
					const apiArgValue = apiArgs[i];
					if (!argDef.validate(apiArgValue)) {
						const err = new Error(
							`Invalid argument '${argDef.name}' provided for API command '${apiCommand.id}'. Failed validation for value: ${apiArgValue}`,
						);
						this._logService?.error(
							`[ExtHostCommands] ${err.message}`,
						);
						throw err;
					}
					try {
						return argDef.convert(
							apiArgValue,
							this.converter.uriTransformer,
						);
					} catch (convErr: any) {
						const err = new Error(
							`Error converting argument '${argDef.name}' for API command '${apiCommand.id}': ${convErr.message}`,
						);
						this._logService?.error(
							`[ExtHostCommands] ${err.message}`,
							convErr,
						);
						throw err;
					}
				});
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}', converted args:`,
					internalArgs,
				);

				// 2. Execute the *internal* command (which might be an RPC call to MainThread)
				const internalResult = await this.executeCommand(
					apiCommand.internalId,
					...internalArgs,
				);
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}', internal result:`,
					internalResult,
				);

				// 3. Convert internal/DTO result back to API type using ApiCommandResult.convert
				try {
					return apiCommand.result.convert(
						internalResult,
						this.converter.uriTransformer,
						apiArgs,
						this.converter,
					);
				} catch (convErr: any) {
					const err = new Error(
						`Error converting result for API command '${apiCommand.id}': ${convErr.message}`,
					);
					this._logService?.error(
						`[ExtHostCommands] ${err.message}`,
						convErr,
					);
					throw err;
				}
			},
			undefined, // thisArg for the callback
			{
				// Command metadata for the public API command visible to extensions
				description: apiCommand.description,
				args: apiCommand.args.map((a) => ({
					name: a.name,
					description: a.description,
					constraint: undefined,
					schema: undefined,
				})),
				// `returns` isn't a standard ICommandMetadata field but good for documentation
				// @ts-ignore
				returns: apiCommand.result.description,
			},
		);

		return new VscodeDisposable(() => {
			registration.dispose(); // Unregisters the command handler
			this.#apiCommands.delete(apiCommand.id); // Remove the API command definition
			this._logService?.debug(
				`[ExtHostCommands] Unregistered API command: ${apiCommand.id}`,
			);
		});
	}

	public registerCommand(
		global: boolean, // True if command should be advertised to MainThread via $registerCommand
		commandId: string,
		callback: <T>(...args: any[]) => T | Promise<T>,
		thisArg?: any,
		options?: {
			// Options for the command registration itself
			metadata?: ICommandMetadata;
			extension?: IExtensionDescription;
		},
	): VscodeDisposable {
		const extensionIdStr =
			options?.extension?.identifier.value || "unknown_extension";
		this._logDebug(
			`Registering command: ID='${commandId}', Global=${global}, FromExt='${extensionIdStr}'`,
		);

		if (
			!commandId ||
			typeof commandId !== "string" ||
			!commandId.trim().length
		) {
			throw new Error("Command ID cannot be empty or invalid.");
		}
		if (typeof callback !== "function") {
			throw new Error("Command callback must be a function.");
		}
		if (this.#commands.has(commandId)) {
			const errorMsg = `Command '${commandId}' from extension '${extensionIdStr}' is already registered. Overwriting. Note: VS Code typically throws here.`;
			this._logError(errorMsg);
			// For stricter compatibility, uncomment: throw new Error(errorMsg);
		}

		this.#commands.set(commandId, {
			callback,
			thisArg,
			metadata: options?.metadata,
			extension: options?.extension,
		});

		if (global && this.#mainThreadCmdProxy) {
			this.#mainThreadCmdProxy
				.$registerCommand(commandId)
				.then(() =>
					this._logDebug(
						`Command '${commandId}' successfully registered with MainThread.`,
					),
				)
				.catch((e) =>
					this._logError(
						`RPC $registerCommand for '${commandId}' failed:`,
						refineErrorForShim(
							e,
							this._logService,
							`$registerCommand(${commandId})`,
						),
					),
				);
		} else if (global && !this.#mainThreadCmdProxy) {
			this._logWarn(
				`Cannot globally register command '${commandId}': MainThreadCommands proxy unavailable. Command is local only.`,
			);
		}

		let isDisposed = false;
		return new VscodeDisposable(() => {
			if (isDisposed) return;
			isDisposed = true;
			this._logDebug(
				`Disposing registration for command '${commandId}'.`,
			);
			if (this.#commands.delete(commandId)) {
				this._logDebug(`Command '${commandId}' unregistered locally.`);
				if (global && this.#mainThreadCmdProxy) {
					this.#mainThreadCmdProxy
						.$unregisterCommand(commandId)
						.then(() =>
							this._logDebug(
								`Command '${commandId}' successfully unregistered from MainThread.`,
							),
						)
						.catch((e) =>
							this._logError(
								`RPC $unregisterCommand for '${commandId}' failed:`,
								refineErrorForShim(
									e,
									this._logService,
									`$unregisterCommand(${commandId})`,
								),
							),
						);
				}
			}
		});
	}

	public async executeCommand<T = any>(
		commandId: string,
		...args: any[]
	): Promise<T> {
		this._logDebug(
			`executeCommand: ID='${commandId}'`,
			args.length > 0 ? `(with ${args.length} args)` : "(no args)",
		);
		return this._doExecuteCommand<T>(commandId, args, true);
	}

	// Helper for ExtHostCommands to marshal arguments for sending to MainThread
	// Used by _doExecuteCommand when calling this.#mainThreadCmdProxy.$executeCommand
	public _convertArgumentsToInternal(
		args: any[],
		callDisposables: DisposableStore,
	): any[] {
		return args.map((arg) => {
			// Check if it's a vscode.Command object using heuristic or type VscodeCommandFromApi
			if (
				arg &&
				typeof arg.command === "string" &&
				typeof arg.title === "string"
			) {
				return this.converter.toInternal(
					arg as VscodeCommandFromApi,
					callDisposables,
				);
			}
			// For other types, use the basic marshaller from BaseCocoonShim
			// This assumes _convertApiArgToInternal handles URIs, etc. correctly using uriTransformer if needed,
			// or that such complex objects are handled by ApiCommand definitions.
			return this._convertApiArgToInternal(arg);
		});
	}

	// Helper for ExtHostCommands to revive arguments received from MainThread
	// Used by $executeContributedCommand and for results in _doExecuteCommand
	public _reviveArguments(marshalledArgs: any[] | undefined): any[] {
		if (!marshalledArgs || !Array.isArray(marshalledArgs)) return [];
		return marshalledArgs.map((arg) => {
			// Check if the marshalled arg looks like an ICommandDto that needs specific revival
			if (
				arg &&
				(arg.$ident ||
					(typeof arg.id === "string" &&
						typeof arg.title === "string"))
			) {
				// Heuristic for ICommandDto
				const potentialCommand = this.converter.fromInternal(
					arg as ICommandDto,
				);
				if (potentialCommand) return potentialCommand;
			}
			// Basic revival for other types (URIs, simple DTOs not handled by converter.fromInternal specifically)
			return this._reviveApiArgument(arg);
		});
	}

	private async _doExecuteCommand<T>(
		commandId: string,
		args: any[],
		allowRetry: boolean,
	): Promise<T> {
		const stopWatch = StopWatch.create();
		const commandHandlerEntry = this.#commands.get(commandId);

		if (commandHandlerEntry) {
			this._logDebug(
				`Executing command '${commandId}' locally in Cocoon.`,
			);
			this.#mainThreadCmdProxy?.$fireCommandActivationEvent?.(commandId); // Fire-and-forget
			try {
				const result = await this._executeContributedCommandLocal<T>(
					commandId,
					args, // Args are already in API shape for local execution
					false, // isExternalCall = false
					commandHandlerEntry,
				);
				// Telemetry for local success
				this._reportTelemetry(
					commandHandlerEntry,
					commandId,
					stopWatch.elapsed(),
					false,
				);
				return result;
			} catch (error) {
				// Telemetry for local failure is handled by _executeContributedCommandLocal,
				// but let's ensure it's comprehensive or add one here if _executeContributedCommandLocal only logs.
				// _executeContributedCommandLocal calls _reportTelemetry on failure for its own error,
				// but we might want a specific one here for the overall _doExecuteCommand context.
				// For now, assuming _executeContributedCommandLocal's telemetry is sufficient.
				throw error; // Rethrow the (potentially wrapped) error
			}
		} else {
			this._logDebug(
				`Command '${commandId}' not found locally. Attempting to proxy to Mountain...`,
			);
			if (!this.#mainThreadCmdProxy) {
				const errorMsg = `Cannot execute remote command '${commandId}': MainThreadCommands RPC proxy is unavailable.`;
				this._logError(errorMsg);
				this._reportTelemetry(
					undefined,
					commandId,
					stopWatch.elapsed(),
					true,
					errorMsg,
					false,
				); // No command entry, so pass undefined
				throw new Error(errorMsg);
			}

			const callDisposables = new DisposableStore();
			let marshalledArgsForRpc: any[];
			let hasBuffers = false;

			// If this command is a known API command, use its specific argument converters
			const apiCommandDef = this.#apiCommands.get(commandId);
			if (apiCommandDef) {
				this._logService?.trace(
					`Using ApiCommand definition for marshalling args of '${commandId}'.`,
				);
				marshalledArgsForRpc = apiCommandDef.args.map((argDef, i) => {
					const apiArgValue = args[i];
					// We assume validation happened at a higher level if executeCommand was called directly
					// with an API command ID. If not, validation should be added.
					// For now, focus on conversion.
					try {
						return argDef.convert(
							apiArgValue,
							this.converter.uriTransformer,
						);
					} catch (convErr: any) {
						this._logError(
							`Error converting argument '${argDef.name}' for API command '${commandId}' during remote execution:`,
							convErr,
						);
						throw new Error(
							`Failed to convert argument ${argDef.name} for ${commandId}`,
						);
					}
				});
			} else {
				// Generic marshalling using _convertArgumentsToInternal (handles vscode.Command and basic types)
				marshalledArgsForRpc = this._convertArgumentsToInternal(
					args,
					callDisposables,
				);
			}

			// Check for buffers after conversion
			hasBuffers = marshalledArgsForRpc.some(
				(arg) =>
					arg instanceof VSBuffer ||
					(arg &&
						typeof arg === "object" &&
						arg.type === "Buffer" &&
						arg.data),
			);

			const rpcArgsPayload = hasBuffers
				? new SerializableObjectWithBuffers(marshalledArgsForRpc)
				: marshalledArgsForRpc;

			try {
				const resultFromRpc =
					await this.#mainThreadCmdProxy.$executeCommand(
						apiCommandDef ? apiCommandDef.internalId : commandId, // Use internalId if API command
						rpcArgsPayload,
						allowRetry,
					);
				this._logService?.trace(
					`Remote command '${commandId}' executed by Mountain. Reviving result...`,
				);

				let finalResult: T;
				if (apiCommandDef) {
					try {
						finalResult = apiCommandDef.result.convert(
							resultFromRpc,
							this.converter.uriTransformer,
							args,
							this.converter,
						) as T;
					} catch (convErr: any) {
						this._logError(
							`Error converting result for API command '${commandId}' from remote execution:`,
							convErr,
						);
						throw new Error(
							`Failed to convert result for ${commandId}`,
						);
					}
				} else {
					// Generic revival using _reviveArguments (handles ICommandDto and basic types)
					finalResult = this._reviveArguments([
						resultFromRpc,
					])[0] as T;
				}

				this._reportTelemetry(
					undefined,
					commandId,
					stopWatch.elapsed(),
					false,
					undefined,
					false,
				); // No local command entry
				return finalResult;
			} catch (e: any) {
				if (
					e instanceof Error &&
					e.message === "$executeCommand:retry" &&
					allowRetry
				) {
					this._logInfo(
						`Retrying command '${commandId}' as requested by Mountain.`,
					);
					callDisposables.dispose(); // Dispose previous attempt's disposables
					return this._doExecuteCommand<T>(commandId, args, false); // No more retries
				}
				const refinedError = refineErrorForShim(
					e,
					this._logService,
					`executeRemoteCommand(${commandId})`,
				);
				this._logError(
					`Error executing remote command '${commandId}' via RPC: ${refinedError.message}`,
					refinedError,
				);
				this._reportTelemetry(
					undefined,
					commandId,
					stopWatch.elapsed(),
					true,
					refinedError.message,
					false,
				);
				throw refinedError;
			} finally {
				callDisposables.dispose();
			}
		}
	}

	private async _executeContributedCommandLocal<T = unknown>(
		commandId: string,
		args: any[],
		isExternalCall: boolean, // True if called via RPC from Mountain
		commandReg: CommandHandlerEntry,
	): Promise<T> {
		const { callback, thisArg, extension, metadata } = commandReg;
		const extensionIdStr =
			extension?.identifier.value || "unknown_source_extension";
		const stopWatch = StopWatch.create(); // Timer for this specific local execution part

		// Argument Validation (if metadata with constraints is provided)
		if (metadata?.args) {
			for (let i = 0; i < metadata.args.length; i++) {
				const argMeta = metadata.args[i];
				if (argMeta.constraint && args[i] !== undefined) {
					// Only validate if arg provided
					try {
						vscodeValidateConstraint(args[i], argMeta.constraint);
					} catch (validationError: any) {
						const msg =
							`Argument validation failed for command '${commandId}' (Ext: ${extensionIdStr}), argument '${argMeta.name || `index ${i}`}'. ` +
							`Description: ${argMeta.description || "N/A"}. Error: ${validationError.message}`;
						this._logError(msg, "Provided Arg:", args[i]);
						const cocoonError = new CocoonCommandError(
							new Error(
								`Illegal argument '${argMeta.name || `index ${i}`}' - ${argMeta.description || "Validation failed"}. Reason: ${validationError.message}`,
							),
							commandId,
							extension,
						);
						this._reportTelemetry(
							commandReg,
							commandId,
							stopWatch.elapsed(),
							true,
							cocoonError.message,
							isExternalCall,
						);
						throw cocoonError;
					}
				}
			}
		}

		try {
			this._logService?.trace(
				`Invoking local command '${commandId}' from ext '${extensionIdStr}' (isExternalCall: ${isExternalCall}).`,
			);
			const result = await callback.apply(thisArg, args);
			// Telemetry for successful local execution (if not already done by caller like _doExecuteCommand)
			// This one is specifically for the contributed command's successful run.
			if (isExternalCall) {
				// If called from RPC, _doExecuteCommand path isn't taken.
				this._reportTelemetry(
					commandReg,
					commandId,
					stopWatch.elapsed(),
					false,
					undefined,
					isExternalCall,
				);
			}
			return result;
		} catch (executionError: any) {
			if (
				!(
					executionError instanceof Error &&
					executionError.name === "Canceled"
				)
			) {
				// VscodeCancellationError
				this._logError(
					`Error during local execution of command '${commandId}' (from ext: ${extensionIdStr}):`,
					executionError,
				);
			}

			if (this.#extHostTelemetry && extension) {
				// Report to extension error telemetry
				this.#extHostTelemetry.onExtensionError(
					extension.identifier,
					executionError instanceof Error
						? executionError
						: new Error(String(executionError)),
				);
			}
			const wrappedError =
				executionError instanceof CocoonCommandError
					? executionError
					: new CocoonCommandError(
							executionError,
							commandId,
							extension,
						);
			this._reportTelemetry(
				commandReg,
				commandId,
				stopWatch.elapsed(),
				true,
				wrappedError.message,
				isExternalCall,
			);
			throw wrappedError;
		}
	}

	// --- RPC Methods called BY Mountain (CocoonExtHostCommandsRpcShape) ---
	public async $executeContributedCommand(
		commandId: string,
		marshalledArgsFromMain: any[], // Expecting an array from RPC
	): Promise<any> {
		this._logDebug(
			`RPC $executeContributedCommand: Received call for ID='${commandId}' from Mountain.`,
		);
		const cmdHandlerEntry = this.#commands.get(commandId);
		if (!cmdHandlerEntry) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found locally in Cocoon.`;
			this._logError(errMsg);
			// Report telemetry for this failure case
			this._reportTelemetry(undefined, commandId, 0, true, errMsg, true);
			return Promise.reject(new Error(errMsg));
		}

		// Revive arguments using the new _reviveArguments helper which uses the converter
		// These args are for the extension's callback.
		const revivedArgsForCallback = this._reviveArguments(
			marshalledArgsFromMain || [],
		);

		// Use registered ArgumentProcessors (these are for deeper/custom transformations if needed)
		// Typically, _reviveArguments should handle most cases like URIs and vscode.Command revival.
		let processedArgsArray = revivedArgsForCallback;
		for (const processor of this.#argumentProcessors) {
			processedArgsArray = processedArgsArray.map((arg) =>
				processor.processArgument(
					arg,
					cmdHandlerEntry.extension,
					commandId,
				),
			);
		}

		try {
			// _executeContributedCommandLocal handles its own detailed telemetry for success/failure of the callback
			const result = await this._executeContributedCommandLocal(
				commandId,
				processedArgsArray,
				true, // isExternalCall = true
				cmdHandlerEntry,
			);

			// Result needs to be marshalled back to MainThread.
			// Use _convertArgumentsToInternal which uses the converter for vscode.Command etc.
			const callDisposables = new DisposableStore();
			try {
				// _convertArgumentsToInternal expects an array and returns an array
				const marshalledResultArray = this._convertArgumentsToInternal(
					[result],
					callDisposables,
				);
				return marshalledResultArray[0];
			} finally {
				callDisposables.dispose();
			}
		} catch (error) {
			// Error is already a CocoonCommandError from _executeContributedCommandLocal
			// Telemetry already reported by _executeContributedCommandLocal for the failure.
			// Refine for RPC transport if it's not already a plain serializable error.
			const serializableError = refineErrorForShim(
				error,
				this._logService,
				`$executeContributedCommand(${commandId}) RPC`,
			);
			throw serializableError; // This will be caught by RPCProtocol and sent as VineErrorResponse
		}
	}

	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}> {
		this._logDebug(
			"RPC $getContributedCommandMetadata: Providing metadata for Cocoon-registered commands.",
		);
		const allMetadata: { [id: string]: CommandMetadataDtoShim } = {};
		for (const [id, commandReg] of this.#commands) {
			// Ensure ICommandMetadata is serializable or convert to CommandMetadataDtoShim.
			// VS Code's ICommandMetadataDto includes description, and array of args (name, description, constraint, schema).
			// Our ICommandMetadata currently only has 'description' and 'args' as optional.
			// For now, provide what we have.
			const metadata: CommandMetadataDtoShim = {
				description:
					commandReg.metadata?.description ||
					`Command '${id}' (Cocoon-ExtHost). No detailed metadata.`,
				args:
					commandReg.metadata?.args?.map((a) => ({
						name: a.name || "",
						description: a.description || "",
						constraint: a.constraint as any, // May need proper mapping
						schema: a.schema as any, // May need proper mapping
					})) || [],
				returns: (commandReg.metadata as any)?.returns, // If we added this
			};
			allMetadata[id] = metadata;
		}
		return allMetadata;
	}

	public async getCommands(
		filterUnderscoreCommands = false,
	): Promise<string[]> {
		this._logDebug(
			`API getCommands called: filterUnderscore=${filterUnderscoreCommands}`,
		);
		let remoteCommands: string[] = [];
		if (this.#mainThreadCmdProxy) {
			try {
				remoteCommands =
					(await this.#mainThreadCmdProxy.$getCommands()) || [];
			} catch (e: any) {
				this._logError(
					"Failed to fetch remote commands via RPC $getCommands:",
					refineErrorForShim(e, this._logService, "$getCommands RPC"),
				);
			}
		} else {
			this._logWarn(
				"getCommands: MainThreadCommands proxy unavailable. Only local commands listed.",
			);
		}
		const localCommands = Array.from(this.#commands.keys());
		const apiCommandIds = Array.from(this.#apiCommands.keys()); // Include defined API commands

		let allCommands = [
			...new Set([...remoteCommands, ...localCommands, ...apiCommandIds]),
		];
		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter((cmdId) => !cmdId.startsWith("_"));
		}
		return allCommands.sort();
	}

	private _reportTelemetry(
		commandHandlerEntry: CommandHandlerEntry | undefined, // Can be undefined for remote or failed lookups
		commandId: string,
		duration: number,
		failed: boolean = false,
		failureReason?: string,
		wasExternalCall: boolean = false,
	): void {
		if (!this.#extHostTelemetry) {
			this._logService?.trace(
				`Telemetry not available. Skipping report for command '${commandId}'.`,
			);
			return;
		}

		const extension = commandHandlerEntry?.extension;
		const isLocalExecution = !!commandHandlerEntry; // True if we have a local handler for it

		type CommandExecutedTelemetryData = {
			id: TelemetryTrustedValue<string>;
			extensionId: string; // ID of the extension that registered the command, or a general source
			isLocalToCocoon: boolean; // Was the command handler found and executed within Cocoon?
			executedByExtension: boolean; // Was it a command registered by an extension (vs. an API command handler or remote)?
			duration: number;
			failed: boolean;
			failureReason?: string;
			wasExternalCall: boolean; // Was this execution triggered by an RPC call from MainThread?
		};
		type CommandExecutedTelemetryMeta = {
			id: {
				classification: "PublicNonPersonalData";
				purpose: "FeatureInsight";
				comment: "Command ID";
			};
			extensionId: {
				classification: "PublicNonPersonalData";
				purpose: "FeatureInsight";
				comment: "Extension ID or source";
			};
			isLocalToCocoon: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Handler executed in Cocoon";
			};
			executedByExtension: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Handler from an extension";
			};
			duration: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				isMeasurement: true;
				comment: "Execution time (ms)";
			};
			failed: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Command execution failed";
			};
			failureReason?: {
				classification: "CallstackOrException";
				purpose: "PerformanceAndHealth";
				comment: "Error message if failed";
			};
			wasExternalCall: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Execution triggered by RPC from MainThread";
			};
			owner: "CocoonTeam";
			comment: "Telemetry for command executions within or proxied by Cocoon.";
		};

		const data: CommandExecutedTelemetryData = {
			id: new TelemetryTrustedValue(commandId),
			extensionId:
				extension?.identifier.value ||
				(isLocalExecution
					? "cocoon_internal_or_unknown_local"
					: "mountain_host_or_unknown_remote"),
			isLocalToCocoon: isLocalExecution,
			executedByExtension: !!extension,
			duration,
			failed,
			wasExternalCall,
		};
		if (failed && failureReason) {
			data.failureReason = failureReason;
		}

		this.#extHostTelemetry.publicLog2<
			CommandExecutedTelemetryData,
			CommandExecutedTelemetryMeta
		>("cocoon/commandExecuted", data);
		this._logService?.trace(
			`Telemetry reported for command '${commandId}'. Success: ${!failed}, Duration: ${duration}ms, Local: ${isLocalExecution}, ExternalCall: ${wasExternalCall}`,
		);
	}

	public override dispose(): void {
		super.dispose();
		this.#commands.clear();
		this.#apiCommands.clear();
		this._logInfo("Disposed and cleared command registries.");
	}
}
