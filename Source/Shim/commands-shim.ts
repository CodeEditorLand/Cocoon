/*---------------------------------------------------------------------------------------------
 * Cocoon Commands Shim (shims/commands-shim.ts)
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
 *   - Returns a `Disposable` to unregister the command.
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
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

// For VSBuffer and SerializableObjectWithBuffers if complex arguments are passed via RPC.
import { VSBuffer } from "vs/base/common/buffer";
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	ExtensionIdentifier, // For options.extension type
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext, // For registering this service for RPC calls from MainThread
	MainContext, // For proxying to MainThreadCommands
} from "vs/workbench/api/common/extHost.protocol";
// For wrapping arguments that include Buffers for RPC
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";
// Import vscode.Disposable from the API shim for return types.
import { Disposable as VscodeDisposable } from "vscode";

import {
	BaseCocoonShim,
	refineErrorForShim, // Use the more specific refineError
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// Or use a local IDisposable if preferred:
// interface ILocalDisposable { dispose(): void; }

// --- Type Definitions ---

/**
 * Defines the RPC interface for the `MainThreadCommands` service expected on Mountain.
 * Method names and parameters must align with Mountain's `MainThreadCommandsHandler`.
 */
interface MainThreadCommandsProxyServiceShape {
	/**
	 * Registers a command ID with the main thread.
	 * @param args An array where `args[0]` is the command ID string.
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
	 * @param retry VS Code internal concept for retrying command execution.
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
	 * This is typically a fire-and-forget notification.
	 * @param commandId The ID of the command that was activated.
	 */
	$fireCommandActivationEvent?(commandId: string): void;
}

/**
 * Defines the RPC interface for this `ExtHostCommands` service, for methods called BY Mountain.
 */
interface CocoonExtHostCommandsRpcShape {
	/**
	 * Called by Mountain to execute a command registered within this Cocoon (ExtHost) instance.
	 * @param commandId The ID of the command to execute.
	 * @param marshalledArgs The arguments for the command, potentially needing revival.
	 * @returns A promise resolving to the command's result.
	 */
	$executeContributedCommand(
		commandId: string,
		marshalledArgs: any,
	): Promise<any>;

	/**
	 * Called by Mountain to retrieve metadata for commands registered within Cocoon.
	 * @returns A promise resolving to a map of command IDs to their metadata.
	 */
	$getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}>;
}

/**
 * Data Transfer Object (DTO) for command metadata sent over RPC.
 * This should be compatible with `ICommandMetadata` but serializable.
 */
interface CommandMetadataDtoShim extends ICommandMetadata {
	// Add any specific DTO transformations if ICommandMetadata is not directly serializable
	// or if the RPC contract differs. For now, assumes direct compatibility.
}

/**
 * Internal structure for storing command registration details.
 */
interface CommandHandlerEntry {
	callback: Function;
	thisArg: any;
	metadata?: ICommandMetadata;
	extension?: IExtensionDescription; // The extension that registered this command
}

/**
 * Cocoon's implementation of `IExtHostCommands`.
 * It manages command registration and execution, proxying to Mountain as needed.
 */
