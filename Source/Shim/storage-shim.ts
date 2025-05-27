/*---------------------------------------------------------------------------------------------
 * Cocoon Storage (Memento) Shim (storage-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.Memento` API, which provides extensions with persistent
 * key-value storage capabilities. This API is exposed to extensions via the
 * `ExtensionContext.globalState` (for application-wide storage, shared across workspaces)
 * and `ExtensionContext.workspaceState` (for workspace/profile-specific storage) properties.
 *
 * This shim architecture consists of two main classes:
 * - `ShimExtHostStorage` (implements `IExtHostStorage`):
 *   - Acts as a factory. Its primary method, `createMemento(extensionId, isGlobal)`, is
 *     called by the `ExtHostExtensionService` (or its shim) when an `ExtensionContext`
 *     is being created for an extension.
 *   - It obtains and holds the RPC proxy to the `MainThreadStorage` service on Mountain.
 *
 * - `ShimMementoImpl` (implements `vscode.Memento`):
 *   - Each instance represents a specific storage scope (Global/Application or
 *     Workspace/Profile) for a particular extension. The `extensionId` passed during
 *     creation is primarily used for logging context within the Memento instance. The
 *     actual namespacing of data by extension is typically handled by VS Code's
 *     `IExtHostStorage` internals or by how `ExtensionContext` is structured, and
 *     ultimately by `MainThreadStorage` based on the `scope`.
 *   - It proxies Memento operations (`get(key)`, `update(key, value)`, and `keys()`)
 *     to the corresponding RPC calls (`$getValue`, `$setValue`, `$keys`) on the
 *     `MainThreadStorage` service.
 *   - When `update(key, value)` is called with `value: undefined`, this signals an
 *     intent to delete the key. This shim marshals `undefined` as `null` for the RPC
 *     call, as Mountain's `StorageProvider` (in `handlers/storage.rs`) typically
 *     interprets a `null` value in `$setValue` as a deletion request.
 *   - Provides a `whenReady` promise that resolves immediately. Unlike some Memento
 *     implementations that might pre-load all data, this shim fetches or updates
 *     data on-demand for each specific operation.
 *
 * Key Interactions:
 * - `ShimExtHostStorage` is registered with Dependency Injection (DI) in `Cocoon/index.ts`.
 * - The real `ExtHostExtensionService` (or its shim equivalent) invokes
 *   `ShimExtHostStorage.createMemento` to construct and provide the `globalState` and
 *   `workspaceState` Mementos to each extension's `ExtensionContext`.
 * - All Memento data operations result in RPC calls to `MainContext.MainThreadStorage`
 *   on Mountain. These RPC calls are then typically routed by Mountain's `track.rs`
 *   to `storage_effects`, which in turn interact with `handlers/storage.rs`.
 * - Mountain's `handlers/storage.rs` (via its `StorageProvider` effect implementations)
 *   manages the actual data, often using in-memory maps within `AppState` and
 *   asynchronously persisting this data to disk (e.g., as JSON files).
 * - This shim uses `BaseCocoonShim` for common utilities such as RPC proxy retrieval, *
 *   standardized logging, and error refinement.
 *
 *--------------------------------------------------------------------------------------------*/

import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// Import VS Code's internal IExtHostStorage interface for type compatibility if this shim
// is registered as such, and MementoKeysOptions for the .keys() method.
import {
	// This DTO is for batch updates, not directly used by this shim's public API consumption.
	// MementoUpdateArguments,

	// Options for Memento.keys() method.
	type MementoKeysOptions,
	// VS Code internal service interface.
	type IExtHostStorage as VscodeIExtHostStorage,
} from "vs/workbench/api/common/extHostStorage";
// Use vscode.Memento interface from the public API definitions.
import type { Memento as VscodeMemento } from "vscode";

