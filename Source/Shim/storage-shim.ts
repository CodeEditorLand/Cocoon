/*---------------------------------------------------------------------------------------------
 * Cocoon Storage (Memento) Shim (shims/storage-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.Memento` API (`IExtHostStorage`) for extensions in Cocoon.
 * Provides the `ExtensionContext.globalState` and `ExtensionContext.workspaceState`
 * key-value storage, proxying operations to Mountain for persistence.
 *
 * Responsibilities:
 * - `ShimExtHostStorage` Service:
 *   - Implements `createMemento(id, global)` which returns a `ShimMementoImpl` instance.
 * - `ShimMementoImpl` Class:
 *   - Implements the `vscode.Memento` interface (`get`, `update`, `keys`).
 *   - Proxies `get(key)` calls to Mountain (`$getValue` RPC on `MainThreadStorage`),
 *
 *
 *     passing the extension ID (used implicitly by Mountain) and scope (Global/Workspace).
 *   - Proxies `update(key, value)` calls to Mountain (`$setValue` RPC), handling `null`/`undefined`
 *     values for key deletion.
 *   - `keys()` method is typically stubbed or requires a dedicated RPC call.
 *   - Provides `whenReady` promise (resolves immediately in shim).
 *
 * Key Interactions:
 * - Provides `vscode.Memento` instances (used for `ExtensionContext.globalState`, etc.).
 * - Interacts with `RPCProtocol` via `this._rpcService.getProxy(MainContext.MainThreadStorage)`.
 * - Relies on Mountain handlers (`handlers/storage.rs`) for actual data storage, retrieval,
 *
 *
 *   and persistence logic.
 *--------------------------------------------------------------------------------------------*/

// Protocol identifiers
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// Assuming Memento interface from 'vscode' API
import { Memento } from "vscode";

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// Define the MementoScope enum based on VS Code's internal usage (if not directly available)
enum MementoScope {
	// Typically maps to Profile. tidigare WORKSPACE
	WORKSPACE = 0,

	// New name for WORKSPACE scope
	PROFILE = 0,

	// Typically maps to Global. tidigare GLOBAL
	APPLICATION = 1,
}

// Note: VS Code has evolved Memento scopes. `APPLICATION` (global) and `PROFILE` (workspace/profile specific).
// The original shim used 0 for Workspace, 1 for Global. We'll map `global: boolean` to these.

// Define the shape of MainThreadStorage RPC proxy
interface MainThreadStorageShape {
	$getValue<T>(target: {
		scope: MementoScope;

		key: string;
	}): Promise<T | undefined>;

	$setValue(
		target: { scope: MementoScope; key: string },

		value: any,
	): Promise<void>;

	// Optional
	// $initialize?(): Promise<void>;

	// Optional
	// $optimize?(): Promise<void>;

	// If keys() is implemented
	// $keys?(target: { scope: MementoScope }): Promise<string[]>;
}

// Define IExtHostStorage interface (from VS Code's extHostStorage.ts)
export interface IExtHostStorage {
	readonly _serviceBrand: undefined;

	// Returns vscode.Memento
	createMemento(id: string, global: boolean): Memento;

	// Optional
	initialize?(): Promise<void>;

	// Optional
	optimize?(): Promise<void>;
}

class ShimMementoImpl implements Memento {
	readonly #scope: MementoScope;

	// ID of the extension this memento belongs to
	readonly #extensionId: string;

	readonly #mainThreadStorageProxy: MainThreadStorageShape | null;

	readonly #logService?: ILogService;

	// Kept for API compatibility, resolves immediately
	readonly #whenReadyPromise: Promise<void>;

	constructor(
		id: string,

		global: boolean,

		mainThreadStorageProxy: MainThreadStorageShape | null,

		logService?: ILogService,
	) {
		this.#extensionId = id;

		// Map boolean to enum
		this.#scope = global ? MementoScope.APPLICATION : MementoScope.PROFILE;

		this.#mainThreadStorageProxy = mainThreadStorageProxy;

		this.#logService = logService;

		// Ready immediately for shim
		this.#whenReadyPromise = Promise.resolve();

		this._log(`Memento created (Scope: ${MementoScope[this.#scope]})`);
	}

