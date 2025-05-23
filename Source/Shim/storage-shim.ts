/*---------------------------------------------------------------------------------------------
 * Cocoon Storage (Memento) Shim (storage-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.Memento` API (via `IExtHostStorage` service) for extensions
 * running in Cocoon. Provides `ExtensionContext.globalState` and
 * `ExtensionContext.workspaceState` key-value storage by proxying operations to
 * Mountain for persistence.
 *
 * Responsibilities:
 * - `ShimExtHostStorage`:
 *   - Implements `IExtHostStorage`.
 *   - `createMemento(id, global)`: Returns a `ShimMementoImpl` instance, scoped appropriately.
 * - `ShimMementoImpl`:
 *   - Implements `vscode.Memento`.
 *   - Proxies `get(key)`, `update(key, value)`, and potentially `keys()` to Mountain's
 *     `MainThreadStorage` service via RPC.
 *   - Handles `null`/`undefined` values for key deletion in `update`.
 *   - Provides `whenReady` promise (resolves immediately in this shim, as data is fetched on demand).
 *
 * Key Interactions:
 * - Provides `vscode.Memento` instances for `ExtensionContext`.
 * - Interacts with `RPCProtocol` via `this._getProxy(MainContext.MainThreadStorage)`.
 * - Relies on Mountain's storage handlers for data persistence.
 *--------------------------------------------------------------------------------------------*/

import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// TODO: Ensure VscodeMemento is correctly imported or defined if 'vscode' types are not globally available.
// For VS Code internal IExtHostStorage:
import {
	MementoUpdateArguments,
	type MementoKeysOptions,
	type IExtHostStorage as VscodeIExtHostStorage,
} from "vs/workbench/api/common/extHostStorage";
// Use vscode.Memento interface from the API
import type { Memento as VscodeMemento } from "vscode";

