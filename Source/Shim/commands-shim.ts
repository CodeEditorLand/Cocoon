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
 *   - If the command is an `ApiCommand` (known VS Code built-in), it marshals arguments
 *     using `ApiCommandArgument.convert`, calls the internal command ID via RPC or locally,
 *     and converts the result using `ApiCommandResult.convert`.
 *   - If the command is registered locally within Cocoon, it executes the callback directly,
 *     after attempting argument validation if metadata is provided.
 *   - If the command is not found locally and not an ApiCommand, it proxies the execution
 *     request to Mountain via an RPC call (`$executeCommand`).
 * - Handling RPC calls from Mountain:
 *   - `$executeContributedCommand(commandId, args)`: Called by Mountain to execute a
 *     command that was registered by an extension running in Cocoon. Arguments are processed
 *     by `ArgumentProcessor`s and revived by `CocoonCommandsConverter` before execution.
 *   - `$getContributedCommandMetadata()`: Called by Mountain to retrieve metadata about
 *     commands registered within Cocoon.
 * - Argument Marshalling/Revival: Uses `CocoonCommandsConverter` for `vscode.Command`
 *   objects and `ApiCommandArgument`/`Result` for known API commands. `BaseCocoonShim`
 *   helpers are used for other basic types.
 * - API Command Abstraction: `ApiCommand`, `ApiCommandArgument`, `ApiCommandResult` define
 *   known VS Code commands, handling their argument/result conversions.
 * - Telemetry: Reports command execution if `IExtHostTelemetry` is available.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostCommands` is registered with DI in `Cocoon/index.ts`
 *   as `IExtHostCommands`.
 * - The `vscode.commands` API object delegates its calls to this service instance.
 * - Communicates with `MainThreadCommands` (on Mountain) via RPC.
 * - Is an RPC service target for calls from Mountain (ExtHostContext.ExtHostCommands).
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Last Reviewed/Updated: Based on latest merge timestamp.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import { DisposableStore, type IDisposable } from "vs/base/common/lifecycle";
import { StopWatch } from "vs/base/common/stopwatch";
import { validateConstraint as vscodeValidateConstraint } from "vs/base/common/types.js";
import {
	URI as VscodeUriInternal, // VS Code's internal URI class
	type UriComponents,
} from "vs/base/common/uri";
import type { IURITransformer } from "vs/base/common/uriIpc";
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
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
import * as extHostTypeConverter from "vs/workbench/api/common/extHostTypeConverters"; // For converting API types to protocol DTOs
import * as extHostTypes from "vs/workbench/api/common/extHostTypes"; // VS Code's internal representation of API types
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";
import {
	Command as VscodeCommandCtor, // Constructor for vscode.Command from 'vscode' API
	Disposable as VscodeDisposable,
	type Command as VscodeCommandFromApi, // Type for vscode.Command from 'vscode' API
} from "vscode";

// Public 'vscode' API module

import { CommandsConverter as CocoonCommandsConverter } from "../cocoon-type-converters"; // The shared converter
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Custom Error Type ---
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

interface CocoonExtHostCommandsRpcShape {
	$executeContributedCommand(
		commandId: string,
		marshalledArgs: any[],
	): Promise<any>; // Expect array of args
	$getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDto;
	}>;
}

interface CommandHandlerEntry {
	callback: Function;
	thisArg: any;
	metadata?: ICommandMetadata;
	extension?: IExtensionDescription;
}

export interface ArgumentProcessor {
	processArgument(
		arg: any,
		extensionSource: IExtensionDescription | undefined,
		commandId: string,
	): any;
}

// --- API Command Definition ---
export class ApiCommandArgument<V_ApiType, O_DtoType = V_ApiType> {
	static readonly Uri = new ApiCommandArgument<vscode.Uri, UriComponents>(
		"uri",
		"Uri of a text document",
		(v) => v instanceof VscodeUriInternal,
		(v, uriTransformer) =>
			uriTransformer ? uriTransformer.transformOutgoing(v) : v.toJSON(),
	);
	static readonly Position = new ApiCommandArgument<
		vscode.Position,
		ExtHostProtocolPosition
	>(
		"position",
		"A position in a text document",
		(v) => v instanceof extHostTypes.Position,
		extHostTypeConverter.Position.from,
	);
	static readonly Range = new ApiCommandArgument<
		vscode.Range,
		ExtHostProtocolRange
	>(
		"range",
		"A range in a text document",
		(v) => v instanceof extHostTypes.Range,
		extHostTypeConverter.Range.from,
	);
	static readonly Selection = new ApiCommandArgument<
		vscode.Selection,
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
	);
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

	constructor(
		readonly description: string,
		readonly convert: (
			value: V_InternalDTO,
			uriTransformer?: IURITransformer,
			_originalApiArgs?: any[], // For context if needed during result conversion
			_commandsConverter?: CocoonCommandsConverter, // For reviving nested commands in results
		) => R_ApiType,
	) {}
}

export class ApiCommand {
	constructor(
		readonly id: string,
		readonly internalId: string,
		readonly description: string,
		readonly args: ApiCommandArgument<any, any>[],
		readonly result: ApiCommandResult<any, any>,
	) {}
}

function _warnStub(
	name: string,
	context: "convert" | "validate" | "other",
	message: string = "",
) {
	console.warn(
		`[Cocoon Commands Shim STUB] ${name} (context: ${context}) is a STUB. ${message}`,
	);
}

const BUILTIN_COMMANDS: ReadonlyArray<ApiCommand> = [
	new ApiCommand(
		"vscode.open",
		"_workbench.open",
		"Opens the given resource with the given options.",
		[
			ApiCommandArgument.Uri.with(
				"resourceUri",
				"URI of the resource to open",
			),
			new ApiCommandArgument<
				vscode.ViewColumn | vscode.TextDocumentShowOptions | undefined,
				ExtHostProtocolEditorGroupColumn | any | undefined
			>(
				"columnOrOptions",
				"(optional) View column or editor options",
				(v) =>
					v === undefined ||
					typeof v === "number" ||
					typeof v === "object",
				(v, uriTransformer) => {
					if (typeof v === "object" && v !== null) {
						// If it has a 'uri' property, it's likely TextDocumentShowOptions for a specific resource
						// This conversion logic needs to be robust for all fields of TextDocumentShowOptions
						return extHostTypeConverter.TextEditorOpenOptions.from(
							v as vscode.TextDocumentShowOptions,
							uriTransformer,
						);
					}
					return v !== undefined
						? extHostTypeConverter.ViewColumn.from(
								v as vscode.ViewColumn,
							)
						: undefined;
				},
			).optional(),
			ApiCommandArgument.String.with(
				"label",
				"(optional) Label for the editor",
			).optional(),
		],
		ApiCommandResult.Void,
	),
	new ApiCommand(
		"vscode.diff",
		"_workbench.diff",
		"Opens the diff editor for the given resources.",
		[
			ApiCommandArgument.Uri.with("left", "Left resource URI"),
			ApiCommandArgument.Uri.with("right", "Right resource URI"),
			ApiCommandArgument.String.with(
				"title",
				"(optional) Title for diff editor",
			).optional(),
			new ApiCommandArgument<
				vscode.TextDocumentShowOptions | undefined,
				any
			>(
				"options",
				"(optional) Editor options",
				(v) => v === undefined || typeof v === "object",
				(v, uriTransformer) =>
					v
						? extHostTypeConverter.TextEditorOpenOptions.from(
								v,
								uriTransformer,
							)
						: undefined,
			).optional(),
		],
		ApiCommandResult.Void,
	),
	new ApiCommand(
		"vscode.executeHoverProvider", // Often not directly called, but via editor actions
		"_editor.executeHoverProvider",
		"Triggers hover provider execution.",
		[ApiCommandArgument.Uri, ApiCommandArgument.Position],
		new ApiCommandResult<ExtHostProtocolHoverDto[], vscode.Hover[]>(
			"Array of hovers",
			(internalHovers, _uriTransformer, _origArgs, cmdConverter) => {
				if (!internalHovers) return [];
				// Use the actual HoverConverter from TypeConverters
				return internalHovers.map(
					(h) =>
						TypeConverters.Hover.toApiType(
							h,
							cmdConverter,
							undefined /* disposables for new commands in hover */,
						) || new extHostTypes.Hover([]),
				);
			},
		),
	),
];

export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	declare public readonly _serviceBrand: undefined;
	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;
	readonly #commands = new Map<string, CommandHandlerEntry>();
	readonly #apiCommands = new Map<string, ApiCommand>();
	readonly #extHostTelemetry?: IExtHostTelemetry;
	readonly #argumentProcessors: ArgumentProcessor[] = [];
	readonly converter: CocoonCommandsConverter;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		extHostTelemetry?: IExtHostTelemetry,
		uriTransformer?: IURITransformer | null,
	) {
		super("ExtHostCommands", rpcService, logService);
		this._logInfo("Initializing with CocoonCommandsConverter...");
		this.#extHostTelemetry = extHostTelemetry;
		this.converter = new CocoonCommandsConverter(
			this as any, // `this` for executeCommand, _reviveApiArgument
			this._logService,
			(id) => this.#apiCommands.get(id), // Lookup for ApiCommand definitions
			uriTransformer || undefined, // Pass the uriTransformer
		);
		this._logInfo(
			`CommandsConverter initialized. Delegating command ID: ${this.converter.delegatingCommandId}`,
		);

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

		this.registerArgumentProcessor({
			processArgument: (
				arg: any,
				extensionSource: IExtensionDescription | undefined,
				commandId: string,
			) => {
				// This processor is for arguments received FROM MainThread for a command registered IN Cocoon
				if (
					arg &&
					(arg.$ident ||
						(typeof arg.id === "string" &&
							typeof arg.title === "string"))
				) {
					const potentialCommand = this.converter.fromInternal(
						arg as ICommandDto,
					);
					if (potentialCommand) return potentialCommand;
				}
				return this._reviveApiArgument(arg); // Basic revival for URIs, etc.
			},
		});

		if (this._rpcService) {
			this.#mainThreadCmdProxy = this._getProxy(
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsProxyServiceShape>,
			);
			if (!this.#mainThreadCmdProxy)
				this._logError(
					"Failed to obtain MainThreadCommands RPC proxy.",
				);
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
				`[ExtHostCommands] API command '${apiCommand.id}' is already registered. Overwriting definition.`,
			);
		}
		this.#apiCommands.set(apiCommand.id, apiCommand);

		const registration = this.registerCommand(
			false, // API commands are not "global" in the sense of needing explicit MT registration by this call
			apiCommand.id,
			async (...apiArgs: any[]) => {
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}' invoked with ${apiArgs.length} arguments.`,
				);
				const internalArgs = apiCommand.args.map((argDef, i) => {
					const apiArgValue = apiArgs[i];
					if (!argDef.validate(apiArgValue)) {
						const err = new Error(
							`Invalid argument '${argDef.name}' for API command '${apiCommand.id}'. Value: ${JSON.stringify(apiArgValue)}`,
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
							`Error converting arg '${argDef.name}' for '${apiCommand.id}': ${convErr.message}`,
						);
						this._logService?.error(
							`[ExtHostCommands] ${err.message}`,
							convErr,
						);
						throw err;
					}
				});
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}', converted args for internal call:`,
					internalArgs,
				);
				const internalResult = await this.executeCommand(
					apiCommand.internalId,
					...internalArgs,
				); // Call the internal command
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}', internal result received:`,
					internalResult,
				);
				try {
					return apiCommand.result.convert(
						internalResult,
						this.converter.uriTransformer,
						apiArgs,
						this.converter,
					);
				} catch (convErr: any) {
					const err = new Error(
						`Error converting result for '${apiCommand.id}': ${convErr.message}`,
					);
					this._logService?.error(
						`[ExtHostCommands] ${err.message}`,
						convErr,
					);
					throw err;
				}
			},
			undefined,
			{
				description: apiCommand.description,
				args: apiCommand.args.map((a) => ({
					name: a.name,
					description: a.description,
					constraint: undefined,
					schema: undefined,
				})),
				returns: { description: apiCommand.result.description } as any, // Cast to any as `returns` type in ICommandMetadata is complex
			},
		);
		return new VscodeDisposable(() => {
			registration.dispose();
			this.#apiCommands.delete(apiCommand.id);
			this._logService?.debug(
				`[ExtHostCommands] Unregistered API command: ${apiCommand.id}`,
			);
		});
	}

	public registerCommand(
		globalOrId: boolean | string,
		idOrCallback: string | ((...args: any[]) => any),
		callbackOrThisArg?: ((...args: any[]) => any) | any,
		thisArgOrOptions?:
			| any
			| {
					metadata?: ICommandMetadata;
					extension?: IExtensionDescription;
			  },
		optionsParam?: {
			metadata?: ICommandMetadata;
			extension?: IExtensionDescription;
		},
	): VscodeDisposable {
		let commandId: string;
		let callback: (...args: any[]) => any;
		let thisArg: any;
		let options:
			| {
					metadata?: ICommandMetadata;
					extension?: IExtensionDescription;
					global?: boolean;
			  }
			| undefined;
		let isGlobal: boolean = true;

		if (typeof globalOrId === "string") {
			commandId = globalOrId;
			callback = idOrCallback as (...args: any[]) => any;
			thisArg = callbackOrThisArg;
			options = thisArgOrOptions as {
				metadata?: ICommandMetadata;
				extension?: IExtensionDescription;
				global?: boolean;
			};
			if (options && options.global !== undefined)
				isGlobal = options.global; // Respect global from options if provided
		} else {
			isGlobal = globalOrId;
			commandId = idOrCallback as string;
			callback = callbackOrThisArg as (...args: any[]) => any;
			thisArg = thisArgOrOptions;
			options = optionsParam;
			if (options) options.global = isGlobal;
			else options = { global: isGlobal };
		}
		options = options || {};

		const extensionIdStr =
			options?.extension?.identifier.value || "unknown_extension";
		this._logDebug(
			`Registering command: ID='${commandId}', Global=${isGlobal}, FromExt='${extensionIdStr}'`,
		);

		if (!commandId || !commandId.trim().length)
			throw new Error("Command ID cannot be empty.");
		if (typeof callback !== "function")
			throw new Error("Command callback must be a function.");
		if (this.#commands.has(commandId)) {
			this._logError(
				`Command '${commandId}' from ext '${extensionIdStr}' already registered. Overwriting. (VS Code might throw).`,
			);
		}

		this.#commands.set(commandId, {
			callback,
			thisArg,
			metadata: options?.metadata,
			extension: options?.extension,
		});

		if (isGlobal && this.#mainThreadCmdProxy) {
			this.#mainThreadCmdProxy
				.$registerCommand(commandId)
				.then(() =>
					this._logDebug(
						`Command '${commandId}' registered with MainThread.`,
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
		} else if (isGlobal && !this.#mainThreadCmdProxy) {
			this._logWarn(
				`Cannot globally register command '${commandId}': MainThread proxy unavailable. Local only.`,
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
				if (isGlobal && this.#mainThreadCmdProxy) {
					this.#mainThreadCmdProxy
						.$unregisterCommand(commandId)
						.then(() =>
							this._logDebug(
								`Command '${commandId}' unregistered from MainThread.`,
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

	// Helper to marshal args for sending TO MainThread
	public _convertArgumentsToInternalForRpc(
		args: any[],
		callDisposables: DisposableStore,
	): any[] {
		return args.map((arg) => {
			if (
				arg instanceof VscodeCommandCtor ||
				(arg &&
					typeof arg.command === "string" &&
					typeof arg.title === "string")
			) {
				return this.converter.toInternal(
					arg as VscodeCommandFromApi,
					callDisposables,
				);
			}
			return this._convertApiArgToInternal(arg); // For URIs, simple types
		});
	}

	// Helper to revive args received FROM MainThread
	public _reviveArgumentsFromRpc(marshalledArgs: any[] | undefined): any[] {
		if (!marshalledArgs || !Array.isArray(marshalledArgs)) return [];
		return marshalledArgs.map((arg) => {
			if (
				arg &&
				(arg.$ident ||
					(typeof arg.id === "string" &&
						typeof arg.title === "string"))
			) {
				// Looks like ICommandDto
				const potentialCommand = this.converter.fromInternal(
					arg as ICommandDto,
				);
				if (potentialCommand) return potentialCommand;
			}
			return this._reviveApiArgument(arg); // For URIs, simple types
		});
	}

	private async _doExecuteCommand<T>(
		commandId: string,
		args: any[],
		allowRetry: boolean,
	): Promise<T> {
		const stopWatch = StopWatch.create();
		const commandHandlerEntry = this.#commands.get(commandId);
		const apiCommandDef = this.#apiCommands.get(commandId);

		if (commandHandlerEntry && !apiCommandDef) {
			// Locally registered, non-API command
			this._logDebug(
				`Executing command '${commandId}' locally in Cocoon (non-API).`,
			);
			this.#mainThreadCmdProxy?.$fireCommandActivationEvent?.(commandId);
			try {
				const result = await this._executeContributedCommandLocal<T>(
					commandId,
					args,
					false,
					commandHandlerEntry,
				);
				this._reportTelemetry(
					commandHandlerEntry,
					commandId,
					stopWatch.elapsed(),
					false,
					undefined,
					false,
				);
				return result;
			} catch (error) {
				throw error; // _executeContributedCommandLocal handles telemetry for its failures
			}
		}
		// If it's an API command, its registered handler (via registerApiCommand) will call executeCommand with the internalId
		// So if we reach here with an ID that's an API command's public ID, it means the API command's handler is being invoked.
		// Its handler will re-call executeCommand with the internalId, which should then hit the 'else' block below (proxy to MainThread).

		// If command not local OR it's an internal ID of an API command being executed by its wrapper
		this._logDebug(
			`Command '${commandId}' to be proxied or is internal API call. Target: ${apiCommandDef ? apiCommandDef.internalId : commandId}`,
		);
		if (!this.#mainThreadCmdProxy) {
			const errorMsg = `Cannot execute remote/internal command '${commandId}': MainThreadCommands RPC proxy is unavailable.`;
			this._logError(errorMsg);
			this._reportTelemetry(
				undefined,
				commandId,
				stopWatch.elapsed(),
				true,
				errorMsg,
				false,
			);
			throw new Error(errorMsg);
		}

		const callDisposables = new DisposableStore();
		let marshalledArgsForRpc: any[];
		let targetCommandIdForRpc = commandId;

		// If an ApiCommand definition exists for `commandId` (meaning this is the *internal* call part of an API command execution),
		// then args are already DTOs. Otherwise, convert API args to DTOs for general remote call.
		// Note: The public API command wrapper in `registerApiCommand` handles converting API args to DTOs
		// *before* calling `executeCommand` with the `internalId`. So, if `commandId` here matches `apiCommandDef.internalId`,
		// `args` should already be DTOs.
		if (apiCommandDef && commandId === apiCommandDef.id) {
			// This case should not typically happen if API commands are correctly routed.
			// If it does, it means executeCommand was called with the public API ID but no local handler,
			// and we need to marshal its args before sending to internalId.
			this._logWarn(
				`executeCommand called with public API ID '${commandId}' but no local API wrapper was hit first. Marshalling args now.`,
			);
			marshalledArgsForRpc = apiCommandDef.args.map((argDef, i) =>
				argDef.convert(args[i], this.converter.uriTransformer),
			);
			targetCommandIdForRpc = apiCommandDef.internalId;
		} else if (apiCommandDef && commandId === apiCommandDef.internalId) {
			// This is the internal call part of an API command, args are already DTOs from the wrapper
			marshalledArgsForRpc = args;
		} else {
			// General command not known as API, marshal using general converter
			marshalledArgsForRpc = this._convertArgumentsToInternalForRpc(
				args,
				callDisposables,
			);
		}

		const hasBuffers = marshalledArgsForRpc.some(
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
					targetCommandIdForRpc,
					rpcArgsPayload,
					allowRetry,
				);
			this._logService?.trace(
				`Remote/internal command '${targetCommandIdForRpc}' executed. Reviving result...`,
			);

			let finalResult: T;
			// If an ApiCommand definition exists for the *original* public command ID (if this was an API command flow)
			// then use its result converter.
			const originalPublicApiCommandDef =
				this.#apiCommands.get(commandId) ||
				(apiCommandDef && commandId === apiCommandDef.internalId
					? apiCommandDef
					: undefined);

			if (originalPublicApiCommandDef) {
				try {
					finalResult = originalPublicApiCommandDef.result.convert(
						resultFromRpc,
						this.converter.uriTransformer,
						args,
						this.converter,
					) as T;
				} catch (convErr: any) {
					this._logError(
						`Error converting result for API cmd '${originalPublicApiCommandDef.id}':`,
						convErr,
					);
					throw new Error(
						`Failed to convert result for ${originalPublicApiCommandDef.id}`,
					);
				}
			} else {
				finalResult = this._reviveArgumentsFromRpc([
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
			);
			return finalResult;
		} catch (e: any) {
			if (
				e instanceof Error &&
				e.message === "$executeCommand:retry" &&
				allowRetry
			) {
				this._logInfo(`Retrying command '${commandId}'.`);
				callDisposables.dispose();
				return this._doExecuteCommand<T>(commandId, args, false); // Recurse for retry
			}
			const refinedError = refineErrorForShim(
				e,
				this._logService,
				`executeRemoteCommand(${commandId})`,
			);
			this._logError(
				`Error executing remote/internal command '${commandId}': ${refinedError.message}`,
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

	private async _executeContributedCommandLocal<T = unknown>(
		commandId: string,
		args: any[], // These args should already be revived/processed API types
		isExternalCall: boolean, // True if called via RPC from MainThread
		commandReg: CommandHandlerEntry,
	): Promise<T> {
		const { callback, thisArg, extension, metadata } = commandReg;
		const extensionIdStr =
			extension?.identifier.value || "unknown_source_extension";
		const stopWatch = StopWatch.create();

		if (metadata?.args) {
			// Validate args if metadata provided
			for (let i = 0; i < metadata.args.length; i++) {
				const argMeta = metadata.args[i];
				if (argMeta.constraint && args[i] !== undefined) {
					try {
						vscodeValidateConstraint(args[i], argMeta.constraint);
					} catch (validationError: any) {
						const msg = `Arg validation failed for cmd '${commandId}' (Ext: ${extensionIdStr}), arg '${argMeta.name || `index ${i}`}'. Desc: ${argMeta.description || "N/A"}. Err: ${validationError.message}`;
						this._logError(msg, "Arg:", args[i]);
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
			// Report telemetry only if it's an external call or a non-API local call.
			// API command wrapper calls this with isExternalCall=false; its wrapper reports telemetry.
			if (isExternalCall || !this.#apiCommands.has(commandId)) {
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
				this._logError(
					`Error during local execution of cmd '${commandId}' (from ext: ${extensionIdStr}):`,
					executionError,
				);
			}
			if (this.#extHostTelemetry && extension) {
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
			if (isExternalCall || !this.#apiCommands.has(commandId)) {
				this._reportTelemetry(
					commandReg,
					commandId,
					stopWatch.elapsed(),
					true,
					wrappedError.message,
					isExternalCall,
				);
			}
			throw wrappedError;
		}
	}

	public async $executeContributedCommand(
		commandId: string,
		marshalledArgsFromMain: any[],
	): Promise<any> {
		this._logDebug(
			`RPC $executeContributedCommand: ID='${commandId}' from Mountain. Args count: ${marshalledArgsFromMain?.length || 0}`,
		);
		const cmdHandlerEntry = this.#commands.get(commandId);
		if (!cmdHandlerEntry) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found locally in Cocoon.`;
			this._logError(errMsg);
			this._reportTelemetry(undefined, commandId, 0, true, errMsg, true); // Report failure for telemetry
			return Promise.reject(new Error(errMsg));
		}

		const revivedArgsForCallback = this._reviveArgumentsFromRpc(
			marshalledArgsFromMain,
		);

		// Further process revived args using registered ArgumentProcessors
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
			const result = await this._executeContributedCommandLocal(
				commandId,
				processedArgsArray,
				true,
				cmdHandlerEntry,
			);
			// Result needs to be marshalled back to MainThread
			const callDisposables = new DisposableStore();
			try {
				// Use the general marshaller for the result
				const marshalledResultArray =
					this._convertArgumentsToInternalForRpc(
						[result],
						callDisposables,
					);
				return marshalledResultArray[0];
			} finally {
				callDisposables.dispose();
			}
		} catch (error) {
			// _executeContributedCommandLocal already reported telemetry.
			// We just need to ensure the error is serializable for RPC.
			const serializableError = refineErrorForShim(
				error,
				this._logService,
				`$executeContributedCommand(${commandId}) RPC`,
			);
			throw serializableError;
		}
	}

	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDto;
	}> {
		this._logDebug(
			"RPC $getContributedCommandMetadata: Providing metadata for Cocoon-registered commands.",
		);
		const allMetadata: { [id: string]: ICommandMetadataDto } = {};
		for (const [id, commandReg] of this.#commands) {
			const metadata: ICommandMetadataDto = {
				description:
					commandReg.metadata?.description ||
					`Command '${id}' (Cocoon-ExtHost). No detailed metadata.`,
				args:
					commandReg.metadata?.args?.map((a) => ({
						name: a.name || "",
						description: a.description || "",
						constraint: a.constraint as any, // Type system for constraint is complex
						schema: a.schema as any, // Type system for schema is complex
					})) || [],
				returns: (commandReg.metadata as any)?.returns as any, // Type system for returns is complex
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
		const apiCommandIds = Array.from(this.#apiCommands.keys()); // Include public API command IDs
		let allCommands = [
			...new Set([...remoteCommands, ...localCommands, ...apiCommandIds]),
		];
		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter((cmdId) => !cmdId.startsWith("_"));
		}
		return allCommands.sort();
	}

	private _reportTelemetry(
		commandHandlerEntry: CommandHandlerEntry | undefined,
		commandId: string,
		duration: number,
		failed: boolean = false,
		failureReason?: string,
		wasExternalCall: boolean = false,
	): void {
		if (!this.#extHostTelemetry) {
			this._logService?.trace(
				`Telemetry N/A. Skip report for cmd '${commandId}'.`,
			);
			return;
		}
		const extension = commandHandlerEntry?.extension;
		const isLocalExecution = !!commandHandlerEntry; // True if handler was found in this.#commands

		type CmdExecTelData = {
			id: TelemetryTrustedValue<string>;
			extensionId: string;
			isLocalToCocoon: boolean;
			executedByExtension: boolean;
			duration: number;
			failed: boolean;
			failureReason?: string;
			wasExternalCall: boolean;
		};
		type CmdExecTelMeta = {
			id: {
				c: "PublicNonPersonalData";
				p: "FeatureInsight";
				comment: "Cmd ID";
			};
			extensionId: {
				c: "PublicNonPersonalData";
				p: "FeatureInsight";
				comment: "Ext ID/source";
			};
			isLocalToCocoon: {
				c: "SystemMetaData";
				p: "PerformanceAndHealth";
				comment: "Handler in Cocoon";
			};
			executedByExtension: {
				c: "SystemMetaData";
				p: "PerformanceAndHealth";
				comment: "Handler from ext";
			};
			duration: {
				c: "SystemMetaData";
				p: "PerformanceAndHealth";
				m: true;
				comment: "Exec time (ms)";
			};
			failed: {
				c: "SystemMetaData";
				p: "PerformanceAndHealth";
				comment: "Cmd exec failed";
			};
			failureReason?: {
				c: "CallstackOrException";
				p: "PerformanceAndHealth";
				comment: "Err msg if failed";
			};
			wasExternalCall: {
				c: "SystemMetaData";
				p: "PerformanceAndHealth";
				comment: "Exec by RPC";
			};
			owner: "CocoonTeam";
			comment: "Cmd exec telemetry.";
		};

		const data: CmdExecTelData = {
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
		if (failed && failureReason)
			data.failureReason = failureReason.substring(0, 2048); // Cap length
		this.#extHostTelemetry.publicLog2<CmdExecTelData, CmdExecTelMeta>(
			"cocoon/commandExecuted",
			data,
		);
		this._logService?.trace(
			`Telemetry for cmd '${commandId}'. Success: ${!failed}, Dur: ${duration}ms, Local: ${isLocalExecution}, ExtCall: ${wasExternalCall}`,
		);
	}

	public override dispose(): void {
		super.dispose();
		this.#commands.clear();
		this.#apiCommands.clear();
		this._logInfo("Disposed and cleared command registries.");
	}
}