import {
	BaseCocoonShim,
	// Use the more specific error refiner from BaseCocoonShim.
	refineErrorForShim,
	// For BaseCocoonShim constructor.
	type ILogServiceForShim,
	// For BaseCocoonShim constructor.
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Internal enum representing the scope of the Memento storage for RPC calls.
 * These values must align with what the `MainThreadStorage` service on Mountain expects
 * and how VS Code internally distinguishes storage scopes.
 * In VS Code, `StorageScope.PROFILE` (value 0) is often used for workspace-level or
 * profile-specific storage, while `StorageScope.APPLICATION` (value 1) is used for
 * global (user-global) storage.
 */
enum InternalMementoScope {
	// Corresponds to Workspace or Profile-specific storage.
	PROFILE = 0,

	// Corresponds to Global or Application-wide storage (User Global).
	APPLICATION = 1,
}

/**
 * Defines the RPC interface for the `MainThreadStorage` service expected on Mountain.
 * Method names and parameters must align with Mountain's implementation, which is
 * typically invoked via effects processed by `track.rs`.
 */
interface MainThreadStorageShape {
	/**
	 * Retrieves a value from storage for a given scope and key.
	 * @param target An object specifying the `scope` (InternalMementoScope) and `key` (string).
	 * @returns A promise resolving to the stored value of type `T`, or `undefined` if the key is not found.
	 */
	$getValue<T>(target: {
		scope: InternalMementoScope;

		key: string;
	}): Promise<T | undefined>;

	/**
	 * Sets or deletes a value in storage for a given scope and key.
	 * If `value` is `null` (which `undefined` from the Memento API is marshalled to by this shim),
	 *
	 *
	 *
	 * the key should be deleted from storage by the MainThread handler in Mountain.
	 * @param target An object specifying the `scope` (InternalMementoScope) and `key` (string).
	 * @param value The value to store (any JSON-serializable type), or `null` to request deletion of the key.
	 */
	$setValue(
		target: { scope: InternalMementoScope; key: string },

		value: any | null,
	): Promise<void>;

	/**
	 * (Optional Method on MainThread proxy) Retrieves all keys for a given storage scope,
	 *
	 *
	 *
	 * potentially filtered by options.
	 * **NOTE:** This method requires a corresponding handler (e.g., `handle_get_storage_keys`)
	 * and RPC routing in Mountain, which might be missing or differ in a specific Mountain MVP.
	 * @param target An object specifying the `scope` (InternalMementoScope).
	 * @param options Optional filtering options for keys (as defined by `MementoKeysOptions`).
	 * @returns A promise resolving to an array of key strings.
	 */
	$keys?(
		target: { scope: InternalMementoScope },

		options?: MementoKeysOptions,
	): Promise<string[]>;

	// Optional lifecycle methods if the MainThread storage system requires explicit initialization or optimization calls:
	// If main thread storage needs an explicit init signal.
	// $initialize?(): Promise<void>;

	// If main thread supports a storage compaction/optimization command.
	// $optimize?(): Promise<void>;
}

/**
 * Cocoon's implementation of the `vscode.Memento` interface.
 * It proxies storage operations to the `MainThreadStorage` service on Mountain.
 * Each instance is scoped to a specific extension (for logging/context) and a storage
 * type (global or workspace/profile via `InternalMementoScope`).
 */
class ShimMementoImpl implements VscodeMemento {
	readonly #scope: InternalMementoScope;

	// Used for logging context only. Actual namespacing is by scope on MainThread.
	readonly #extensionIdForLog: string;

	readonly #mainThreadStorageProxy: MainThreadStorageShape | null;

	readonly #logService?: ILogServiceForShim;

	// Required by Memento API.
	readonly #whenReadyPromise: Promise<void>;

	/**
	 * Creates an instance of ShimMementoImpl.
	 * @param extensionId The identifier string of the extension this Memento is for (primarily for logging context).
	 * @param isGlobalScope `true` if this Memento is for global (application) scope,
	 *
	 *
	 *
	 *                        `false` for workspace (profile-specific) scope.
	 * @param mainThreadStorageProxy The RPC proxy to the `MainThreadStorage` service on Mountain.
	 * @param logService The logging service instance.
	 */
	constructor(
		extensionId: string,

		isGlobalScope: boolean,

		mainThreadStorageProxy: MainThreadStorageShape | null,

		logService?: ILogServiceForShim,
	) {
		this.#extensionIdForLog = extensionId;

		this.#scope = isGlobalScope
			? InternalMementoScope.APPLICATION
			: InternalMementoScope.PROFILE;

		this.#mainThreadStorageProxy = mainThreadStorageProxy;

		this.#logService = logService;

		// For this shim, Memento is considered "ready" immediately as data is fetched on-demand per operation.
		// A more complex implementation might involve pre-loading an initial cache of Memento data from MainThread.
		this.#whenReadyPromise = Promise.resolve();

		this._logDebug(
			`Created Memento instance (Scope: ${InternalMementoScope[this.#scope]})`,
		);
	}

	private _logDebug(message: string, ...args: any[]): void {
		// Changed to _logDebug for consistency
		this.#logService?.debug(
			// Use debug for routine Memento operations
			`[Memento][${this.#extensionIdForLog}][${InternalMementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	private _logError(message: string | Error, ...args: any[]): void {
		const prefix = `[Memento][${this.#extensionIdForLog}][${InternalMementoScope[this.#scope]}]`;

		if (this.#logService) {
			this.#logService.error(
				message instanceof Error ? message : `${prefix} ${message}`,

				...args,
			);
		} else {
			// Fallback to console if no logger, should be rare if BaseCocoonShim is properly used.
			if (message instanceof Error)
				console.error(
					`${prefix} ${message.message}`,

					message.stack,

					...args,
				);
			else console.error(`${prefix} ${message}`, ...args);
		}
	}

	private _logWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[Memento][${this.#extensionIdForLog}][${InternalMementoScope[this.#scope]}] ${message}`,

			...args,
		);
	}

	/**
	 * {@inheritDoc vscode.Memento.whenReady}
	 *
	 *
	 * A promise that resolves when the Memento is ready for use.
	 * For this on-demand shim, it resolves immediately.
	 */
	get whenReady(): Promise<void> {
		return this.#whenReadyPromise;
	}

	/** {@inheritDoc vscode.Memento.get} */
	public get<T>(key: string): T | undefined;

	public get<T>(key: string, defaultValue: T): T;

	public get<T>(key: string, defaultValue?: T): T | undefined {
		if (!key || typeof key !== "string") {
			this._logError(
				`Invalid key provided to Memento.get(): '${String(key)}'. Key must be a non-empty string. Returning defaultValue.`,
			);

			return defaultValue;
		}

		const storageKey = key;

		this._logDebug(`get: Key='${storageKey}'`);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot Memento.get(key='${storageKey}'): MainThreadStorage RPC proxy is unavailable. Operation will fail. Returning defaultValue.`,
			);

			return defaultValue;
		}

		// $getValue RPC call to MainThreadStorage.
		return this.#mainThreadStorageProxy
			.$getValue<T>({ scope: this.#scope, key: storageKey })
			.then((resultValue) => {
				// If resultValue is undefined (key not found), return defaultValue. Otherwise, return resultValue.
				return resultValue === undefined ? defaultValue : resultValue;
			})
			.catch((err: any) => {
				this._logError(
					`Memento.get(key='${storageKey}') RPC call failed:`,

					refineErrorForShim(
						err,

						this.#logService,

						`Memento.get(${storageKey})`,
					),
				);

				// Return defaultValue on any RPC error as per Memento behavior.
				return defaultValue;
			});
	}

	/** {@inheritDoc vscode.Memento.update} */
	public async update(key: string, value: any): Promise<void> {
		if (!key || typeof key !== "string") {
			const errorMsg = `Invalid key provided to Memento.update(): '${String(key)}'. Key must be a non-empty string.`;

			this._logError(errorMsg);

			// Memento API's `update` returns Promise<void>, which should reject on bad input.
			throw new Error(errorMsg);
		}

		const storageKey = key;

		// Memento API contract: `value: undefined` means delete the key.
		// For RPC to Mountain's `handle_set_storage_value` (which uses `serde_json::Value`),

		// `serde_json::Value::Null` is interpreted as a deletion request.
		// Standard JSON.stringify(undefined) results in `undefined`, which might be omitted by some RPC layers.
		// Therefore, explicitly convert `undefined` to `null` for the RPC payload.
		const valueForRpc = value === undefined ? null : value;

		if (valueForRpc !== null) {
			// Only check serializability if not deleting (value is not null).
			try {
				// Basic check for JSON serializability.
				JSON.stringify(valueForRpc);
			} catch (e: any) {
				const errorMsg =
					`Value for Memento key '${storageKey}' is not JSON serializable. ` +
					`Value type: ${typeof valueForRpc}. Error: ${e.message}`;

				// Avoid logging the value itself if it's large or sensitive.
				this._logError(errorMsg);

				// Reject promise if value is not serializable.
				throw new Error(errorMsg);
			}
		}

		this._logDebug(
			`update: Key='${storageKey}', ValueType=${typeof value} (${value === undefined ? "DELETE operation (value sent as null)" : "SET/UPDATE operation"})`,
		);

		if (!this.#mainThreadStorageProxy) {
			const errorMsg = `Cannot Memento.update(key='${storageKey}'): MainThreadStorage RPC proxy unavailable. Operation failed.`;

			this._logError(errorMsg);

			// Reject promise if proxy is missing.
			throw new Error(errorMsg);
		}

		try {
			await this.#mainThreadStorageProxy.$setValue(
				{ scope: this.#scope, key: storageKey },

				valueForRpc,
			);

			this._logDebug(`update: Key='${storageKey}' RPC call successful.`);
		} catch (err: any) {
			const refinedError = refineErrorForShim(
				err,

				this.#logService,

				`Memento.update(${storageKey})`,
			);

			this._logError(
				`Memento.update(key='${storageKey}') RPC call failed: ${refinedError.message}`,
			);

			// Rethrow to signal failure to the extension.
			throw refinedError;
		}
	}

	/** {@inheritDoc vscode.Memento.keys} */
	public async keys(
		options?: MementoKeysOptions,
	): Promise<readonly string[]> {
		this._logDebug(
			`keys() called. Options: ${options ? JSON.stringify(options) : "(none)"}`,
		);

		if (!this.#mainThreadStorageProxy) {
			// Check if proxy is available first.
			this._logError(
				"Cannot Memento.keys(): MainThreadStorage RPC proxy unavailable. Returning empty array.",
			);

			return Object.freeze([]);
		}

		if (!this.#mainThreadStorageProxy.$keys) {
			// Then check if the $keys method specifically exists.
			this._logWarn(
				"Memento.keys() functionality is not available: The MainThreadStorageProxy does not have a '$keys' method. " +
					"This may indicate an older or incomplete Mountain backend implementation for storage. Returning empty array.",
			);

			return Object.freeze([]);
		}

		try {
			const resultKeysArray = await this.#mainThreadStorageProxy.$keys(
				{ scope: this.#scope },

				options,
			);

			// Ensure readonly array and handle null/undefined result from RPC gracefully.
			return Object.freeze(resultKeysArray || []);
		} catch (err: any) {
			const refinedError = refineErrorForShim(
				err,

				this.#logService,

				"Memento.keys() RPC call",
			);

			this._logError(
				`Memento.keys() RPC call failed: ${refinedError.message}`,
			);

			// Return empty array on error, as per typical Memento behavior.
			return Object.freeze([]);
		}
	}

	/**
	 * @deprecated This method is part of an internal VS Code API related to settings sync
	 * and typically should not be called directly by extensions. It is a No-Operation in this shim.
	 */
	public setKeysForSync(_keys: readonly string[]): void {
		// Parameter `_keys` marked as unused.
		this._logWarn(
			`Memento.setKeysForSync([...]) called by extension '${this.#extensionIdForLog}'. ` +
				`This method is related to VS Code's internal settings sync mechanisms and is a No-Operation in Cocoon's Memento shim.`,
		);
	}
}

/**
 * Cocoon's implementation of `IExtHostStorage` (VS Code internal service interface).
 * This service acts as a factory for creating `Memento` instances, which provide
 * persistent key-value storage for extensions (for both global and workspace scopes).
 */
export class ShimExtHostStorage
	extends BaseCocoonShim
	implements VscodeIExtHostStorage
{
	// Implement the VS Code internal service interface for DI compatibility.
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	#mainThreadStorageProxy: MainThreadStorageShape | null = null;

	/**
	 * Creates an instance of ShimExtHostStorage.
	 * @param rpcService The RPC service adapter for communication with `MainThreadStorage` on Mountain.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		// Service identifier for logging.
		super("ExtHostStorage", rpcService, logService);

		// Use Info for major lifecycle.
		this._logInfo("Initializing...");

		if (this._rpcService) {
			this.#mainThreadStorageProxy = this._getProxy(
				MainContext.MainThreadStorage as ProxyIdentifier<MainThreadStorageShape>,
			);
		}

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				"CRITICAL: Failed to get MainThreadStorage RPC proxy! Memento functionality (which relies on this for " +
					"extension state persistence) will be severely impaired or non-functional. " +
					"This is a critical setup issue for extensions that use `globalState` or `workspaceState`.",
			);
		}
	}

	/**
	 * Creates a `Memento` instance for a given extension and storage scope.
	 * This method is called by `ExtHostExtensionService` (or its shim) when creating the
	 * `ExtensionContext` for an extension, to provide its `globalState` and `workspaceState` Mementos.
	 *
	 * @param extensionId The identifier string of the extension requesting the Memento
	 *                    (e.g., "publisher.name"). This is used for logging context by `ShimMementoImpl`.
	 * @param isGlobal `true` to create a Memento for global (application-wide) scope;
	 *
	 *
	 *                 `false` for workspace (profile-specific) scope.
	 * @returns A `vscode.Memento` instance.
	 * @throws Error if the `MainThreadStorage` RPC proxy is unavailable, as Memento functionality
	 *         would be impossible without it.
	 */
	public createMemento(
		extensionId: string,

		isGlobal: boolean,
	): VscodeMemento {
		const scopeName = isGlobal
			? "Global (Application)"
			: "Workspace (Profile)";

		this._logDebug(
			`Creating Memento for ExtensionId='${extensionId}', Scope='${scopeName}'`,
		);

		if (!this.#mainThreadStorageProxy) {
			// This is a critical failure scenario. If extensions cannot get Memento instances, they cannot store state.
			const criticalErrorMsg =
				`Cannot create Memento for extension '${extensionId}' (Scope: ${scopeName}): ` +
				`MainThreadStorage RPC proxy is unavailable. Extension state persistence will FAIL. ` +
				`This indicates a critical problem with the Cocoon setup or its connection to Mountain.`;

			this._logError(criticalErrorMsg);

			// Throwing an error here makes the failure explicit and prevents extensions from
			// receiving a non-functional Memento object, which could lead to silent data loss.
			throw new Error(criticalErrorMsg);
		}

		return new ShimMementoImpl(
			extensionId,

			isGlobal,

			this.#mainThreadStorageProxy,

			// Pass the logger from this service to the Memento instance.
			this._logService,
		);
	}

	/**
	 * Initializes the storage system. In this shim, it's a No-Operation (NOP) as
	 * `Memento` instances fetch data on demand ("pull" model). In a full VS Code setup,
	 *
	 *
	 *
	 * this might involve pre-loading data from the main thread or initializing underlying
	 * storage databases if a "push" model or caching layer were used.
	 * @returns A promise that resolves when initialization is considered complete (immediately for this shim).
	 */
	public async initialize(): Promise<void> {
		this._logDebug(
			"ExtHostStorage.initialize() called (No-Operation in this shim as Mementos fetch data on demand).",
		);

		// If MainThreadStorage required an explicit initialization call from ExtHost:
		// if (this.#mainThreadStorageProxy?.$initialize) {

		//    this._logInfo("Calling $initialize on MainThreadStorage proxy...");

		//    await this.#mainThreadStorageProxy.$initialize();

		// }

		return Promise.resolve();
	}

	/**
	 * Requests optimization of the storage system (e.g., compaction of database files).
	 * In this shim, it's a No-Operation (NOP), as persistence is handled by Mountain.
	 * @returns A promise that resolves when optimization is complete (immediately for this shim).
	 */
	public async optimize(): Promise<void> {
		this._logDebug(
			"ExtHostStorage.optimize() called (No-Operation in this shim; optimization is Mountain's concern).",
		);

		// If MainThreadStorage supported an explicit optimize call that ExtHost needed to trigger:
		// if (this.#mainThreadStorageProxy?.$optimize) {

		//    this._logInfo("Calling $optimize on MainThreadStorage proxy...");

		//    await this.#mainThreadStorageProxy.$optimize();

		// }

		return Promise.resolve();
	}

	// `updateWorkspaceStorageData` is an internal method part of `IExtHostStorage`,

	// typically called by the main thread to push initial workspace-specific Memento data
	// during startup if a "push" model is used for Memento initialization (e.g., from settings sync).
	// Since this shim's Memento instances fetch data on demand ("pull" model), this method
	// is effectively a NOP unless Mountain were to explicitly push initial Memento state using this RPC.
	// public $updateWorkspaceStorageData(data: IStringDictionary<any>): void {

	//     this._logWarn(
	//          "$updateWorkspaceStorageData RPC called by MainThread - STUBBED in this shim. " +
	//          "Memento data is fetched on demand by individual Memento instances. " +
	//          "If Mountain pushes data this way, it needs to be handled by populating the relevant Memento cache."
	//      );

	// If implemented, this would involve finding or creating the relevant workspace Memento
	//
	// instance(s) and populating their internal cache with the provided `data`.
	//
	// This is complex as Mementos are per-extension and per-scope.
	//
	// }

	/**
	 * Disposes of resources held by this service instance.
	 * (Currently, `ShimExtHostStorage` itself holds no complex resources like event emitters
	 * that require explicit disposal beyond what `BaseCocoonShim` handles).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// Individual Memento instances are not tracked here for mass disposal;

		// they are typically disposed when their associated ExtensionContext is disposed.
		this._logInfo("Disposed.");
	}
}