	private _log(message: string, ...args: any[]): void {
		this.#logService?.trace(
			`[Memento Shim][${this.#extensionId}][${MementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	private _logError(message: string, ...args: any[]): void {
		this.#logService?.error(
			`[Memento Shim][${this.#extensionId}][${MementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	private _logWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[Memento Shim][${this.#extensionId}][${MementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	get whenReady(): Promise<void> {
		return this.#whenReadyPromise;
	}

	public get<T>(key: string): T | undefined;

	public get<T>(key: string, defaultValue: T): T;

	public get<T>(key: string, defaultValue?: T): T | undefined {
		if (key === null || key === undefined) {
			this._logError(`Invalid key provided to Memento.get: ${key}`);

			// To match Memento behavior, which would likely return defaultValue or undefined
			return defaultValue;
		}

		const storageKey = String(key);

		this._log(`get: key='${storageKey}'`);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot Memento.get key='${storageKey}', RPC proxy unavailable.`,
			);

			return defaultValue;
		}

		return this.#mainThreadStorageProxy
			.$getValue<{ scope: MementoScope; key: string }, T>({
				scope: this.#scope,

				key: storageKey,
			})
			.then((resultValue) => {
				if (resultValue === undefined) {
					// $getValue should return undefined if not found
					this._log(
						`get: key='${storageKey}' not found, returning default.`,
					);

					return defaultValue;
				}

				this._log(`get: key='${storageKey}' returned value.`);

				return resultValue;
			})
			.catch((err: any) => {
				this._logError(`get: Error fetching key='${storageKey}':`, err);

				return defaultValue;
			});
	}

	public async update(key: string, value: any): Promise<void> {
		if (key === null || key === undefined) {
			const errorMsg = `Invalid key provided to Memento.update: ${key}`;

			this._logError(errorMsg);

			return Promise.reject(new Error(errorMsg));
		}

		const storageKey = String(key);

		// Value can be undefined to delete the key as per Memento API
		if (value !== undefined) {
			try {
				// Basic serializability check
				JSON.stringify(value);
			} catch (e: any) {
				const errorMsg = `Value for key '${storageKey}' is not JSON serializable`;

				this._logError(errorMsg, value, e);

				return Promise.reject(new Error(`${errorMsg}: ${e.message}`));
			}
		}

		this._log(
			`update: key='${storageKey}' with value (type: ${typeof value})`,
		);

		if (!this.#mainThreadStorageProxy) {
			const errorMsg = `Cannot Memento.update key='${storageKey}', RPC proxy unavailable.`;

			this._logError(errorMsg);

			return Promise.reject(new Error(errorMsg));
		}

		try {
			await this.#mainThreadStorageProxy.$setValue(
				{ scope: this.#scope, key: storageKey },

				value,
			);

			this._log(`update: key='${storageKey}' successful.`);
		} catch (err: any) {
			this._logError(`update: Error setting key='${storageKey}':`, err);

			// Rethrow to signal failure
			throw err;
		}
	}

	public async keys(): Promise<readonly string[]> {
		this._logWarn(
			"Memento.keys() not robustly implemented in shim, returning empty array.",
		);

		// if (this.#mainThreadStorageProxy?.$keys) {

		//     try {

		//         return await this.#mainThreadStorageProxy.$keys({ scope: this.#scope });

		//     } catch (err: any) {

		//         this._logError("Memento.keys() RPC failed:", err);

		//         return [];

		//     }

		// }

		return [];
	}

	// Memento interface in vscode.d.ts might not have setKeysForSync.
	// This was in the original JS shim. If it's part of an internal interface, keep it.
	public setKeysForSync(keys: readonly string[]): void {
		this._logWarn(
			`Memento.setKeysForSync([${keys.join(", ")}]) not implemented in shim.`,
		);

		// Relates to VS Code's settings sync, likely NOP for Cocoon MVP.
	}
}

export class ShimExtHostStorage
	extends BaseCocoonShim
	implements IExtHostStorage
{
	public readonly _serviceBrand: undefined;

	#mainThreadStorageProxy: MainThreadStorageShape | null = null;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostStorage", rpcService, logService);

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadStorageProxy = this._getProxy(
				MainContext.MainThreadStorage as ProxyIdentifier<MainThreadStorageShape>,
			);
		}

		if (this.#mainThreadStorageProxy) {
			this._log("MainThreadStorage RPC proxy obtained.");
		} else {
			// Error logged by _getProxy or if rpcService is undefined
			this._logError(
				"Failed to get MainThreadStorage RPC proxy! Memento functionality will be impaired.",
			);
		}
	}

	public createMemento(id: string, global: boolean): Memento {
		this._log(`Creating Memento for id='${id}', global=${global}`);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot create Memento for '${id}', RPC proxy unavailable. Critical feature impaired.`,
			);

			// Returning a NOP Memento or throwing might be options.
			// For robustness, a NOP Memento that logs errors could be returned.
			// However, throwing makes the issue apparent earlier.
			throw new Error(
				"Cannot create Memento: MainThreadStorage RPC proxy is unavailable.",
			);
		}

		return new ShimMementoImpl(
			id,

			global,

			this.#mainThreadStorageProxy,

			this._logService,
		);
	}

	public async initialize(): Promise<void> {
		this._log(
			"initialize() called (No-op in current shim, could call $initialize on MainThreadStorage).",
		);

		// if (this.#mainThreadStorageProxy?.$initialize) {

		//     await this.#mainThreadStorageProxy.$initialize();

		// }

		return Promise.resolve();
	}

	public async optimize(): Promise<void> {
		this._log(
			"optimize() called (No-op in current shim, could call $optimize on MainThreadStorage).",
		);

		// if (this.#mainThreadStorageProxy?.$optimize) {

		//     await this.#mainThreadStorageProxy.$optimize();

		// }

		return Promise.resolve();
	}
}

// Class is already exported
// export { ShimExtHostStorage };
