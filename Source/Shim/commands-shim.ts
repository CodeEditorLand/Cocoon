/*---------------------------------------------------------------------------------------------
 * Cocoon Command Shim (shims/commands-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.commands` API (via `IExtHostCommands`) for Cocoon.
 * Aligned with VS Code's `ExtHostCommands.ts` structure and Mountain's Rust handlers.
 *
 * Responsibilities:
 * - `registerCommand`: Stores command callback locally. Notifies Mountain for "global" commands.
 * - `executeCommand`: Executes local commands or proxies to Mountain.
 * - Handles RPC calls from Mountain: `$executeContributedCommand`, `$getContributedCommandMetadata`.
 * - Uses BaseCocoonShim for argument marshalling/revival.
 *--------------------------------------------------------------------------------------------*/

// Assuming VSBuffer and SerializableObjectWithBuffers might be needed for complex args,

// though Mountain's current command handlers seem to expect plain JSON for args.
import { VSBuffer } from "vs/base/common/buffer";
import type { ICommandMetadata } from "vs/platform/commands/common/commands";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtHostContext,
	MainContext,
} from "vs/workbench/api/common/extHost.protocol";
import { SerializableObjectWithBuffers } from "vs/workbench/services/extensions/common/proxyIdentifier";

import {
	BaseCocoonShim,
	refineError,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";
// Placeholder for vscode.Disposable etc.
import * as extHostTypes from "./extHostTypes";

// TODO: Import actual vscode types (vscode.Disposable) if ../Shim/out/vscode provides them.

// --- Type Definitions ---

// Shape for the MainThreadCommands RPC proxy
// Based on Mountain's `rpc.rs -> MainThreadCommandsHandler` methods expecting `args: Value`.
// And `handlers/commands.rs` which further parses this `Value`.
interface MainThreadCommandsProxyServiceShape {
	// Method names on the proxy match the `$methodName` from `extHost.protocol.ts`
	// The actual Rust methods in MainThreadCommandsHandler will receive `args: Value`
	// which corresponds to the parameters array passed here.

	// For $registerCommand, Mountain's rpc.rs passes args[0] as id to handle_register_command,

	// which expects params: {"id": string}.
	// So, the call from shim should be proxy.$registerCommand([commandId])
	// and rpc.rs should construct the {"id": commandId} object.
	// OR, MainThreadCommandsHandler::registerCommand itself parses args[0] as the ID
	// and the handler in handlers/commands.rs expects `params: Value` where params is `{"id": id_from_args_0}`.
	// The provided rpc.rs for MainThreadCommandsHandler::registerCommand takes `args: Value` and then `args.get(0)` for id.
	// And `handlers/commands::handle_register_command` takes `params: Value` and expects `params.get("id")`.
	// This means rpc.rs layer must be constructing that object.
	// Let's assume the simplest: the proxy method matches what the *Rust MainThreadCommandsHandler method* expects as its direct `args: Value`.
	// This implies that the arguments passed to the proxy methods are already the `Value` that the Rust handler receives.
	// If proxy method signature is `proxy.$registerCommand(id: string)`, then RPCProtocol wraps it as `args: [string]`.
	// If Mountain's `MainThreadCommandsHandler::registerCommand` expects `args: Value` (which is `[string]`),

	// and then `handle_register_command` expects `params: Value` (which is `{"id": string}`),

	// then the `MainThreadCommandsHandler::registerCommand` must do the transformation from `[string]` to `{"id": string}`.
	// The provided rpc.rs `MainThreadCommandsHandler::registerCommand` does:
	// `let id = args.get(0).and_then(Value::as_str).ok_or("Missing command ID")?.to_string();`
	// `handlers::commands::handle_register_command(..., json!({ "id": id })).await`
	// This confirms the proxy call should be `proxy.$registerCommand([commandId])`.

	// [id]
	$registerCommand(args: [string]): Promise<void>;

	// [id]
	$unregisterCommand(args: [string]): Promise<void>;

	// For $executeCommand:
	// Proxy call: `proxy.$executeCommand({ id: commandId, args: rpcArgsPayload })`
	// Mountain's `MainThreadCommandsHandler::executeCommand` receives `args: Value` (this object).
	// It then passes this `Value` object directly to `handlers::commands::handle_execute_command(..., handler_params)`.
	$executeCommand(
		params: {
			id: string;

			args: any[] | SerializableObjectWithBuffers<any[]>;
		},

		retry?: boolean /* VS Code internal concept */,
	): Promise<any>;

	// For $getCommands:
	// Proxy call: `proxy.$getCommands()` or `proxy.$getCommands([filterOptions])`
	// Mountain's `MainThreadCommandsHandler::getCommands` receives `_args: Value`.
	// `handlers::commands::handle_get_commands` takes `_runtime:State<'_, Arc<AppRuntime>>` (no params from args).
	// No explicit filter argument based on Mountain's handler
	$getCommands(): Promise<string[]>;

	// Optional as it's a notification
	$fireCommandActivationEvent?(commandId: string): void;
}

// Shape for this ExtHostCommands service (methods called by Mountain)
interface CocoonExtHostCommandsShape {
	// Mountain's `handlers/commands.rs -> handle_execute_command` (for proxied) sends:
	// method: "commands_executeContributedCommand"
	// payload: { "id": proxied_cmd_id, "args": args }

	// So, this method needs to match that. `$executeContributedCommand(id, argsPayload)` is typical.
	// Where argsPayload is the `args` part.
	$executeContributedCommand(
		commandId: string,

		marshalledArgs: any,
	): Promise<any>;

	$getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}>;
}

