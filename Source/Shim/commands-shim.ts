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
 *   `_reviveApiArgument`) from `BaseCocoonShim` for data crossing the RPC boundary.
 *
 * Key Interactions:
 * - Provides the `vscode.commands` API surface.
 * - Interacts with the `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadCommands)`.
 * - Registers itself via `rpcService.set(ExtHostContext.ExtHostCommands, this)` to handle incoming RPC calls.
 * - Manages local command registration state (`#registeredCommands`).
 *--------------------------------------------------------------------------------------------*/

// Uri is only used by the overridden _convertApiArgToInternal in the original JS,

// which is now removed in favor of the base shim's version. So, Uri import might not be strictly needed here anymore
// unless it's part of a command's arguments or results directly handled by this shim.
// import { Uri } from "../Shim/out/vscode";

// MarshalledId and revive are handled by BaseCocoonShim.
// import { MarshalledId } from "vs/base/common/marshallingIds";

// import { revive } from "vs/base/common/marshalling";

import {
	ExtHostContext,
	MainContext,
	// TODO: Consider importing specific DTO/shape types from extHost.protocol if they exist,
	// instead of relying on `any` or defining local shapes for RPC.
} from "vs/workbench/api/common/extHost.protocol";

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// Assuming these are ProxyIdentifier constants

// --- Type Definitions ---

// Shape for the MainThreadCommands RPC proxy
// TODO: This should ideally be part of a shared protocol definition file (e.g., extHost.protocol.d.ts)
interface MainThreadCommandsShape {
	$registerCommand(id: string): Promise<void>;

	$unregisterCommand(id: string): Promise<void>;

	$executeCommand(
		id: string,

		args: any[],

		CancellationToken?: any /* Not used in current shim */,

		// Add CancellationToken if protocol supports
	): Promise<any>;

	$getCommands(filterUnderscoreCommands: boolean): Promise<string[]>;

	// For _notifyMountain, if specific notification methods exist on the proxy
	[methodName: string]: ((...args: any[]) => Promise<any> | void) | undefined;
}

// Shape for the ExtHostCommands service itself (methods called by Mountain)
// TODO: This should align with `ExtHostCommandsShape` in VS Code's `extHost.protocol.ts`
interface ExtHostCommandsShape {
	$executeContributedCommand(id: string, ...args: any[]): Promise<any>;

	$getContributedCommandMetadata(): Promise<{
		[commandId: string]: CommandMetadataDto;

		// Using a DTO for metadata
	}>;
}

interface CommandMetadataDto {
	// Example, actual structure depends on protocol
	title?: string;

	category?: string;

	// Other metadata properties
}

interface RegisteredCommandEntry {
	// The command handler function
	callback: (...args: any[]) => any;

	// The `this` context for the handler
	thisArg?: any;

	// Store revived metadata if provided during registration
	metadata?: CommandMetadataDto;
}

// Interface for VS Code's Disposable
interface IDisposable {
	dispose(): void;
}

