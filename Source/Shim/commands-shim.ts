/*---------------------------------------------------------------------------------------------
 * Cocoon Command Shim (shims/commands-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.commands` API (`IExtHostCommands`) for extensions running in Cocoon.
 * It handles both registering commands implemented within Cocoon and executing commands
 * (which might be implemented in Cocoon, natively in Mountain, or in other extensions).
 *
 * Responsibilities:
 * - `registerCommand`: Stores the command callback locally (`#registeredCommands`). Notifies
 *   Mountain (`$registerCommand` RPC) so the command ID is globally known. Returns a disposable
 *   that calls `$unregisterCommand` RPC on dispose.
 * - `executeCommand`:
 *   - Checks if the command is registered locally in *this* Cocoon instance.
 *   - If local: Executes the callback directly.
 *   - If not local: Proxies the execution request (`$executeCommand` RPC) to Mountain's
 *     `MainThreadCommands` handler, which then routes it appropriately (native execution
 *     or potentially back to this/another sidecar).
 * - Implementing the RPC methods called *by* Mountain:
 *   - `$executeContributedCommand`: Called by Mountain to execute a command that was
 *     originally registered by *this* Cocoon instance. Finds and runs the local callback.
 *   - `$getContributedCommandMetadata`: Returns metadata about locally registered commands.
 * - Argument/Result Handling: Uses marshalling helpers (`_convertApiArgToInternal`,
 *
 *
 *   `_reviveApiArgument`) for data crossing the RPC boundary.
 *
 * Key Interactions:
 * - Provides the `vscode.commands` API surface.
 * - Interacts with the `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadCommands)`.
 * - Registers itself via `rpcService.set(ExtHostContext.ExtHostCommands, this)` to handle incoming RPC calls.
 * - Manages local command registration state (`#registeredCommands`).
 *--------------------------------------------------------------------------------------------*/

// For argument conversion (used by BaseCocoonShim)
// import { MarshalledId } from "vs/base/common/marshallingIds";

// For argument revival (needs bundling, used by BaseCocoonShim)
// import { revive } from "vs/base/common/marshalling";

import {
	ExtHostContext,
	MainContext,
	// Protocol identifiers
} from "vs/workbench/api/common/extHost.protocol";

