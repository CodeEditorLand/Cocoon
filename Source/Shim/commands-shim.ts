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
 *
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import { DisposableStore, IDisposable } from "vs/base/common/lifecycle";
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
import * as extHostTypes from "vs/workbench/api/common/extHostTypes"; // Renamed to avoid clash with vscode namespace
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";
import {
	Disposable as VscodeDisposable, // From 'vscode' API
	type Command as VscodeCommandFromApi, // From 'vscode' API
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
	$registerCommand(id: string): Promise<void>; // VS Code protocol sends ID directly
	$unregisterCommand(id: string): Promise<void>; // VS Code protocol sends ID directly
	$executeCommand(
		id: string, // Command ID
		args: any[] | SerializableObjectWithBuffers<any[]>, // Arguments payload
		retry?: boolean,
	): Promise<any>;
	$getCommands(): Promise<string[]>;
	$fireCommandActivationEvent?(commandId: string): void;
}

interface CocoonExtHostCommandsRpcShape {
	$executeContributedCommand(
		commandId: string,
		marshalledArgs: any, // The raw marshalled arguments from MainThread (could be array or single item if only one arg)
	): Promise<any>;
	$getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDto; // Ensure this DTO is serializable
	}>;
}

type CommandMetadataDtoShim = ICommandMetadataDto;

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
	static readonly Uri = new ApiCommandArgument<
		extHostTypes.URI, // vscode.Uri (API type)
		UriComponents // DTO for RPC
	>(
		"uri",
		"Uri of a text document",
		(v): v is extHostTypes.URI => v instanceof VscodeUriInternal, // Check against VS Code's internal URI type
		(v) => v.toJSON(), // Convert API type to DTO
	);
	static readonly Position = new ApiCommandArgument<
		extHostTypes.Position,
		ExtHostProtocolPosition
	>(
		"position",
		"A position in a text document",
		(v): v is extHostTypes.Position => v instanceof extHostTypes.Position,
		extHostTypeConverter.Position.from,
	);
	static readonly Range = new ApiCommandArgument<
		extHostTypes.Range,
		ExtHostProtocolRange
	>(
		"range",
		"A range in a text document",
		(v): v is extHostTypes.Range => v instanceof extHostTypes.Range,
		extHostTypeConverter.Range.from,
	);
	static readonly Selection = new ApiCommandArgument<
		extHostTypes.Selection,
		ExtHostProtocolSelection
	>(
		"selection",
		"A selection in a text document",
		(v): v is extHostTypes.Selection => v instanceof extHostTypes.Selection,
		extHostTypeConverter.Selection.from,
	);
	static readonly Number = new ApiCommandArgument<number>(
		"number",
		"",
		(v): v is number => typeof v === "number",
		(v) => v,
	);
	static readonly String = new ApiCommandArgument<string>(
		"string",
		"",
		(v): v is string => typeof v === "string",
		(v) => v,
	);
	static readonly Boolean = new ApiCommandArgument<boolean>(
		"boolean",
		"",
		(v): v is boolean => typeof v === "boolean",
		(v) => v,
	);
	static readonly Object = new ApiCommandArgument<object>(
		"object",
		"",
		(v): v is object => typeof v === "object",
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
			_originalApiArgs?: any[],
			_commandsConverter?: CocoonCommandsConverterInternal,
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
				| extHostTypes.ViewColumn
				| extHostTypes.TextDocumentShowOptions
				| undefined,
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
						return extHostTypeConverter.TextEditorOpenOptions.from(
							v as extHostTypes.TextDocumentShowOptions,
							uriTransformer,
						);
					}
					return v !== undefined
						? extHostTypeConverter.ViewColumn.from(
								v as extHostTypes.ViewColumn,
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
		"vscode.executeHoverProvider",
		"_editor.executeHoverProvider",
		"Triggers hover provider execution.",
		[ApiCommandArgument.Uri, ApiCommandArgument.Position],
		new ApiCommandResult<ExtHostProtocolHoverDto[], extHostTypes.Hover[]>(
			"Array of hovers",
			(internalHovers) => {
				if (!internalHovers) return [];
				return internalHovers.map(
					(h) =>
						extHostTypeConverter.Hover.to(h) ||
						new extHostTypes.Hover([]),
				);
			},
		),
	),
];

