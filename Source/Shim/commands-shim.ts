/*---------------------------------------------------------------------------------------------
 * Cocoon Commands Shim (commands-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.commands` API namespace for the Cocoon environment, primarily
 * by fulfilling the `IExtHostCommands` service interface. This shim manages the
 * registration and execution of commands, acting as a bridge between extensions running
 * in Cocoon and the Mountain host process.
 *
 * Responsibilities:
 * - `registerCommand(id, handler, thisArg?, options?)`:
 *   - Stores command callbacks locally within Cocoon.
 *   - If the command is marked as "global" (default), it notifies Mountain via an RPC
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
 *     by `ArgumentProcessor`s before execution.
 *   - `$getContributedCommandMetadata()`: Called by Mountain to retrieve metadata about
 *     commands registered within Cocoon.
 * - Argument Marshalling/Revival: Uses helpers from `BaseCocoonShim` for basic types.
 *   A simplified `ArgumentProcessor` pattern is introduced for incoming RPC arguments.
 *   A full `CommandsConverter` (like in VS Code) for handling `vscode.Command` objects
 *   as arguments/results is a TODO.
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
 * - Uses VS Code's `validateConstraint` (assumed available) for argument validation if
 *   command metadata specifies constraints.
 * - TODO: Implement and use a full `CommandsConverter` for robust handling of `vscode.Command`
 *   objects in arguments and return values across RPC.
 *
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
import { StopWatch } from "vs/base/common/stopwatch"; // For telemetry
import { validateConstraint as vscodeValidateConstraint } from "vs/base/common/types.js"; // Assuming this path is resolvable
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	ExtensionIdentifier, // For options.extension type
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { TelemetryTrustedValue } from "vs/platform/telemetry/common/telemetryUtils"; // For telemetry
import {
	ExtHostContext, // For registering this service for RPC calls from MainThread
	MainContext, // For proxying to MainThreadCommands
	type ICommandDto, // For CommandsConverter (TODO)
	type ICommandMetadataDto, // For $getContributedCommandMetadata
} from "vs/workbench/api/common/extHost.protocol";
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry"; // For telemetry
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";
import { Disposable as VscodeDisposable } from "vscode"; // Import vscode.Disposable from the API shim for return types.

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
	$fireCommandActivationEvent?(commandId: string): void; // Optional
}

/** Defines the RPC interface for this `ExtHostCommands` service, for methods called BY Mountain. */
interface CocoonExtHostCommandsRpcShape {
	$executeContributedCommand(
		commandId: string,
		marshalledArgs: any,
	): Promise<any>;
	$getContributedCommandMetadata(): Promise<{
		[id: string]: ICommandMetadataDto;
	}>;
}

/** DTO for command metadata sent over RPC. (Assumed ICommandMetadata is serializable or needs specific DTO) */
type CommandMetadataDtoShim = ICommandMetadataDto; // Using VS Code's DTO for now