export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsRpcShape
{
	// Implements RPC shape for calls from Mountain
	public readonly _serviceBrand: undefined; // Required by VS Code's service types

	readonly #mainThreadCmdProxy: MainThreadCommandsProxyServiceShape | null =
		null;
	readonly #commands = new Map<string, CommandHandlerEntry>(); // Local command registry

	/**
	 * Creates an instance of ShimExtHostCommands.
	 * @param rpcService The RPC service adapter.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostCommands", rpcService, logService);
		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadCmdProxy = this._getProxy(
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsProxyServiceShape>,
			);
			if (this.#mainThreadCmdProxy) {
				this._log("MainThreadCommands RPC proxy obtained.");
			} else {
				this._logError(
					"MainThreadCommands RPC proxy NOT obtained. Command functionality will be impaired (registration with main, remote execution).",
				);
			}

			// Register this service instance to handle RPC calls from MainThreadCommands.
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostCommands as ProxyIdentifier<CocoonExtHostCommandsRpcShape>,
					this,
				);
				this._log(
					"Registered self for RPC calls from Mountain (ExtHostContext.ExtHostCommands).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set self for RPC (ExtHostCommands):",
					e,
				);
			}
		} else {
			this._logError(
				"RPCService (IRpcProtocolServiceAdapter) unavailable. Cannot register self for incoming RPC calls or proxy to MainThreadCommands.",
			);
		}
	}

	/**
	 * Registers a command that can be invoked programmatically.
	 * @param commandId The unique identifier for the command.
	 * @param callback The function to execute when the command is invoked.
	 * @param thisArg The `this` context used when calling the handler function.
	 * @param options Additional options for command registration.
	 *                `options.metadata`: Command metadata (description, arguments, etc.).
	 *                `options.extension`: The extension registering the command.
	 *                `options.global`: If `true` (default), registers the command with the main thread.
	 * @returns A `Disposable` that will unregister the command when disposed.
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
		// Return type is vscode.Disposable
		const extensionIdStr =
			options?.extension?.identifier.value || "unknown_extension";
		this._logService?.trace(
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
				`Command '${commandId}' is already registered. Overwriting previous registration.`,
			);
		}

		this.#commands.set(commandId, {
			callback,
			thisArg,
			metadata: options?.metadata,
			extension: options?.extension,
		});

		// Default to global registration (informing Mountain) unless explicitly local.
		const isGlobalCommand = options?.global !== false;

		if (isGlobalCommand && this.#mainThreadCmdProxy) {
			// Mountain's MainThreadCommandsHandler::registerCommand expects `args: Value` where args[0] is the ID.
			// The handler `handlers/commands.rs::handle_register_command` then expects `params: {"id": id_from_args_0}`.
			// This transformation (array to object) must happen in Mountain's `MainThreadCommandsHandler::registerCommand`.
			// So Cocoon sends `[commandId]`.
			this.#mainThreadCmdProxy.$registerCommand([commandId]).catch((e) =>
				this._logError(
					`RPC $registerCommand for '${commandId}' failed:`,
					refineErrorForShim(e, this._logService), // Use refineErrorForShim
				),
			);
		} else if (isGlobalCommand && !this.#mainThreadCmdProxy) {
			this._logWarn(
				`Cannot globally register command '${commandId}': MainThreadCommands proxy unavailable. Command will be local to Cocoon only.`,
			);
		}

		let isDisposed = false;
		return new VscodeDisposable(() => {
			if (isDisposed) return;
			isDisposed = true;
			// this._logService?.trace(`Disposing registration for command '${commandId}'`);
			if (this.#commands.delete(commandId)) {
				// this._log(`Command '${commandId}' unregistered locally.`);
				if (isGlobalCommand && this.#mainThreadCmdProxy) {
					this.#mainThreadCmdProxy
						.$unregisterCommand([commandId])
						.catch((e) =>
							this._logError(
								`RPC $unregisterCommand for '${commandId}' failed:`,
								refineErrorForShim(e, this._logService), // Use refineErrorForShim
							),
						);
				}
			}
		});
	}

	/**
	 * Executes a command.
	 * @param commandId Identifier of the command to execute.
	 * @param args Arguments passed to the command handler.
	 * @returns A promise that resolves to the result of the command.
	 */
	public async executeCommand<T = any>(
		commandId: string,
		...args: any[]
	): Promise<T> {
		// this._logService?.trace(`executeCommand: ID='${commandId}'`, args.length > 0 ? args : '(no args)');
		return this._doExecuteCommand<T>(
			commandId,
			args,
			true /* allow retry */,
		);
	}

	private async _doExecuteCommand<T>(
		commandId: string,
		args: any[],
		retry: boolean,
	): Promise<T> {
		if (this.#commands.has(commandId)) {
			this._logService?.trace(
				`Executing command '${commandId}' locally in Cocoon.`,
			);
			// Notify main thread about activation (fire-and-forget, if proxy method exists)
			this.#mainThreadCmdProxy?.$fireCommandActivationEvent?.(commandId);
			return this._executeContributedCommandLocal<T>(
				commandId,
				args,
				false,
			);
		} else {
			this._logService?.trace(
				`Command '${commandId}' not found locally. Proxying execution to Mountain...`,
			);
			if (!this.#mainThreadCmdProxy) {
				const errorMsg = `Cannot execute remote command '${commandId}': MainThreadCommands RPC proxy unavailable.`;
				this._logError(errorMsg);
				return Promise.reject(new Error(errorMsg));
			}

			// Marshall arguments for RPC.
			// VS Code's `SerializableObjectWithBuffers` is used if any argument is a binary buffer.
			let hasBuffers = false;
			const marshalledIndividualArgs = args.map((arg) => {
				const converted = this._convertApiArgToInternal(arg); // From BaseCocoonShim
				if (
					arg instanceof ArrayBuffer ||
					arg instanceof Uint8Array ||
					converted instanceof VSBuffer
				) {
					hasBuffers = true;
					if (arg instanceof ArrayBuffer)
						return VSBuffer.wrap(new Uint8Array(arg));
					if (arg instanceof Uint8Array) return VSBuffer.wrap(arg);
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
					retry,
				);
				// this._logService?.trace(`Remote command '${commandId}' executed by Mountain. Reviving result...`);
				return this._reviveApiArgument(result); // From BaseCocoonShim
			} catch (e: any) {
				// Handle VS Code's internal retry signal if received from MainThread.
				if (
					e instanceof Error &&
					e.message === "$executeCommand:retry" &&
					retry
				) {
					this._log(
						`Retrying command '${commandId}' as requested by Mountain.`,
					);
					return this._doExecuteCommand<T>(
						commandId,
						args,
						false /* no more retries */,
					);
				}
				const refined = refineErrorForShim(
					e,
					this._logService,
					`executeRemoteCmd(${commandId})`,
				);
				this._logError(
					`Error executing remote command '${commandId}' via RPC:`,
					refined,
				);
				throw refined;
			}
		}
	}

	/** Executes a command that is locally registered in this Cocoon instance. */
	private async _executeContributedCommandLocal<T = unknown>(
		commandId: string,
		args: any[],
		_annotateErrorSource: boolean,
	): Promise<T> {
		const commandReg = this.#commands.get(commandId);
		if (!commandReg) {
			// Should not happen if #commands.has(commandId) was true before calling
			throw new Error(
				`Local command '${commandId}' handler disappeared unexpectedly during execution.`,
			);
		}

		const { callback, thisArg, extension } = commandReg;
		// TODO: Argument validation against `commandReg.metadata.args` if structure is defined.

		try {
			return await callback.apply(thisArg, args);
		} catch (err: any) {
			const extIdStr = extension?.identifier.value || "unknown_source";
			if (!(err instanceof Error && err.name === "Canceled")) {
				// Don't log cancellation errors excessively
				this._logError(
					`Error during local execution of command '${commandId}' (from extension: ${extIdStr}):`,
					err,
				);
			}
			// TODO: For fuller VS Code fidelity, wrap error with source extension info (e.g., as CommandError).
			// TODO: Report error to telemetry via IExtHostTelemetry.
			throw err; // Rethrow the original error.
		}
	}

	// --- RPC Methods called BY Mountain (CocoonExtHostCommandsRpcShape) ---

	/**
	 * RPC method called by Mountain to execute a command registered in Cocoon.
	 * @param commandId The ID of the command.
	 * @param marshalledArgsFromMain Arguments from Mountain, potentially needing revival.
	 */
	public async $executeContributedCommand(
		commandId: string,
		marshalledArgsFromMain: any,
	): Promise<any> {
		this._logService?.trace(
			`RPC $executeContributedCommand: ID='${commandId}' from Mountain.`,
		);
		const cmdHandler = this.#commands.get(commandId);
		if (!cmdHandler) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found locally in Cocoon.`;
			this._logError(errMsg);
			return Promise.reject(new Error(errMsg)); // Important to reject for RPC error handling on Mountain side.
		}

		// `marshalledArgsFromMain` is the "args" array from Mountain's request payload.
		// It needs revival using `_reviveApiArgument` from BaseCocoonShim.
		let revivedArgs = this._reviveApiArgument(marshalledArgsFromMain);
		if (!Array.isArray(revivedArgs)) {
			// Ensure args is an array for .apply()
			revivedArgs =
				revivedArgs === undefined || revivedArgs === null
					? []
					: [revivedArgs];
		}
		return this._executeContributedCommandLocal(
			commandId,
			revivedArgs,
			true /* annotate error source for external calls */,
		);
	}

	/**
	 * RPC method called by Mountain to get metadata of commands registered in Cocoon.
	 */
	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}> {
		// this._logService?.trace("RPC $getContributedCommandMetadata: Providing metadata for Cocoon-registered commands.");
		const allMetadata: { [id: string]: CommandMetadataDtoShim } = {};
		for (const [id, commandReg] of this.#commands) {
			// Provide metadata if available, otherwise a minimal descriptor.
			allMetadata[id] =
				commandReg.metadata ||
				({
					description: `Command '${id}' registered in Cocoon (ExtHost).`,
					// Other ICommandMetadata fields can be added here if known or defaulted.
				} as CommandMetadataDtoShim);
		}
		return allMetadata;
	}

	/**
	 * Retrieves a list of all available command IDs, merging local and remote commands.
	 * @param filterUnderscoreCommands If `true`, commands starting with '_' are filtered out.
	 * @returns A promise resolving to a sorted array of command ID strings.
	 */
	public async getCommands(
		filterUnderscoreCommands = false,
	): Promise<string[]> {
		// this._logService?.trace(`getCommands (API call): filterUnderscore=${filterUnderscoreCommands}`);
		let remoteCommands: string[] = [];
		if (this.#mainThreadCmdProxy) {
			try {
				remoteCommands =
					(await this.#mainThreadCmdProxy.$getCommands()) || [];
			} catch (e: any) {
				this._logError(
					"Failed to fetch remote commands via RPC $getCommands:",
					refineErrorForShim(e, this._logService),
				);
			}
		} else {
			this._logWarn(
				"getCommands: MainThreadCommands proxy unavailable, only local commands will be listed.",
			);
		}

		const localCommands = Array.from(this.#commands.keys());
		let allCommands = [...new Set([...remoteCommands, ...localCommands])]; // Merge and deduplicate

		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter(
				(commandId) => !commandId.startsWith("_"),
			);
		}
		return allCommands.sort(); // Sort for consistent ordering
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim, handles _instanceDisposables
		this.#commands.clear();
		// Any other specific cleanup for commands shim
		this._log("Disposed.");
	}
}