// DTO for command metadata if it differs from ICommandMetadata for RPC
interface CommandMetadataDtoShim extends ICommandMetadata {
	// If there are specific serializable fields
}

interface CommandHandlerEntry {
	callback: Function;

	thisArg: any;

	metadata?: ICommandMetadata;

	extension?: IExtensionDescription;
}

// Local IDisposable if vscode.Disposable is not imported/used
interface ILocalDisposable {
	dispose(): void;
}

export class ShimExtHostCommands
	extends BaseCocoonShim
	implements CocoonExtHostCommandsShape
{
	public readonly _serviceBrand: undefined;

	readonly #proxy: MainThreadCommandsProxyServiceShape | null = null;

	readonly #commands = new Map<string, CommandHandlerEntry>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostCommands", rpcService, logService);

		this._log("Initializing commands shim...");

		if (this._rpcService) {
			this.#proxy = this._getProxy(
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsProxyServiceShape>,
			);
		}

		if (this.#proxy) this._log("MainThreadCommands RPC proxy obtained.");
		else
			this._logError(
				"MainThreadCommands RPC proxy NOT obtained. Command functionality will be impaired.",
			);

		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostCommands as ProxyIdentifier<CocoonExtHostCommandsShape>,

					this,
				);

				this._log(
					"Registered self for RPC calls from Mountain (ExtHostContext.ExtHostCommands).",
				);
			} catch (e: any) {
				this._logError("Failed to set self for RPC:", e);
			}
		} else {
			this._logError(
				"RPCService unavailable, cannot register self for incoming RPC calls.",
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
	): ILocalDisposable {
		this._logService?.trace(
			`Registering command: id='${commandId}', global=${options?.global ?? true}`,
		);

		if (!commandId.trim().length)
			throw new Error("Command id cannot be empty");

		if (this.#commands.has(commandId)) {
			this._logWarn(
				`Command '${commandId}' is already registered. Overwriting.`,
			);
		}

		this.#commands.set(commandId, {
			callback,

			thisArg,

			metadata: options?.metadata,

			extension: options?.extension,
		});

		// Default to global registration to inform Mountain
		const isGlobalCommand = options?.global ?? true;

		if (isGlobalCommand && this.#proxy) {
			// Mountain's MainThreadCommandsHandler::registerCommand expects `args: Value` where args[0] is the ID.
			// The handler `handlers/commands.rs::handle_register_command` then expects `params: {"id": id_from_args_0}`.
			// This transformation (array to object) must happen in Mountain's `MainThreadCommandsHandler::registerCommand`.
			// So Cocoon sends `[commandId]`.
			this.#proxy.$registerCommand([commandId]).catch((e) =>
				this._logError(
					`RPC $registerCommand for '${commandId}' failed:`,

					refineError(e, this._logService),
				),
			);
		} else if (isGlobalCommand && !this.#proxy) {
			this._logWarn(
				`Cannot globally register command '${commandId}': MainThread proxy unavailable.`,
			);
		}

		let isDisposed = false;

		return new extHostTypes.Disposable(() => {
			// Assuming extHostTypes.Disposable is available
			if (isDisposed) return;

			isDisposed = true;

			// A bit verbose
			// this._log(`Disposing registration for command '${commandId}'`);

			if (this.#commands.delete(commandId)) {
				// this._log(`Command '${commandId}' unregistered locally.`);

				if (isGlobalCommand && this.#proxy) {
					this.#proxy.$unregisterCommand([commandId]).catch((e) =>
						this._logError(
							`RPC $unregisterCommand for '${commandId}' failed:`,

							refineError(e, this._logService),
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
		// Can be verbose
		// this._logService?.trace('executeCommand:', commandId, args.length > 0 ? args : '');

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
			this._log(`Executing command '${commandId}' locally in Cocoon.`);

			// Notify main thread, fire-and-forget
			this.#proxy?.$fireCommandActivationEvent?.(commandId);

			return this._executeContributedCommandLocal<T>(
				commandId,

				args,

				false,
			);
		} else {
			this._log(
				`Command '${commandId}' not local. Proxying to Mountain...`,
			);

			if (!this.#proxy) {
				const errorMsg = `Cannot execute remote command '${commandId}': MainThreadCommands RPC proxy unavailable.`;

				this._logError(errorMsg);

				return Promise.reject(new Error(errorMsg));
			}

			// Argument marshalling for RPC:
			// Mountain's `handlers/commands.rs::handle_execute_command` expects params: {"id": string, "args": Value::Array}

			// We use BaseCocoonShim's _convertApiArgToInternal for each argument.
			// VS Code's SerializableObjectWithBuffers is for when actual binary buffers need to cross RPC.
			// For simple JSON-compatible args, direct array is fine.
			let hasBuffers = false;

			const marshalledIndividualArgs = args.map((arg) => {
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
				}

				return converted;
			});

			const rpcArgsForMountain = hasBuffers
				? new SerializableObjectWithBuffers(marshalledIndividualArgs)
				: marshalledIndividualArgs;

			const rpcParams = { id: commandId, args: rpcArgsForMountain };

			try {
				const result = await this.#proxy.$executeCommand(
					rpcParams,

					retry,
				);

				// this._log(`Remote command '${commandId}' executed. Reviving result...`);

				return this._reviveApiArgument(result);
			} catch (e: any) {
				if (
					e instanceof Error &&
					e.message === "$executeCommand:retry" &&
					retry
				) {
					// VS Code internal retry signal
					this._log(
						`Retrying command '${commandId}' as requested by Mountain.`,
					);

					return this._doExecuteCommand<T>(
						commandId,

						args,

						false /* no more retries */,
					);
				}

				const refined = refineError(
					e,

					this._logService,

					`executeRemoteCmd(${commandId})`,
				);

				this._logError(
					`Error executing remote command '${commandId}':`,

					refined,
				);

				throw refined;
			}
		}
	}

	private async _executeContributedCommandLocal<T = unknown>(
		commandId: string,

		args: any[],

		annotateErrorSource: boolean,
	): Promise<T> {
		const commandReg = this.#commands.get(commandId);

		if (!commandReg)
			throw new Error(
				`Local command '${commandId}' handler disappeared unexpectedly.`,
			);

		const { callback, thisArg, metadata, extension } = commandReg;

		// TODO: Implement argument validation against metadata.args if structure is defined and provided.

		try {
			return await callback.apply(thisArg, args);
		} catch (err: any) {
			if (!isCancellationError(err)) {
				this._logError(
					`Error during local execution of command '${commandId}' (ext: ${extension?.identifier.value || "unknown"}):`,

					err,
				);
			}

			// TODO: For fuller VS Code fidelity, wrap error with source extension info (CommandError from original)
			// and report telemetry via IExtHostTelemetry.
			throw err;
		}
	}

	// --- RPC Methods called BY Mountain (CocoonExtHostCommandsShape) ---
	public async $executeContributedCommand(
		commandId: string,

		marshalledArgsFromMain: any,
	): Promise<any> {
		this._logService?.trace(
			`RPC $executeContributedCommand: id='${commandId}' from Mountain.`,
		);

		const cmdHandler = this.#commands.get(commandId);

		if (!cmdHandler) {
			const errMsg = `RPC $executeContributedCommand: Command '${commandId}' not found in Cocoon.`;

			this._logError(errMsg);

			// Important to reject for RPC error handling
			return Promise.reject(new Error(errMsg));
		}

		// `marshalledArgsFromMain` is the "args" array from Mountain's request payload.
		// It needs revival.
		let revivedArgs = this._reviveApiArgument(marshalledArgsFromMain);

		if (!Array.isArray(revivedArgs)) {
			// Ensure it's an array for .apply()
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

	public async getCommands(
		filterUnderscoreCommands = false,
	): Promise<string[]> {
		// API method
		// this._logService?.trace('getCommands (API call)');

		// Mountain's `handlers/commands.rs::handle_get_commands` doesn't take filter.
		// Filter is applied client-side after merging.
		const remoteCommands = (await this.#proxy?.$getCommands()) || [];

		const localCommands = Array.from(this.#commands.keys());

		let allCommands = [...new Set([...remoteCommands, ...localCommands])];

		if (filterUnderscoreCommands) {
			allCommands = allCommands.filter(
				(command) => !command.startsWith("_"),
			);
		}

		return allCommands.sort();
	}

	public async $getContributedCommandMetadata(): Promise<{
		[id: string]: CommandMetadataDtoShim;
	}> {
		// this._log("RPC $getContributedCommandMetadata: Providing metadata for Cocoon-registered commands.");

		const allMetadata: { [id: string]: CommandMetadataDtoShim } = {};

		for (const [id, commandReg] of this.#commands) {
			// Provide metadata if available, otherwise a minimal descriptor.
			allMetadata[id] =
				commandReg.metadata ||
				({
					description: `Command '${id}' registered in Cocoon.`,
				} as CommandMetadataDtoShim);
		}

		return allMetadata;
	}
}