// Assume URI shim/class exists
// Assuming this is a class or interface
import { Uri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// Assuming these are ProxyIdentifier constants

// Define shapes for RPC proxies based on usage
interface MainThreadCommandsShape {
	$registerCommand(id: string): Promise<void>;

	$unregisterCommand(id: string): Promise<void>;

	$executeCommand(id: string, args: any[]): Promise<any>;

	$getCommands(filterUnderscoreCommands: boolean): Promise<string[]>;

	// Add other methods if $notifyMountain uses them
	[methodName: string]: ((...args: any[]) => Promise<any>) | undefined;
}

interface ExtHostCommandsShape {
	$executeContributedCommand(id: string, ...args: any[]): Promise<any>;

	$getContributedCommandMetadata(): Promise<{ [commandId: string]: any }>;
}

interface RegisteredCommandEntry {
	callback: (...args: any[]) => any;

	thisArg: any;

	// Placeholder as it's not used yet
	metadata?: any;
}

// Interface for VS Code's Disposable
interface IDisposable {
	dispose(): void;
}

export class ShimExtHostCommands
	extends BaseCocoonShim
	implements ExtHostCommandsShape
{
	// Required by VS Code type system
	public readonly _serviceBrand: undefined;

	// Proxy to Mountain's MainThreadCommands service
	#mainThreadCommandsProxy: MainThreadCommandsShape | null = null;

	// Key: commandId, Value: { callback, thisArg, metadata? }

	#registeredCommands = new Map<string, RegisteredCommandEntry>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostCommands", rpcService, logService);

		this._log("Initializing...");

		// --- Obtain RPC Proxy to Main Thread ---
		if (this._rpcService) {
			try {
				this.#mainThreadCommandsProxy = this._getProxy(
					MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsShape>,
				);

				if (this.#mainThreadCommandsProxy) {
					this._log("MainThreadCommands RPC proxy obtained.");
				} else {
					// _getProxy logs the error if it returns null
					this._logError(
						"Failed to get MainThreadCommands RPC proxy! Proxy is null.",
					);
				}
			} catch (e: any) {
				this._logError(
					"Exception when trying to get MainThreadCommands RPC proxy!",

					e,
				);

				this.#mainThreadCommandsProxy = null;
			}
		} else {
			this._logError(
				"RPCService is not available, cannot get MainThreadCommands proxy.",
			);
		}

		// --- Register Self with RPC for Incoming Calls ---
		if (this._rpcService) {
			try {
				this._rpcService.set(
					ExtHostContext.ExtHostCommands as ProxyIdentifier<ExtHostCommandsShape>,

					this,
				);

				this._log(
					"Set local instance for incoming RPC calls (ExtHostContext.ExtHostCommands).",
				);
			} catch (e: any) {
				this._logError(
					"Failed to set local instance for incoming RPC calls:",

					e,
				);
			}
		} else {
			this._logError(
				"RPCService is not available, cannot set local instance for incoming RPC.",
			);
		}
	}

	// --- Public API Implementation (vscode.commands) ---

	public registerCommand(
		// Retained parameter though marked as "Unused by shim" in JS
		global: boolean,

		id: string,

		callback: (...args: any[]) => any,

		// metadata - not used yet
		thisArg?: any,
	): IDisposable {
		if (!id) {
			this._logError("Attempted to register command with empty ID.");

			// NOP disposable
			return { dispose: () => {} };
		}

		this._log(`Registering command: id='${id}', global=${!!global}`);

		if (this.#registeredCommands.has(id)) {
			this._logWarn(
				`Command '${id}' is already registered. Overwriting previous registration.`,
			);
		}

		this.#registeredCommands.set(id, { callback, thisArg });

		if (global && this.#mainThreadCommandsProxy) {
			this.#mainThreadCommandsProxy.$registerCommand(id).catch((e: any) =>
				this._logError(
					`Failed to notify Mountain of command registration '${id}':`,

					e,
				),
			);
		} else if (global && !this.#mainThreadCommandsProxy) {
			this._logWarn(
				`Cannot notify Mountain of global command registration '${id}': RPC proxy unavailable.`,
			);
		}

		let isDisposed = false;

		return {
			dispose: () => {
				if (isDisposed) return;

				isDisposed = true;

				this._log(`Dispose registration requested for '${id}'`);

				if (this.#registeredCommands.delete(id)) {
					if (global && this.#mainThreadCommandsProxy) {
						this.#mainThreadCommandsProxy
							.$unregisterCommand(id)
							.catch((e: any) =>
								this._logError(
									`Failed to notify Mountain of command unregistration '${id}':`,

									e,
								),
							);
					} else if (global && !this.#mainThreadCommandsProxy) {
						this._logWarn(
							`Cannot notify Mountain of global command unregistration '${id}': RPC proxy unavailable.`,
						);
					}
				}
			},
		};
	}

	public async executeCommand<T = any>(
		id: string,

		...args: any[]
	): Promise<T> {
		if (!id) {
			this._logError("executeCommand called with empty ID.");

			return Promise.reject(new Error("Command ID cannot be empty."));
		}

		this._log(`executeCommand: id='${id}'`);

		if (this.#registeredCommands.has(id)) {
			this._log(`Executing command '${id}' locally.`);

			return this._executeRegisteredCommandLocally(id, args);
		} else {
			this._log(
				`Command '${id}' not local. Proxying execution to Mountain...`,
			);

			if (!this.#mainThreadCommandsProxy) {
				const errorMsg = `Cannot execute command '${id}': MainThreadCommands RPC proxy unavailable.`;

				this._logError(errorMsg);

				return Promise.reject(new Error(errorMsg));
			}

			// Use inherited _convertApiArgToInternal from BaseCocoonShim
			const internalArgs = args.map((arg) =>
				this._convertApiArgToInternal(arg),
			);

			try {
				const result =
					await this.#mainThreadCommandsProxy.$executeCommand(
						id,

						internalArgs,
					);

				this._log(
					`Command '${id}' executed via Mountain. Reviving result...`,
				);

				// Use inherited _reviveApiArgument from BaseCocoonShim
				return this._reviveApiArgument(result);
			} catch (error: any) {
				this._logError(
					`Error executing command '${id}' via Mountain RPC:`,

					error,
				);

				// Rethrow the error to the original caller
				throw error;
			}
		}
	}

	public async getCommands(
		filterUnderscoreCommands: boolean = false,
	): Promise<string[]> {
		this._log("getCommands requesting from Mountain...");

		let mountainCommands: string[] = [];

		if (this.#mainThreadCommandsProxy) {
			try {
				const result = await this.#mainThreadCommandsProxy.$getCommands(
					filterUnderscoreCommands,
				);

				mountainCommands = Array.isArray(result) ? result : [];
			} catch (error: any) {
				this._logError(
					"Failed to get commands from Mountain via RPC:",

					error,
				);

				// Use empty list on error
				mountainCommands = [];
			}
		} else {
			this._logWarn(
				"Cannot get commands from Mountain: RPC proxy unavailable.",
			);
		}

		const localCommands = Array.from(this.#registeredCommands.keys());

		const allCommands = new Set([...mountainCommands, ...localCommands]);

		let result = Array.from(allCommands);

		if (filterUnderscoreCommands) {
			result = result.filter((cmdId) => !cmdId.startsWith("_"));
		}

		return result.sort();
	}

	// --- RPC Methods called BY Mountain ---

	public async $executeContributedCommand(
		id: string,

		...args: any[]
	): Promise<any> {
		this._log(
			`Received RPC request from Mountain to execute local command '${id}'`,
		);

		// Use inherited _reviveApiArgument from BaseCocoonShim
		const revivedArgs = args.map((arg) => this._reviveApiArgument(arg));

		return this._executeRegisteredCommandLocally(id, revivedArgs);
	}

	public async $getContributedCommandMetadata(): Promise<{
		[commandId: string]: any;
	}> {
		this._log(
			"Received RPC request from Mountain for contributed command metadata",
		);

		const metadata: { [commandId: string]: any } = {};

		for (const id of this.#registeredCommands.keys()) {
			// TODO: Extract metadata if stored during registerCommand
			metadata[id] = {
				/* title, category etc. - empty for now */
			};
		}

		return metadata;
	}

	// --- Internal Helper Methods ---

	protected async _executeRegisteredCommandLocally(
		commandId: string,

		args: any[],
	): Promise<any> {
		const command = this.#registeredCommands.get(commandId);

		if (!command) {
			const errorMsg = `Command '${commandId}' registration unexpectedly missing locally.`;

			this._logError(errorMsg);

			throw new Error(errorMsg);
		}

		const { callback, thisArg } = command;

		try {
			this._log(`Executing local callback for '${commandId}'...`);

			const result = await Promise.resolve(callback.apply(thisArg, args));

			this._log(
				`Local callback for '${commandId}' executed successfully.`,
			);

			return result;
		} catch (err: any) {
			this._logError(
				`Error executing local command callback '${commandId}':`,

				err,
			);

			// this._notifyMountain('commandExecutionError', { commandId, error: { message: err.message, stack: err.stack } });

			throw err;
		}
	}

	// _convertApiArgToInternal and _reviveApiArgument are inherited from BaseCocoonShim
	// and should be used directly. The versions previously in commands-shim.js
	// were less comprehensive or redundant.

	protected _notifyMountain(method: string, params: any): void {
		if (this.#mainThreadCommandsProxy) {
			const rpcMethod = `$${method}`;

			const proxyMethod = this.#mainThreadCommandsProxy[rpcMethod];

			if (typeof proxyMethod === "function") {
				proxyMethod(params).catch((e: any) =>
					this._logError(
						`Failed to send notification '${method}' to Mountain:`,

						e,
					),
				);
			} else {
				this._logWarn(
					`RPC method '${rpcMethod}' not found on MainThreadCommands proxy for notification.`,
				);
			}
		} else {
			this._logWarn(
				`Cannot send notification '${method}': RPC proxy unavailable.`,
			);
		}
	}
}

// Original JS export
// module.exports = { ShimExtHostCommands };

// In TS, `export class ShimExtHostCommands` handles the export.