import {
	BaseCocoonShim,
	refineError,
	type IExtHostRpcService,
	type ILogService,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

// VS Code's internal MementoScope enum. Ensure this matches.
// These values are used in RPC calls to MainThreadStorage.
enum InternalMementoScope {
	// Workspace or Profile-specific
	PROFILE = 0,

	// Global/Application-wide
	APPLICATION = 1,
}

// Note: The original shim used 0 for Workspace, 1 for Global.
// VS Code has evolved to Profile (0) and Application (1). This mapping is important.

// Shape of MainThreadStorage RPC proxy
// TODO: This MUST align with the actual MainThreadStorage service in Mountain.
interface MainThreadStorageShape {
	$getValue<T>(target: {
		scope: InternalMementoScope;

		key: string;
	}): Promise<T | undefined>;

	$setValue(
		target: { scope: InternalMementoScope; key: string },

		value: any,
	): Promise<void>;

	$keys?(
		target: { scope: InternalMementoScope },

		options?: MementoKeysOptions,

		// For Memento.keys()
	): Promise<string[]>;

	// Optional, if main thread needs explicit init
	// $initialize?(): Promise<void>;

	// Optional
	// $optimize?(): Promise<void>;
}

// This is the class that implements the vscode.Memento interface
class ShimMementoImpl implements VscodeMemento {
	readonly #scope: InternalMementoScope;

	// For logging context primarily
	readonly #extensionId: string;

	readonly #mainThreadStorageProxy: MainThreadStorageShape | null;

	readonly #logService?: ILogService;

	// API compatibility
	readonly #whenReadyPromise: Promise<void>;

	constructor(
		// For logging/context
		extensionId: string,

		isGlobalScope: boolean,

		mainThreadStorageProxy: MainThreadStorageShape | null,

		logService?: ILogService,
	) {
		this.#extensionId = extensionId;

		this.#scope = isGlobalScope
			? InternalMementoScope.APPLICATION
			: InternalMementoScope.PROFILE;

		this.#mainThreadStorageProxy = mainThreadStorageProxy;

		this.#logService = logService;

		// Memento is "ready" immediately; data is fetched on demand.
		this.#whenReadyPromise = Promise.resolve();

		this._log(`Created (Scope: ${InternalMementoScope[this.#scope]})`);
	}

	private _log(message: string, ...args: any[]): void {
		this.#logService?.trace(
			`[Memento][${this.#extensionId}][${InternalMementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	private _logError(message: string, ...args: any[]): void {
		this.#logService?.error(
			`[Memento][${this.#extensionId}][${InternalMementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	private _logWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[Memento][${this.#extensionId}][${InternalMementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	get whenReady(): Promise<void> {
		return this.#whenReadyPromise;
	}

	// vscode.Memento.get
	public get<T>(key: string): T | undefined;

	public get<T>(key: string, defaultValue: T): T;

	public get<T>(key: string, defaultValue?: T): T | undefined {
		if (!key) {
			// Check for empty or null/undefined key
			this._logError(`Invalid key provided to Memento.get: '${key}'`);

			return defaultValue;
		}

		const storageKey = String(key);

		// Can be too verbose
		// this._log(`get: key='${storageKey}'`);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot Memento.get key='${storageKey}': MainThreadStorage RPC proxy unavailable.`,
			);

			return defaultValue;
		}

		// $getValue in VS Code often returns the value directly, or undefined if not found.
		// The promise wrapper here is for the async RPC call.
		return this.#mainThreadStorageProxy
			.$getValue<T>({ scope: this.#scope, key: storageKey })
			.then((resultValue) => {
				return resultValue === undefined ? defaultValue : resultValue;
			})
			.catch((err: any) => {
				this._logError(
					`Memento.get: Error fetching key='${storageKey}':`,

					refineError(err, this.#logService, "Memento.get"),
				);

				// Return defaultValue on any RPC error
				return defaultValue;
			});
	}

	// vscode.Memento.update
	public async update(key: string, value: any): Promise<void> {
		if (!key) {
			const errorMsg = `Invalid key provided to Memento.update: '${key}'`;

			this._logError(errorMsg);

			return Promise.reject(new Error(errorMsg));
		}

		const storageKey = String(key);

		// `value: undefined` means delete the key, as per Memento API.
		// `value: null` is a valid JSON value to store.
		if (value !== undefined) {
			// Only check serializability if not deleting
			try {
				// Basic check; structuredClone is more robust but might not be available/needed for simple JSON values.
				JSON.stringify(value);
			} catch (e: any) {
				const errorMsg = `Value for Memento key '${storageKey}' is not JSON serializable. Value type: ${typeof value}`;

				// Don't log the value itself if it's huge or sensitive.
				this._logError(errorMsg, e.message);

				return Promise.reject(new Error(`${errorMsg}: ${e.message}`));
			}
		}

		// Can be too verbose
		// this._log(`update: key='${storageKey}', value type: ${typeof value}`);

		if (!this.#mainThreadStorageProxy) {
			const errorMsg = `Cannot Memento.update key='${storageKey}': MainThreadStorage RPC proxy unavailable.`;

			this._logError(errorMsg);

			return Promise.reject(new Error(errorMsg));
		}

		try {
			await this.#mainThreadStorageProxy.$setValue(
				{ scope: this.#scope, key: storageKey },

				value,
			);

			// this._log(`update: key='${storageKey}' successful.`);
		} catch (err: any) {
			this._logError(
				`Memento.update: Error setting key='${storageKey}':`,

				refineError(err, this._logService, "Memento.update"),
			);

			// Rethrow to signal failure to the extension
			throw err;
		}
	}

	// vscode.Memento.keys
	public async keys(
		options?: MementoKeysOptions,
	): Promise<readonly string[]> {
		this._log(`keys() called with options: ${JSON.stringify(options)}`);

		if (!this.#mainThreadStorageProxy?.$keys) {
			this._logWarn(
				"Memento.keys() not available: MainThreadStorageProxy.$keys is not defined. Returning empty array.",
			);

			return [];
		}

		try {
			const result = await this.#mainThreadStorageProxy.$keys(
				{ scope: this.#scope },

				options,
			);

			// Ensure readonly array and handle null/undefined result
			return Object.freeze(result || []);
		} catch (err: any) {
			this._logError(
				"Memento.keys() RPC failed:",

				refineError(err, this._logService, "Memento.keys"),
			);

			return [];
		}
	}

	// Memento interface in vscode.d.ts might not have setKeysForSync.
	// This was in the original JS shim. If it's part of an internal IExtHostMemento, keep it.
	// Otherwise, it might be obsolete.
	public setKeysForSync(keys: readonly string[]): void {
		// Make keys readonly
		this._logWarn(
			`Memento.setKeysForSync([${keys.join(", ")}]) called. This is related to VS Code settings sync and is a NOP in this shim.`,
		);
	}

	// TODO: Implement `get<T>` and `update` that return `Thenable<T>` if the API requires stricter Thenable returns instead of Promise.
	// For most practical purposes, Promise is compatible.
}

export class ShimExtHostStorage
	extends BaseCocoonShim
	implements VscodeIExtHostStorage
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
			this._logError(
				"Failed to get MainThreadStorage RPC proxy! Memento functionality will be severely impaired or non-functional.",
			);
		}
	}

	public createMemento(
		extensionId: string,

		isGlobal: boolean,
	): VscodeMemento {
		this._log(
			`Creating Memento for extensionId='${extensionId}', isGlobal=${isGlobal}`,
		);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot create Memento for '${extensionId}': MainThreadStorage RPC proxy unavailable. This is critical.`,
			);

			// VS Code might throw or return a Memento that always fails. Throwing is clearer.
			throw new Error(
				"Cannot create Memento: MainThreadStorage RPC proxy is unavailable.",
			);
		}

		return new ShimMementoImpl(
			extensionId,

			isGlobal,

			this.#mainThreadStorageProxy,

			this._logService,
		);
	}

	public async initialize(): Promise<void> {
		this._log("initialize() called.");

		// TODO: If MainThreadStorage requires explicit initialization (e.g., to load data from disk),

		// this should call `this.#mainThreadStorageProxy?.$initialize()`.
		// For now, it's a NOP as Mementos fetch on demand.
		return Promise.resolve();
	}

	public async optimize(): Promise<void> {
		this._log("optimize() called.");

		// TODO: If MainThreadStorage supports an optimization/compaction step, call it here.
		// For now, a NOP.
		return Promise.resolve();
	}

	// updateWorkspaceStorageData is specific to IExtHostStorage and used for initialization from main thread.
	// This shim doesn't use it if data is fetched on demand by Memento.get.
	// If Mountain *pushes* initial storage data, this method would be called.
	// public $updateWorkspaceStorageData(data: IStringDictionary<any>): void {

	//     this._logWarn("$updateWorkspaceStorageData called - STUB. This shim fetches Memento data on demand.");

	// }
}
