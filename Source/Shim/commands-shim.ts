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
 *   - If the command is registered locally within Cocoon, it executes the callback directly.
 *   - If the command is not found locally, it proxies the execution request to Mountain
 *     via an RPC call (`$executeCommand`), assuming Mountain manages or knows about
 *     other command providers (e.g., built-in VS Code commands).
 * - Handling RPC calls from Mountain:
 *   - `$executeContributedCommand(commandId, args)`: Called by Mountain to execute a
 *     command that was registered by an extension running in Cocoon.
 *   - `$getContributedCommandMetadata()`: Called by Mountain to retrieve metadata about
 *     commands registered within Cocoon.
 * - Argument Marshalling/Revival: Uses helpers from `BaseCocoonShim` to prepare arguments
 *   for RPC and revive results received from Mountain. It also needs to ensure arguments
 *   from Mountain for local execution are properly revived.
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
 * - Uses `BaseCocoonShim` for common utilities (logging, RPC proxy, marshalling).
 * - (TODO) Should use `IExtHostTelemetry` for reporting command executions.
 *
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from "vs/base/common/buffer";
// For telemetry
import { StopWatch } from "vs/base/common/stopwatch";
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	// For options.extension type
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// For telemetry
import type { TelemetryTrustedValue } from "vs/platform/telemetry/common/telemetryUtils";
import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// For proxying to MainThreadCommands
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// For telemetry
import type { IExtHostTelemetry } from "vs/workbench/api/common/extHostTelemetry";
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";
// Import vscode.Disposable from the API shim for return types.
import { Disposable as VscodeDisposable } from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// TODO: Import type converters when available
// import * as CocoonTypeConverters from '../cocoon-type-converters';

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

		// Preserve original stack if available, otherwise use this error's stack
		if (originalError instanceof Error && originalError.stack) {
			this.stack = `${this.name}: ${this.message}\nCaused by:\n${originalError.stack}`;
		}
	}
}

// --- Type Definitions ---

/**
 * Defines the RPC interface for the `MainThreadCommands` service expected on Mountain.
 */
interface MainThreadCommandsProxyServiceShape {
	// Changed from [string] to string for clarity
	$registerCommand(id: string): Promise<void>;

	// Changed from [string] to string
	$unregisterCommand(id: string): Promise<void>;

	$executeCommand(
		// Changed from params object
		id: string,

		args: any[] | SerializableObjectWithBuffers<any[]>,

		retry?: boolean,
	): Promise<any>;

	$getCommands(): Promise<string[]>;

	// Optional
	$fireCommandActivationEvent?(commandId: string): void;
}

/**
 * Defines the RPC interface for this `ExtHostCommands` service, for methods called BY Mountain.
 */
interface CocoonExtHostCommandsRpcShape {
	$executeContributedCommand(
		commandId: string,

		marshalledArgs: any,
	): Promise<any>;

	$getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}>;
}

/** DTO for command metadata sent over RPC. */
interface CommandMetadataDtoShim extends ICommandMetadata {
	// TODO: If ICommandMetadata includes non-serializable types (e.g., functions for constraints),
	// this DTO would need to represent them appropriately for RPC.
}

/** Internal structure for storing command registration details. */
interface CommandHandlerEntry {
	callback: Function;

	thisArg: any;

	metadata?: ICommandMetadata;

	extension?: IExtensionDescription;
}

/**
 * Cocoon's implementation of `IExtHostCommands`.
 */