export class ShimExtHostCommands
	extends BaseCocoonShim
	implements ExtHostCommandsShape
{
	public readonly _serviceBrand: undefined;

	readonly #mainThreadCommandsProxy: MainThreadCommandsShape | null = null;

	readonly #registeredCommands = new Map<string, RegisteredCommandEntry>();

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostCommands", rpcService, logService);

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadCommandsProxy = this._getProxy(
				// TODO: Ensure MainContext.MainThreadCommands is correctly typed or cast.
				MainContext.MainThreadCommands as ProxyIdentifier<MainThreadCommandsShape>,
			);

			if (this.#mainThreadCommandsProxy) {
				this._log("MainThreadCommands RPC proxy obtained.");
			}

			// Error logged by _getProxy if it returns null
		}

		if (this._rpcService) {
			try {
				this._rpcService.set(
					// TODO: Ensure ExtHostContext.ExtHostCommands is correctly typed or cast.
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
				"RPCService is not available, cannot set local ExtHostCommands instance for RPC.",
			);
		}
	}

	public registerCommand(
		// Original JS: "Unused by shim, registration scope determined by notification."
		global: boolean,

		id: string,

		callback: (...args: any[]) => any,

		thisArg?: any,

		// TODO: Add metadata parameter if `vscode.commands.registerCommand` supports it and it should be proxied.
		// metadata?: CommandMetadataDto
	): IDisposable {
		if (!id) {
			this._logError("Attempted to register command with empty ID.");

			// VS Code throws: new Error('Command id cannot be empty');

			// Return NOP disposable to avoid breaking callers expecting a disposable.
			return { dispose: () => {} };
		}

		this._log(`Registering command: id='${id}', global=${!!global}`);

		if (this.#registeredCommands.has(id)) {
			this._logWarn(
				`Command '${id}' is already registered. Overwriting previous registration.`,
			);
		}

		this.#registeredCommands.set(id, { callback, thisArg /*, metadata */ });

		// The `global` parameter's meaning in shim context:
		// If true, notify Mountain. This implies Mountain uses this to know if a command
		// can be listed in the command palette or triggered by keybindings not originating from this extension host.
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
					this._log(`Command '${id}' unregistered locally.`);

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
				} else {
					this._logWarn(
						`Command '${id}' not found for unregistration.`,
					);
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

		this._log(`executeCommand: id='${id}', argsCount=${args.length}`);

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

			// Using inherited marshalling from BaseCocoonShim
			const internalArgs = args.map((arg) =>
				this._convertApiArgToInternal(arg),
			);

			try {
				// TODO: Pass CancellationToken if supported by protocol and available
				const result =
					await this.#mainThreadCommandsProxy.$executeCommand(
						id,

						internalArgs,
					);

				this._log(
					`Command '${id}' executed via Mountain. Reviving result...`,
				);

				// Using inherited revival
				return this._reviveApiArgument(result);
			} catch (error: any) {
				// BaseCocoonShim's refineError can be used here if errors from RPC are structured JSON
				const refinedError =
					error instanceof Error
						? refineError(
								error,

								this._logService,

								`executeCommand(${id})`,
							)
						: new Error(String(error));

				this._logError(
					`Error executing command '${id}' via Mountain RPC:`,

					refinedError,
				);

				throw refinedError;
			}
		}
	}

	public async getCommands(
		filterUnderscoreCommands: boolean = false,
	): Promise<string[]> {
		this._log(
			`getCommands(filterUnderscore=${filterUnderscoreCommands}) requesting from Mountain...`,
		);

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

				mountainCommands = [];
			}
		} else {
			this._logWarn(
				"Cannot get commands from Mountain: RPC proxy unavailable.",
			);
		}

		const localCommands = Array.from(this.#registeredCommands.keys());

		const allCommands = new Set<string>([
			...mountainCommands,

			...localCommands,
		]);

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
			`Received RPC request from Mountain to execute local command '${id}' with ${args.length} args.`,
		);

		// Using inherited revival from BaseCocoonShim
		const revivedArgs = args.map((arg) => this._reviveApiArgument(arg));

		return this._executeRegisteredCommandLocally(id, revivedArgs);
	}

	public async $getContributedCommandMetadata(): Promise<{
		[commandId: string]: CommandMetadataDto;
	}> {
		this._log(
			"Received RPC request from Mountain for contributed command metadata.",
		);

		const allMetadata: { [commandId: string]: CommandMetadataDto } = {};

		for (const [id, registration] of this.#registeredCommands) {
			// TODO: Ensure `registration.metadata` is populated if vscode.commands.registerCommand
			// is extended to accept and store metadata.
			allMetadata[id] = registration.metadata || {};
		}

		return allMetadata;
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

			// This aligns with VS Code behavior: if a command is found then disappears, it's an error.
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
			// TODO: Consider if errors from command execution should be reported to Mountain
			// via a specific notification, or if simply letting the RPC call fail is sufficient.
			// const refinedError = err instanceof Error ? refineError(err, this._logService, `localCmdExec(${commandId})`) : new Error(String(err));

			this._logError(
				`Error executing local command callback '${commandId}':`,

				err,
			);

			// Rethrow to be caught by the caller (either local executeCommand or RPC handler)
			throw err;
		}
	}

	// _convertApiArgToInternal and _reviveApiArgument are inherited from BaseCocoonShim.
	// The specific versions in the original commands-shim.js were removed.

	// This method was for generic notifications to Mountain via RPC.
	// It's kept for conceptual completeness but might be better replaced by specific proxy method calls.
	protected _notifyMountain(method: string, params: any): void {
		if (this.#mainThreadCommandsProxy) {
			// VS Code convention for main thread methods
			const rpcMethodName = `$${method}`;

			const proxyMethod = this.#mainThreadCommandsProxy[rpcMethodName];

			if (typeof proxyMethod === "function") {
				// Assuming notifications are fire-and-forget, so not awaiting Promise if it returns one.
				try {
					// Explicitly cast to Function
					(proxyMethod as Function)(params);
				} catch (e: any) {
					this._logError(
						`Error synchronously calling notification method '${rpcMethodName}' on proxy:`,

						e,
					);
				}
			} else {
				this._logWarn(
					`RPC method '${rpcMethodName}' not found on MainThreadCommands proxy for notification.`,
				);
			}
		} else {
			this._logWarn(
				`Cannot send notification '${method}': RPC proxy unavailable.`,
			);
		}
	}
}

// --- END OF FILE commands-shim.ts ---
