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
 *   for RPC and revive results received from Mountain.
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
 *
 *--------------------------------------------------------------------------------------------*/

// For VSBuffer and SerializableObjectWithBuffers if complex arguments are passed via RPC.
import { VSBuffer } from "vs/base/common/buffer";
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	// For options.extension type
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	// For registering this service for RPC calls from MainThread
	ExtHostContext,
	// For proxying to MainThreadCommands
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
// For wrapping arguments that include Buffers for RPC
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

// --- Type Definitions ---

/**
 * Defines the RPC interface for the `MainThreadCommands` service expected on Mountain.
 * Method names and parameters must align with Mountain's `MainThreadCommandsHandler`.
 */
interface MainThreadCommandsProxyServiceShape {
	/**
	 * Registers a command ID with the main thread.
	 * @param args An array where `args[0]` is the command ID string.
	 *             (VS Code's internal protocol often passes single string arguments this way).
	 */
	$registerCommand(args: [string]): Promise<void>;

	/**
	 * Unregisters a command ID from the main thread.
	 * @param args An array where `args[0]` is the command ID string.
	 */
	$unregisterCommand(args: [string]): Promise<void>;

	/**
	 * Executes a command on the main thread.
	 * @param params An object containing the command `id` and its `args`.
	 *               `args` can be a plain array or `SerializableObjectWithBuffers` if binary data is involved.
	 * @param retry VS Code internal concept for retrying command execution (rarely used by extensions).
	 * @returns A promise resolving to the command's result.
	 */
	$executeCommand(
		params: {
			id: string;

			args: any[] | SerializableObjectWithBuffers<any[]>;
		},

		retry?: boolean,
	): Promise<any>;

	/**
	 * Retrieves a list of all known command IDs from the main thread.
	 * @returns A promise resolving to an array of command ID strings.
	 */
	$getCommands(): Promise<string[]>;

	/**
	 * (Optional) Notifies the main thread that a command activation event has occurred.
	 * This is typically a fire-and-forget notification used for telemetry or lazy activation.
	 * @param commandId The ID of the command that was activated.
	 */
	$fireCommandActivationEvent?(commandId: string): void;
}

/**
 * Defines the RPC interface for this `ExtHostCommands` service, for methods called BY Mountain.
 * These methods allow Mountain to interact with commands registered within Cocoon.
 */
interface CocoonExtHostCommandsRpcShape {
	/**
	 * Called by Mountain to execute a command registered within this Cocoon (ExtHost) instance.
	 * @param commandId The ID of the command to execute.
	 * @param marshalledArgs The arguments for the command, potentially needing revival from DTOs.
	 * @returns A promise resolving to the command's result, which will be marshalled back to Mountain.
	 */
	$executeContributedCommand(
		commandId: string,

		marshalledArgs: any,
	): Promise<any>;

	/**
	 * Called by Mountain to retrieve metadata for commands registered within Cocoon.
	 * @returns A promise resolving to a map where keys are command IDs and values are their metadata.
	 */
	$getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}>;
}

/**
 * Data Transfer Object (DTO) for command metadata sent over RPC.
 * This should be compatible with `ICommandMetadata` but ensured to be serializable.
 * For now, assumes direct compatibility.
 */
interface CommandMetadataDtoShim extends ICommandMetadata {
	// Add any specific DTO transformations if ICommandMetadata is not directly serializable
	// or if the RPC contract differs significantly from ICommandMetadata.
}

/**
 * Internal structure for storing command registration details within Cocoon.
 */
interface CommandHandlerEntry {
	// The actual command handler function.
	callback: Function;

	// The `this` context for the callback.
	thisArg: any;

	// Optional metadata provided at registration.
	metadata?: ICommandMetadata;

	// The extension that registered this command.
	extension?: IExtensionDescription;
}

/**
 * Cocoon's implementation of `IExtHostCommands`.
 * It manages command registration and execution, proxying to Mountain (main process) as needed,
 *
 * and handles RPC calls from Mountain to execute Cocoon-registered commands.
 */