export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	public readonly _serviceBrand: undefined;
	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;
	readonly #commands = new Map<string, CommandHandlerEntry>();
	readonly #apiCommands = new Map<string, ApiCommand>();
	readonly #extHostTelemetry?: IExtHostTelemetry;
	readonly #argumentProcessors: ArgumentProcessor[] = [];
	readonly converter: CocoonCommandsConverterInternal;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		extHostTelemetry?: IExtHostTelemetry,
		uriTransformer?: IURITransformer | null,
	) {
		super("ExtHostCommands", rpcService, logService);
		this._logInfo("Initializing with CocoonCommandsConverterInternal...");
		this.#extHostTelemetry = extHostTelemetry;
		this.converter = new CocoonCommandsConverterInternal(
			this as any,
			this._logService,
			(id) => this.#apiCommands.get(id),
			uriTransformer || undefined,
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
			processArgument: (arg: any) => {
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
				`[ExtHostCommands] API command '${apiCommand.id}' is already registered. Overwriting definition.`,
			);
		}
		this.#apiCommands.set(apiCommand.id, apiCommand);

		const registration = this.registerCommand(
			false,
			apiCommand.id,
			async (...apiArgs: any[]) => {
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}' invoked with ${apiArgs.length} arguments.`,
				);
				const internalArgs = apiCommand.args.map((argDef, i) => {
					const apiArgValue = apiArgs[i];
					if (!argDef.validate(apiArgValue)) {
						const err = new Error(
							`Invalid argument '${argDef.name}' for API command '${apiCommand.id}'. Value: ${apiArgValue}`,
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
					`[ExtHostCommands] API command '${apiCommand.id}', converted args:`,
					internalArgs,
				);
				const internalResult = await this.executeCommand(
					apiCommand.internalId,
					...internalArgs,
				);
				this._logService?.trace(
					`[ExtHostCommands] API command '${apiCommand.id}', internal result:`,
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
				// @ts-ignore
				returns: apiCommand.result.description,
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
		globalOrId: boolean | string, // Overload: `global` boolean or `id` string
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
		let isGlobal: boolean = true; // Default global registration to true

		if (typeof globalOrId === "string") {
			// Standard signature: registerCommand(id, callback, thisArg?)
			commandId = globalOrId;
			callback = idOrCallback as (...args: any[]) => any;
			thisArg = callbackOrThisArg;
			// options = thisArgOrOptions as { metadata?: ICommandMetadata; extension?: IExtensionDescription; }; // VS Code doesn't have this overload
		} else {
			// Cocoon specific signature: registerCommand(globalBoolean, id, callback, thisArg?, options?)
			isGlobal = globalOrId;
			commandId = idOrCallback as string;
			callback = callbackOrThisArg as (...args: any[]) => any;
			thisArg = thisArgOrOptions;
			options = optionsParam;
		}
		options = options || {};
		if (typeof globalOrId !== "string") {
			// If first arg was boolean for global
			options.global = isGlobal;
		}

		const extensionIdStr =
			options?.extension?.identifier.value || "unknown_extension";
		this._logDebug(
			`Registering command: ID='${commandId}', Global=${options?.global ?? true}, FromExt='${extensionIdStr}'`,
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

		if ((options?.global ?? true) && this.#mainThreadCmdProxy) {
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
		} else if ((options?.global ?? true) && !this.#mainThreadCmdProxy) {
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
				if ((options?.global ?? true) && this.#mainThreadCmdProxy) {
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

	public _convertArgumentsToInternal(
		args: any[],
		callDisposables: DisposableStore,
	): any[] {
		return args.map((arg) => {
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
			return this._convertApiArgToInternal(arg);
		});
	}

	public _reviveArguments(marshalledArgs: any[] | undefined): any[] {
		if (!marshalledArgs || !Array.isArray(marshalledArgs)) return [];
		return marshalledArgs.map((arg) => {
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
				);
				return result;
			} catch (error) {
				throw error;
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
				);
				throw new Error(errorMsg);
			}

			const callDisposables = new DisposableStore();
			let marshalledArgsForRpc: any[];
			const apiCommandDef = this.#apiCommands.get(commandId);

			if (apiCommandDef) {
				this._logService?.trace(
					`Using ApiCommand definition for marshalling args of '${commandId}'.`,
				);
				marshalledArgsForRpc = apiCommandDef.args.map((argDef, i) => {
					const apiArgValue = args[i];
					try {
						return argDef.convert(
							apiArgValue,
							this.converter.uriTransformer,
						);
					} catch (convErr: any) {
						this._logError(
							`Error converting arg '${argDef.name}' for API cmd '${commandId}':`,
							convErr,
						);
						throw new Error(`Failed to convert arg ${argDef.name}`);
					}
				});
			} else {
				marshalledArgsForRpc = this._convertArgumentsToInternal(
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
						apiCommandDef ? apiCommandDef.internalId : commandId,
						rpcArgsPayload,
						allowRetry,
					);
				this._logService?.trace(
					`Remote command '${commandId}' executed. Reviving result...`,
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
							`Error converting result for API cmd '${commandId}':`,
							convErr,
						);
						throw new Error(
							`Failed to convert result for ${commandId}`,
						);
					}
				} else {
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
					return this._doExecuteCommand<T>(commandId, args, false);
				}
				const refinedError = refineErrorForShim(
					e,
					this._logService,
					`executeRemoteCommand(${commandId})`,
				);
				this._logError(
					`Error executing remote command '${commandId}': ${refinedError.message}`,
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
		isExternalCall: boolean,
		commandReg: CommandHandlerEntry,
	): Promise<T> {
		const { callback, thisArg, extension, metadata } = commandReg;
		const extensionIdStr =
			extension?.identifier.value || "unknown_source_extension";
		const stopWatch = StopWatch.create();

		if (metadata?.args) {
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
			if (isExternalCall) {
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

	public async $executeContributedCommand(
		commandId: string,
		marshalledArgsFromMain: any,
	): Promise<any> {
		this._logDebug(
			`RPC $executeContributedCommand: ID='${commandId}' from Mountain.`,
		);
		const cmdHandlerEntry = this.#commands.get(commandId);
		if (!cmdHandlerEntry) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found locally in Cocoon.`;
			this._logError(errMsg);
			this._reportTelemetry(undefined, commandId, 0, true, errMsg, true);
			return Promise.reject(new Error(errMsg));
		}

		const revivedArgsForCallback = this._reviveArguments(
			Array.isArray(marshalledArgsFromMain)
				? marshalledArgsFromMain
				: marshalledArgsFromMain === undefined ||
					  marshalledArgsFromMain === null
					? []
					: [marshalledArgsFromMain],
		);

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
			const callDisposables = new DisposableStore();
			try {
				const marshalledResultArray = this._convertArgumentsToInternal(
					[result],
					callDisposables,
				);
				return marshalledResultArray[0];
			} finally {
				callDisposables.dispose();
			}
		} catch (error) {
			const serializableError = refineErrorForShim(
				error,
				this._logService,
				`$executeContributedCommand(${commandId}) RPC`,
			);
			throw serializableError;
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
			const metadata: CommandMetadataDtoShim = {
				description:
					commandReg.metadata?.description ||
					`Command '${id}' (Cocoon-ExtHost). No detailed metadata.`,
				args:
					commandReg.metadata?.args?.map((a) => ({
						name: a.name || "",
						description: a.description || "",
						constraint: a.constraint as any,
						schema: a.schema as any,
					})) || [],
				// @ts-ignore
				returns: (commandReg.metadata as any)?.returns,
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
		const apiCommandIds = Array.from(this.#apiCommands.keys());
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
		const isLocalExecution = !!commandHandlerEntry;
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
		if (failed && failureReason) data.failureReason = failureReason;
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