/** Internal structure for storing command registration details. */
interface CommandHandlerEntry {
	callback: Function;
	thisArg: any;
	metadata?: ICommandMetadata; // VS Code's internal metadata type
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

// TODO: Implement a full CommandsConverter similar to VS Code's `ExtHostCommands.CommandsConverter`
// This is essential for robustly handling `vscode.Command` objects when they are passed as arguments
// or returned from commands, especially across RPC boundaries.
// For MVP, this is a placeholder.
class CommandsConverterPlaceholder {
	constructor(private _logService?: ILogServiceForShim) {}
	toInternal(command: any, disposables: any): ICommandDto | undefined {
		this._logService?.warn(
			"[CommandsConverterPlaceholder] toInternal: Not fully implemented. Passing command object as-is for DTO.",
		);
		if (!command) return undefined;
		return {
			$ident: undefined, // Full converter would manage $ident for complex args
			id: command.command,
			title: command.title,
			tooltip: command.tooltip,
			arguments: command.arguments,
		};
	}
	fromInternal(commandDto: ICommandDto): any | undefined {
		this._logService?.warn(
			"[CommandsConverterPlaceholder] fromInternal: Not fully implemented. Returning basic command object from DTO.",
		);
		if (!commandDto) return undefined;
		return {
			command: commandDto.id,
			title: commandDto.title,
			tooltip: commandDto.tooltip,
			arguments: commandDto.arguments,
		};
	}
}

/** Cocoon's implementation of `IExtHostCommands`. */
export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	public readonly _serviceBrand: undefined; // Required for IExtHostCommands DI

	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;
	readonly #commands = new Map<string, CommandHandlerEntry>();
	readonly #extHostTelemetry?: IExtHostTelemetry; // Optional telemetry service
	readonly #argumentProcessors: ArgumentProcessor[] = []; // For processing args from MainThread
	readonly #commandsConverter: CommandsConverterPlaceholder; // TODO: Replace with full CommandsConverter

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		extHostTelemetry?: IExtHostTelemetry, // Made optional
	) {
		super("ExtHostCommands", rpcService, logService);
		this._logInfo("Initializing...");
		this.#extHostTelemetry = extHostTelemetry;
		this.#commandsConverter = new CommandsConverterPlaceholder(
			this._logService,
		); // TODO: Replace

		// Default Argument Processor using _reviveApiArgument
		this.registerArgumentProcessor({
			processArgument: (
				arg: any,
				_extensionSource: IExtensionDescription | undefined,
				_commandId: string,
			) => {
				// `this` here refers to the ArgumentProcessor object, not ShimExtHostCommands.
				// Need to access _reviveApiArgument from the outer scope or pass it.
				// For now, assume _reviveApiArgument is available if called from within ShimExtHostCommands context.
				// This is slightly awkward; a better pattern might be to pass reviveFn to processor.
				return (this as any as ShimExtHostCommands)._reviveApiArgument(
					arg,
				);
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

	public registerCommand(
		commandId: string,
		callback: <T>(...args: any[]) => T | Promise<T>,
		thisArg?: any,
		options?: {
			metadata?: ICommandMetadata;
			extension?: IExtensionDescription;
			global?: boolean;
		},
	): VscodeDisposable {
		const extensionIdStr =
			options?.extension?.identifier.value || "unknown_extension";
		this._logDebug(
			`Registering command: ID='${commandId}', Global=${options?.global ?? true}, FromExt='${extensionIdStr}'`,
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
			// VS Code's behavior is to throw an error if a command is already registered.
			// console.warn is softer but might hide issues if extensions accidentally re-register.
			const errorMsg = `Command '${commandId}' from extension '${extensionIdStr}' is already registered. Overwriting is not standard VS Code behavior and may lead to issues.`;
			this._logError(errorMsg);
			// For stricter compatibility, uncomment: throw new Error(errorMsg);
		}

		this.#commands.set(commandId, {
			callback,
			thisArg,
			metadata: options?.metadata,
			extension: options?.extension,
		});
		const isGlobalCommand = options?.global !== false;

		if (isGlobalCommand && this.#mainThreadCmdProxy) {
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
		} else if (isGlobalCommand && !this.#mainThreadCmdProxy) {
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
				if (isGlobalCommand && this.#mainThreadCmdProxy) {
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
					args,
					false,
					commandHandlerEntry,
				);
				this._reportTelemetry(
					commandId,
					stopWatch.elapsed(),
					true,
					commandHandlerEntry.extension,
				);
				return result;
			} catch (error) {
				// Error is already a CocoonCommandError or similar, or a raw error from callback
				this._reportTelemetry(
					commandId,
					stopWatch.elapsed(),
					true,
					commandHandlerEntry.extension,
					true,
					error instanceof Error ? error.message : String(error),
				);
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
					commandId,
					stopWatch.elapsed(),
					false,
					undefined,
					true,
					errorMsg,
				);
				throw new Error(errorMsg);
			}

			let hasBuffers = false;
			const marshalledArgs = args.map((arg) => {
				// TODO: Integrate full CommandsConverter for vscode.Command objects.
				// _convertApiArgToInternal handles basics (Uri, Position, Range, RegExp, MarkdownString).
				// It does NOT deeply marshal complex API objects (like QuickPickItem[] or a full TextDocument).
				// This could be a source of issues if extensions pass complex objects as command arguments.
				const converted = this._convertApiArgToInternal(arg);
				if (
					converted instanceof VSBuffer ||
					arg instanceof ArrayBuffer ||
					arg instanceof Uint8Array
				) {
					hasBuffers = true;
					if (arg instanceof ArrayBuffer)
						return VSBuffer.wrap(new Uint8Array(arg));
					if (arg instanceof Uint8Array) return VSBuffer.wrap(arg);
				}
				return converted;
			});

			const rpcArgsPayload = hasBuffers
				? new SerializableObjectWithBuffers(marshalledArgs)
				: marshalledArgs;

			try {
				const result = await this.#mainThreadCmdProxy.$executeCommand(
					commandId,
					rpcArgsPayload,
					allowRetry,
				);
				this._logService?.trace(
					`Remote command '${commandId}' executed by Mountain. Reviving result...`,
				);
				const revivedResult = this._reviveApiArgument<T>(result);
				this._reportTelemetry(
					commandId,
					stopWatch.elapsed(),
					false,
					undefined,
				);
				return revivedResult;
			} catch (e: any) {
				if (
					e instanceof Error &&
					e.message === "$executeCommand:retry" &&
					allowRetry
				) {
					this._logInfo(
						`Retrying command '${commandId}' as requested by Mountain.`,
					);
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
					commandId,
					stopWatch.elapsed(),
					false,
					undefined,
					true,
					refinedError.message,
				);
				throw refinedError;
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

		// Argument Validation (if metadata with constraints is provided)
		if (metadata?.args) {
			for (let i = 0; i < metadata.args.length; i++) {
				const argMeta = metadata.args[i];
				if (argMeta.constraint) {
					try {
						// Assuming vscodeValidateConstraint is available (e.g., from 'vs/base/common/types.js')
						// If not, this will fail or needs a placeholder.
						vscodeValidateConstraint(args[i], argMeta.constraint);
					} catch (validationError: any) {
						this._logError(
							`Argument validation failed for command '${commandId}' (Ext: ${extensionIdStr}), argument '${argMeta.name || `index ${i}`}'. ` +
								`Description: ${argMeta.description || "N/A"}. Error: ${validationError.message}`,
							"Provided Arg:",
							args[i],
						);
						// Re-throw as a CocoonCommandError for consistent error handling.
						throw new CocoonCommandError(
							new Error(
								`Illegal argument '${argMeta.name || `index ${i}`}' - ${argMeta.description || "Validation failed"}. Reason: ${validationError.message}`,
							),
							commandId,
							extension,
						);
					}
				}
			}
		}

		try {
			this._logService?.trace(
				`Invoking local command '${commandId}' from ext '${extensionIdStr}' (isExternalCall: ${isExternalCall}).`,
			);
			return await callback.apply(thisArg, args);
		} catch (executionError: any) {
			// Don't log "Canceled" errors as they are expected flow control.
			if (
				!(
					(
						executionError instanceof Error &&
						executionError.name === "Canceled"
					) /* VscodeCancellationError */
				)
			) {
				this._logError(
					`Error during local execution of command '${commandId}' (from ext: ${extensionIdStr}):`,
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
			throw new CocoonCommandError(executionError, commandId, extension);
		}
	}

	// --- RPC Methods called BY Mountain (CocoonExtHostCommandsRpcShape) ---
	public async $executeContributedCommand(
		commandId: string,
		marshalledArgsFromMain: any,
	): Promise<any> {
		this._logDebug(
			`RPC $executeContributedCommand: Received call for ID='${commandId}' from Mountain.`,
		);
		const cmdHandlerEntry = this.#commands.get(commandId);
		if (!cmdHandlerEntry) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found locally in Cocoon.`;
			this._logError(errMsg);
			return Promise.reject(new Error(errMsg)); // Reject for RPC error handling on Mountain
		}

		// Process arguments using registered ArgumentProcessors
		let processedArgsArray = Array.isArray(marshalledArgsFromMain)
			? marshalledArgsFromMain
			: marshalledArgsFromMain === undefined ||
				  marshalledArgsFromMain === null
				? []
				: [marshalledArgsFromMain];
		for (const processor of this.#argumentProcessors) {
			processedArgsArray = processedArgsArray.map((arg) =>
				processor.processArgument(
					arg,
					cmdHandlerEntry.extension,
					commandId,
				),
			);
		}

		const stopWatch = StopWatch.create();
		try {
			const result = await this._executeContributedCommandLocal(
				commandId,
				processedArgsArray,
				true,
				cmdHandlerEntry,
			);
			this._reportTelemetry(
				commandId,
				stopWatch.elapsed(),
				true,
				cmdHandlerEntry.extension,
				false,
				undefined,
				true,
			);
			// TODO: If result is complex API object, it needs marshalling using CommandsConverter or similar before returning over RPC.
			// For now, pass as-is, relying on RPCProtocol's generic JSON stringification.
			return this._convertApiArgToInternal(result); // Basic marshalling
		} catch (error) {
			// Error already wrapped by CocoonCommandError and telemetry reported by _executeContributedCommandLocal.
			// Need to re-refine for RPC transport if it's not already a plain serializable error.
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
			// TODO: Ensure ICommandMetadata is serializable or convert to CommandMetadataDtoShim.
			// Assuming ICommandMetadata from 'vs/platform/commands/common/commands.js' is mostly serializable.
			// If it contains functions or complex objects, a proper DTO conversion is needed.
			allMetadata[id] =
				commandReg.metadata ||
				({
					description: `Command '${id}' (Cocoon-ExtHost). No detailed metadata.`,
				} as CommandMetadataDtoShim);
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
		let allCommands = [...new Set([...remoteCommands, ...localCommands])];
		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter((cmdId) => !cmdId.startsWith("_"));
		}
		return allCommands.sort();
	}

	private _reportTelemetry(
		commandId: string,
		duration: number,
		isLocal: boolean,
		extension?: IExtensionDescription,
		failed: boolean = false,
		failureReason?: string,
		wasExternalCall: boolean = false, // New flag
	): void {
		if (!this.#extHostTelemetry) {
			this._logService?.trace(
				`Telemetry not available. Skipping report for command '${commandId}'.`,
			);
			return;
		}

		type CommandExecutedTelemetryData = {
			id: TelemetryTrustedValue<string>;
			extensionId: string;
			isLocal: boolean;
			duration: number;
			failed: boolean;
			failureReason?: string;
			wasExternalCall: boolean;
		};
		type CommandExecutedTelemetryMeta = {
			// Ensure this matches VS Code's expected telemetry event structure if sent to a common collector
			id: {
				classification: "PublicNonPersonalData";
				purpose: "FeatureInsight";
				comment: "Cmd ID";
			};
			extensionId: {
				classification: "PublicNonPersonalData";
				purpose: "FeatureInsight";
				comment: "Ext ID";
			};
			isLocal: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Local exec";
			};
			duration: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				isMeasurement: true;
				comment: "Exec time";
			};
			failed: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Cmd failed";
			};
			failureReason?: {
				classification: "CallstackOrException";
				purpose: "PerformanceAndHealth";
				comment: "Error if failed";
			};
			wasExternalCall: {
				classification: "SystemMetaData";
				purpose: "PerformanceAndHealth";
				comment: "Triggered by RPC";
			};
			owner: "CocoonTeam"; // Replace with actual owner/alias
			comment: "Telemetry for command executions within Cocoon.";
		};

		const data: CommandExecutedTelemetryData = {
			id: new TelemetryTrustedValue(commandId),
			extensionId:
				extension?.identifier.value ||
				(isLocal
					? "cocoon_internal_or_unknown"
					: "mountain_host_or_unknown"),
			isLocal,
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
			`Telemetry reported for command '${commandId}'. Success: ${!failed}, Duration: ${duration}ms`,
		);
	}

	public override dispose(): void {
		super.dispose();
		this.#commands.clear();
		this._logInfo("Disposed and cleared command registry.");
	}
}