export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	// Implements RPC shape for calls from Mountain
	// Required by VS Code's service types for DI
	public readonly _serviceBrand: undefined;

	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;

	// Local command registry
	readonly #commands = new Map<string, CommandHandlerEntry>();

	/**
	 * Creates an instance of ShimExtHostCommands.
	 * @param rpcService The RPC service adapter, used for communication with MainThreadCommands.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostCommands", rpcService, logService);

		// Use Info for major lifecycle events
		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadCmdProxy = this._getProxy(
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsProxyServiceShape>,
			);

			if (this.#mainThreadCmdProxy) {
				this._logInfo(
					"MainThreadCommands RPC proxy obtained successfully.",
				);
			} else {
				this._logError(
					"Failed to obtain MainThreadCommands RPC proxy. Command registration with main process and remote command execution will be impaired.",
				);
			}

			// Register this service instance to handle RPC calls from MainThreadCommands.
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostCommands as ProxyIdentifier<CocoonExtHostCommandsRpcShape>,

					this,
				);

				this._logInfo(
					"Registered self for RPC calls from Mountain (ExtHostContext.ExtHostCommands).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to register self as RPC target for ExtHostCommands:",

					e,
				);
			}
		} else {
			this._logError(
				"RPCService Adapter (IRpcProtocolServiceAdapter) is unavailable. Cannot register self for incoming RPC calls or proxy commands to MainThreadCommands.",
			);
		}
	}

	/**
	 * {@inheritDoc vscode.commands.registerCommand}
	 *
	 * Registers a command that can be invoked programmatically.
	 * @param commandId The unique identifier for the command. Must be a non-empty string.
	 * @param callback The function to execute when the command is invoked.
	 * @param thisArg The `this` context to use when calling the handler function.
	 * @param options Additional options for command registration:
	 *                `options.metadata`: Command metadata (description, arguments, etc.).
	 *                `options.extension`: The `IExtensionDescription` of the extension registering the command.
	 *                `options.global`: If `true` (default), registers the command with the main thread (Mountain).
	 *                                 If `false`, the command is only known locally within Cocoon.
	 * @returns A `VscodeDisposable` that will unregister the command when disposed.
	 * @throws Error if `commandId` is invalid or `callback` is not a function.
	 */
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
				`Command '${commandId}' from extension '${extensionIdStr}' is already registered. The previous registration will be overwritten.`,
			);
		}

		this.#commands.set(commandId, {
			callback,

			thisArg,

			metadata: options?.metadata,

			extension: options?.extension,
		});

		// Default to global registration
		const isGlobalCommand = options?.global !== false;

		if (isGlobalCommand && this.#mainThreadCmdProxy) {
			// VS Code's $registerCommand typically expects the command ID as the first element in an array.
			this.#mainThreadCmdProxy
				.$registerCommand([commandId])
				.then(() => {
					this._logDebug(
						`Command '${commandId}' successfully registered with MainThread.`,
					);
				})
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
				`Cannot globally register command '${commandId}': MainThreadCommands RPC proxy is unavailable. Command will be local to Cocoon only.`,
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
						.$unregisterCommand([commandId])
						.then(() => {
							this._logDebug(
								`Command '${commandId}' successfully unregistered from MainThread.`,
							);
						})
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

	/**
	 * {@inheritDoc vscode.commands.executeCommand}
	 *
	 * Executes a command.
	 * @param commandId Identifier of the command to execute.
	 * @param args Arguments to pass to the command handler.
	 * @returns A promise that resolves to the result of the command.
	 * @throws An error if the command is not found locally and cannot be proxied, or if execution fails.
	 */
	public async executeCommand<T = any>(
		commandId: string,

		...args: any[]
	): Promise<T> {
		this._logDebug(
			`executeCommand: ID='${commandId}'`,

			args.length > 0 ? args : "(no args)",
		);

		return this._doExecuteCommand<T>(
			commandId,

			args,

			true /* allow retry if applicable */,
		);
	}

	private async _doExecuteCommand<T>(
		commandId: string,

		args: any[],

		allowRetry: boolean,
	): Promise<T> {
		if (this.#commands.has(commandId)) {
			this._logDebug(
				`Executing command '${commandId}' locally in Cocoon.`,
			);

			// Fire-and-forget activation event
			this.#mainThreadCmdProxy?.$fireCommandActivationEvent?.(commandId);

			return this._executeContributedCommandLocal<T>(
				commandId,

				args,

				false /* not an external RPC call */,
			);
		} else {
			this._logDebug(
				`Command '${commandId}' not found locally. Attempting to proxy execution to Mountain...`,
			);

			if (!this.#mainThreadCmdProxy) {
				const errorMsg = `Cannot execute remote command '${commandId}': MainThreadCommands RPC proxy is unavailable.`;

				this._logError(errorMsg);

				// Explicitly throw if proxy is missing for a remote command
				throw new Error(errorMsg);
			}

			let hasBuffers = false;

			const marshalledIndividualArgs = args.map((arg) => {
				// From BaseCocoonShim
				const converted = this._convertApiArgToInternal(arg);

				if (
					arg instanceof ArrayBuffer ||
					arg instanceof Uint8Array ||
					converted instanceof VSBuffer
				) {
					hasBuffers = true;

					if (arg instanceof ArrayBuffer)
						return VSBuffer.wrap(new Uint8Array(arg));

					if (arg instanceof Uint8Array) return VSBuffer.wrap(arg);

					// If already VSBuffer, it's fine
				}

				return converted;
			});

			const rpcArgsPayload = hasBuffers
				? new SerializableObjectWithBuffers(marshalledIndividualArgs)
				: marshalledIndividualArgs;

			const rpcParams = { id: commandId, args: rpcArgsPayload };

			try {
				const result = await this.#mainThreadCmdProxy.$executeCommand(
					rpcParams,

					allowRetry,
				);

				this._logDebug(
					`Remote command '${commandId}' executed by Mountain. Reviving result...`,
				);

				// From BaseCocoonShim
				return this._reviveApiArgument(result);
			} catch (e: any) {
				// Handle VS Code's internal retry signal if received from MainThread.
				if (
					e instanceof Error &&
					e.message === "$executeCommand:retry" &&
					allowRetry
				) {
					this._logInfo(
						`Retrying command '${commandId}' as requested by Mountain.`,
					);

					return this._doExecuteCommand<T>(
						commandId,

						args,

						false /* no more retries after this attempt */,
					);
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

				throw refinedError;
			}
		}
	}

	/**
	 * Executes a command that is locally registered in this Cocoon instance.
	 * @param commandId The ID of the command.
	 * @param args The arguments for the command.
	 * @param _isExternalCall Internal flag, true if called via RPC from Mountain (unused in current logic).
	 * @returns A promise resolving to the command's result.
	 */
	private async _executeContributedCommandLocal<T = unknown>(
		commandId: string,

		args: any[],

		// True if called via RPC from Mountain
		_isExternalCall: boolean,
	): Promise<T> {
		const commandReg = this.#commands.get(commandId);

		if (!commandReg) {
			// This should ideally not happen if #commands.has(commandId) was true before calling this method.
			const errorMsg = `Local command '${commandId}' handler disappeared unexpectedly during execution.`;

			this._logError(errorMsg);

			throw new Error(errorMsg);
		}

		const { callback, thisArg, extension } = commandReg;

		const extensionIdStr =
			extension?.identifier.value || "unknown_source_extension";

		// TODO: Implement argument validation against `commandReg.metadata.args` if that metadata structure is defined and available.

		try {
			return await callback.apply(thisArg, args);
		} catch (executionError: any) {
			// Don't log cancellation errors excessively as they are often part of normal flow.
			if (
				!(
					executionError instanceof Error &&
					executionError.name === "Canceled"
				)
			) {
				this._logError(
					`Error during local execution of command '${commandId}' (from extension: ${extensionIdStr}):`,

					executionError,
				);
			}

			// TODO: For fuller VS Code fidelity, wrap the error with source extension information (e.g., as a CommandError type).
			// TODO: Consider reporting this error to telemetry via IExtHostTelemetry.
			// Rethrow the original error.
			throw executionError;
		}
	}

	// --- RPC Methods called BY Mountain (CocoonExtHostCommandsRpcShape) ---

	/**
	 * {@inheritDoc CocoonExtHostCommandsRpcShape.$executeContributedCommand}
	 *
	 * RPC method called by Mountain to execute a command registered in Cocoon.
	 * @param commandId The ID of the command to execute.
	 * @param marshalledArgsFromMain Arguments received from Mountain, potentially needing revival.
	 */
	public async $executeContributedCommand(
		commandId: string,

		marshalledArgsFromMain: any,
	): Promise<any> {
		this._logDebug(
			`RPC $executeContributedCommand: Received call for ID='${commandId}' from Mountain.`,
		);

		const cmdHandler = this.#commands.get(commandId);

		if (!cmdHandler) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found locally in Cocoon. Cannot execute.`;

			this._logError(errMsg);

			// Important to reject the promise for RPC error handling on the Mountain side.
			return Promise.reject(new Error(errMsg));
		}

		// From BaseCocoonShim
		let revivedArgs = this._reviveApiArgument(marshalledArgsFromMain);

		if (!Array.isArray(revivedArgs)) {
			// Ensure args is an array for .apply(); if single arg or undefined, wrap/default.
			revivedArgs =
				revivedArgs === undefined || revivedArgs === null
					? []
					: [revivedArgs];
		}

		return this._executeContributedCommandLocal(
			commandId,

			revivedArgs,

			true /* isExternalCall = true */,
		);
	}

	/**
	 * {@inheritDoc CocoonExtHostCommandsRpcShape.$getContributedCommandMetadata}
	 *
	 * RPC method called by Mountain to get metadata of commands registered in Cocoon.
	 */
	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}> {
		this._logDebug(
			"RPC $getContributedCommandMetadata: Providing metadata for Cocoon-registered commands.",
		);

		const allMetadata: { [id: string]: CommandMetadataDtoShim } = {};

		for (const [id, commandReg] of this.#commands) {
			// Provide metadata if available, otherwise a minimal descriptor.
			allMetadata[id] =
				commandReg.metadata ||
				({
					description: `Command '${id}' registered in Cocoon (ExtHost). No detailed metadata available.`,

					// Other ICommandMetadata fields (args, category, etc.) could be defaulted if necessary.
				} as CommandMetadataDtoShim);
		}

		return allMetadata;
	}

	/**
	 * {@inheritDoc vscode.commands.getCommands}
	 *
	 * Retrieves a list of all available command IDs, merging local and remote commands.
	 * @param filterUnderscoreCommands If `true`, commands starting with '_' are filtered out (default: false).
	 * @returns A promise resolving to a sorted array of command ID strings.
	 */
	public async getCommands(
		filterUnderscoreCommands = false,
	): Promise<string[]> {
		this._logDebug(
			`API getCommands called: filterUnderscoreCommands=${filterUnderscoreCommands}`,
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
				"getCommands: MainThreadCommands RPC proxy unavailable. Only locally registered commands will be listed.",
			);
		}

		const localCommands = Array.from(this.#commands.keys());

		// Merge and deduplicate
		let allCommands = [...new Set([...remoteCommands, ...localCommands])];

		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter(
				(commandId) => !commandId.startsWith("_"),
			);
		}

		// Sort for consistent ordering
		return allCommands.sort();
	}

	/**
	 * Disposes of resources held by this shim instance, primarily clearing the command registry.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this.#commands.clear();

		this._logInfo("Disposed and cleared command registry.");
	}
}