export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	// Required for IExtHostCommands DI
	public readonly _serviceBrand: undefined;

	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;

	readonly #commands = new Map<string, CommandHandlerEntry>();

	// Optional telemetry service
	readonly #extHostTelemetry: IExtHostTelemetry | undefined;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		// Made optional for flexibility
		extHostTelemetry?: IExtHostTelemetry,
	) {
		super("ExtHostCommands", rpcService, logService);

		this._logInfo("Initializing...");

		this.#extHostTelemetry = extHostTelemetry;

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
			this._logWarn(
				`Command '${commandId}' from extension '${extensionIdStr}' is already registered. Overwriting.`,
			);
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

			args.length > 0 ? "(with args)" : "(no args)",
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

			this.#mainThreadCmdProxy?.$fireCommandActivationEvent?.(commandId);

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
				);

				throw new Error(errorMsg);
			}

			let hasBuffers = false;

			const marshalledArgs = args.map((arg) => {
				// TODO: Use centralized CocoonTypeConverters for complex API objects.
				// For now, _convertApiArgToInternal handles basics like Uri, Position, Range.
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

				this._logDebug(
					`Remote command '${commandId}' executed by Mountain. Reviving result...`,
				);

				// TODO: Use centralized CocoonTypeConverters for complex API objects.
				const revivedResult = this._reviveApiArgument(result);

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

					// No more retries
					return this._doExecuteCommand<T>(commandId, args, false);
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

		// True if called via RPC from Mountain
		isExternalCall: boolean,

		// Pass entry directly
		commandReg: CommandHandlerEntry,
	): Promise<T> {
		const { callback, thisArg, extension, metadata } = commandReg;

		const extensionIdStr =
			extension?.identifier.value || "unknown_source_extension";

		// TODO: Implement argument validation against `metadata?.args` if schemas are available.
		// For now, log if metadata for args exists as a reminder.
		if (metadata?.args) {
			this._logService?.trace(
				`Command '${commandId}' has argument metadata defined; validation is a TODO.`,
			);
		}

		// If called from Mountain ($executeContributedCommand), args are already DTOs and need full revival.
		// If called locally (from executeCommand), args are API types and might need marshalling if passed to other commands *that are remote*.
		// For local execution, we assume args are in the correct API form expected by the callback.
		// If this call originated from RPC ($executeContributedCommand), `marshalledArgsFromMain` (now `args`) would have been revived by $executeContributedCommand.

		try {
			this._logService?.trace(
				`Invoking local command '${commandId}' from ext '${extensionIdStr}' (isExternalCall: ${isExternalCall}).`,
			);

			return await callback.apply(thisArg, args);
		} catch (executionError: any) {
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

			// Report original error to telemetry before wrapping, if telemetry service is available
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

			// Reject for RPC error handling on Mountain
			return Promise.reject(new Error(errMsg));
		}

		// TODO: Use centralized CocoonTypeConverters for complex API objects.
		// _reviveApiArgument handles basic DTOs like UriComponents, IPosition, IRange.
		// For arrays of complex arguments or nested structures, a more thorough revival might be needed.
		let revivedArgs = this._reviveApiArgument(marshalledArgsFromMain);

		if (!Array.isArray(revivedArgs)) {
			revivedArgs =
				revivedArgs === undefined || revivedArgs === null
					? []
					: [revivedArgs];
		}

		// Further process/revive individual arguments if needed, similar to VS Code's ArgumentProcessor logic.
		// This might involve iterating `revivedArgs` and applying CocoonTypeConverters.
		// For now, this basic revival is kept.
		// Example (conceptual, if args were known to need specific conversion):
		// if (Array.isArray(revivedArgs)) {

		// revivedArgs = revivedArgs.map(arg => CocoonTypeConverters.SomeSpecificType.toApi(arg));

		// }

		const stopWatch = StopWatch.create();

		const result = await this._executeContributedCommandLocal(
			commandId,

			revivedArgs,

			true,

			cmdHandlerEntry,
		);

		this._reportTelemetry(
			commandId,

			stopWatch.elapsed(),

			true,

			cmdHandlerEntry.extension,

			undefined,

			undefined,

			true,
		);

		return result;
	}

	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}> {
		this._logDebug(
			"RPC $getContributedCommandMetadata: Providing metadata for Cocoon-registered commands.",
		);

		const allMetadata: { [id: string]: CommandMetadataDtoShim } = {};

		for (const [id, commandReg] of this.#commands) {
			// TODO: If ICommandMetadata includes non-serializable types (e.g., function constraints),

			// `commandReg.metadata` needs to be converted to a serializable `CommandMetadataDtoShim`.
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

		// New flag
		wasExternalCall: boolean = false,
	): void {
		if (this.#extHostTelemetry) {
			// Type definition for telemetry data payload
			type CommandExecutedTelemetryData = {
				// Command ID
				id: TelemetryTrustedValue<string>;

				// Extension providing the command
				extensionId: string;

				// True if executed by Cocoon's local handler
				isLocal: boolean;

				// Execution time in ms
				duration: number;

				// True if execution failed
				failed: boolean;

				// Message from error if failed
				failureReason?: string;

				// True if triggered via RPC from Mountain
				wasExternalCall: boolean;
			};

			// Type definition for telemetry metadata (classifications)
			type CommandExecutedTelemetryMeta = {
				id: {
					classification: "PublicNonPersonalData";

					purpose: "FeatureInsight";

					comment: "Identifier of the executed command.";
				};

				extensionId: {
					classification: "PublicNonPersonalData";

					purpose: "FeatureInsight";

					comment: "Identifier of the extension that contributed or handled the command.";
				};

				isLocal: {
					classification: "SystemMetaData";

					purpose: "PerformanceAndHealth";

					comment: "Indicates if the command was handled locally by Cocoon or proxied.";
				};

				duration: {
					classification: "SystemMetaData";

					purpose: "PerformanceAndHealth";

					isMeasurement: true;

					comment: "Duration of command execution.";
				};

				failed: {
					classification: "SystemMetaData";

					purpose: "PerformanceAndHealth";

					comment: "Indicates if the command execution failed.";
				};

				failureReason?: {
					classification: "CallstackOrException";

					purpose: "PerformanceAndHealth";

					comment: "Error message if command execution failed.";
				};

				wasExternalCall: {
					classification: "SystemMetaData";

					purpose: "PerformanceAndHealth";

					comment: "Indicates if command was triggered from Mountain via RPC.";
				};

				// Replace with actual owner
				owner: "YourTeamOrAlias";

				comment: "Telemetry data for command executions within Cocoon.";
			};

			const data: CommandExecutedTelemetryData = {
				id: new TelemetryTrustedValue(
					commandId,

					// Cast if TelemetryTrustedValue is not directly string
				) as TelemetryTrustedValue<string>,

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
	}

	public override dispose(): void {
		super.dispose();

		this.#commands.clear();

		this._logInfo("Disposed and cleared command registry.");
	}
}
