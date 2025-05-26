/*---------------------------------------------------------------------------------------------
 * Cocoon Storage (Memento) Shim (storage-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.Memento` API, which provides extensions with key-value storage
 * capabilities. This is exposed to extensions via `ExtensionContext.globalState` and
 * `ExtensionContext.workspaceState`.
 *
 * This shim proxies all storage operations (get, update, delete/keys) to a
 * `MainThreadStorage` service running in the Mountain host process via RPC. Mountain is
 * then responsible for the actual data persistence.
 *
 * Responsibilities:
 * - `ShimExtHostStorage` (implements `IExtHostStorage`):
 *   - Acts as a factory for `Memento` instances using `createMemento(id, global)`.
 *   - Obtains and holds the RPC proxy to `MainThreadStorage`.
 * - `ShimMementoImpl` (implements `vscode.Memento`):
 *   - Represents a specific storage scope (global/application or workspace/profile)
 *     for a particular extension.
 *   - Proxies `get(key)`, `update(key, value)`, and `keys()` methods to the
 *     corresponding `$getValue`, `$setValue`, and `$keys` RPC calls on `MainThreadStorage`.
 *   - Handles `value: undefined` in `update` as a request to delete the key.
 *   - Provides a `whenReady` promise that resolves immediately, as data is fetched
 *     on-demand per operation rather than pre-loaded.
 *
 * Key Interactions:
 * - `ShimExtHostStorage` is registered with DI in `Cocoon/index.ts`.
 * - `ExtHostExtensionService` (or a shim) uses `ShimExtHostStorage.createMemento` to
 *   provide `globalState` and `workspaceState` to an extension's `ExtensionContext`.
 * - All data operations are RPC calls to `MainContext.MainThreadStorage` on Mountain.
 * - Uses `BaseCocoonShim` for common utilities like RPC proxy retrieval and logging.
 *

 *--------------------------------------------------------------------------------------------*/

import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// Import VS Code's internal IExtHostStorage interface for type compatibility if this shim is registered as such.
import {
	// Not directly used by this shim's public API consumption
	// MementoUpdateArguments,

	// Options for Memento.keys()
	type MementoKeysOptions,
	type IExtHostStorage as VscodeIExtHostStorage,
} from "vs/workbench/api/common/extHostStorage";
// Use vscode.Memento interface from the public API definitions.
import type { Memento as VscodeMemento } from "vscode";

import {
	BaseCocoonShim,
	// Using the more specific refineError from BaseCocoonShim
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Internal enum representing the scope of the Memento storage.
 * These values must align with what the `MainThreadStorage` service expects.
 * VS Code has evolved its Memento scopes; ensure these map correctly.
 * - `PROFILE` (0) typically corresponds to workspace-specific or profile-specific storage.
 * - `APPLICATION` (1) typically corresponds to global, application-wide storage.
 */
enum InternalMementoScope {
	// Workspace or Profile-specific
	PROFILE = 0,

	// Global/Application-wide
	APPLICATION = 1,
}

/**
 * Defines the RPC interface for the `MainThreadStorage` service expected on Mountain.
 * Methods and parameters must align with Mountain's implementation.
 */
interface MainThreadStorageShape {
	/**
	 * Retrieves a value from storage.
	 * @param target An object specifying the scope and key.
	 * @returns A promise resolving to the value, or `undefined` if not found.
	 */
	$getValue<T>(target: {
		scope: InternalMementoScope;

		key: string;
	}): Promise<T | undefined>;

	/**
	 * Sets or deletes a value in storage.
	 * If `value` is `undefined`, the key should be deleted.
	 * @param target An object specifying the scope and key.
	 * @param value The value to store, or `undefined` to delete the key.
	 */
	$setValue(
		target: { scope: InternalMementoScope; key: string },

		value: any,
	): Promise<void>;

	/**
	 * Retrieves all keys for a given storage scope.
	 * @param target An object specifying the scope.
	 * @param options Optional filtering options for keys (new in VS Code 1.87+).
	 * @returns A promise resolving to an array of key strings.
	 */
	$keys?(
		target: { scope: InternalMementoScope },

		options?: MementoKeysOptions,
	): Promise<string[]>;

	// If main thread needs explicit init
	// Optional: $initialize?(): Promise<void>;

	// If main thread supports compaction
	// Optional: $optimize?(): Promise<void>;
}

/**
 * Cocoon's implementation of the `vscode.Memento` interface.
 * It proxies storage operations to the `MainThreadStorage` service.
 */
class ShimMementoImpl implements VscodeMemento {
	readonly #scope: InternalMementoScope;

	// Used for logging and context.
	readonly #extensionId: string;

	readonly #mainThreadStorageProxy: MainThreadStorageShape | null;

	readonly #logService?: ILogServiceForShim;

	// API compatibility
	readonly #whenReadyPromise: Promise<void>;

	/**
	 * Creates an instance of ShimMementoImpl.
	 * @param extensionId The identifier of the extension this Memento is for (primarily for logging).
	 * @param isGlobalScope `true` if this Memento is for global (application) scope, `false` for workspace (profile) scope.
	 * @param mainThreadStorageProxy The RPC proxy to the `MainThreadStorage` service.
	 * @param logService The logging service instance.
	 */
	constructor(
		extensionId: string,

		isGlobalScope: boolean,

		mainThreadStorageProxy: MainThreadStorageShape | null,

		logService?: ILogServiceForShim,
	) {
		this.#extensionId = extensionId;

		this.#scope = isGlobalScope
			? InternalMementoScope.APPLICATION
			: InternalMementoScope.PROFILE;

		this.#mainThreadStorageProxy = mainThreadStorageProxy;

		this.#logService = logService;

		// In this shim, Memento is "ready" immediately as data is fetched on demand.
		// A real implementation might involve pre-loading data.
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

	/**
	 * A promise that resolves when the Memento is ready for use.
	 * For this shim, it resolves immediately.
	 */
	get whenReady(): Promise<void> {
		return this.#whenReadyPromise;
	}

	/**
	 * {@inheritDoc vscode.Memento.get}
	 *
	 */
	public get<T>(key: string): T | undefined;

	public get<T>(key: string, defaultValue: T): T;

	public get<T>(key: string, defaultValue?: T): T | undefined {
		if (!key || typeof key !== "string") {
			this._logError(
				`Invalid key provided to Memento.get: '${String(key)}'. Returning defaultValue.`,
			);

			return defaultValue;
		}

		// Already a string
		const storageKey = key;

		// this._log(`get: key='${storageKey}'`);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot Memento.get key='${storageKey}': MainThreadStorage RPC proxy unavailable. Returning defaultValue.`,
			);

			return defaultValue;
		}

		return this.#mainThreadStorageProxy
			.$getValue<T>({ scope: this.#scope, key: storageKey })
			.then((resultValue) => {
				return resultValue === undefined ? defaultValue : resultValue;
			})
			.catch((err: any) => {
				this._logError(
					`Memento.get: Error fetching key='${storageKey}' via RPC:`,

					refineErrorForShim(
						err,

						this.#logService,

						`Memento.get(${storageKey})`,
					),
				);

				// Return defaultValue on RPC error.
				return defaultValue;
			});
	}

	/**
	 * {@inheritDoc vscode.Memento.update}
	 *
	 */
	public async update(key: string, value: any): Promise<void> {
		if (!key || typeof key !== "string") {
			const errorMsg = `Invalid key provided to Memento.update: '${String(key)}'`;

			this._logError(errorMsg);

			return Promise.reject(new Error(errorMsg));
		}

		const storageKey = key;

		// The Memento API contract: `value: undefined` means delete the key.
		// `value: null` is a valid JSON value to store.
		if (value !== undefined) {
			try {
				// Perform a basic check to ensure the value is JSON serializable.
				// More complex objects might still cause issues if they contain non-serializable parts
				// not caught by this simple `JSON.stringify` check (e.g., functions, circular refs if not handled by RPC).
				JSON.stringify(value);
			} catch (e: any) {
				const errorMsg = `Value for Memento key '${storageKey}' is not JSON serializable. Value type: ${typeof value}. Error: ${e.message}`;

				// Avoid logging the value itself if it's large or sensitive.
				this._logError(errorMsg);

				return Promise.reject(new Error(errorMsg));
			}
		}

		// this._log(`update: key='${storageKey}', value type: ${typeof value} (undefined means delete)`);

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
			const refinedError = refineErrorForShim(
				err,

				this.#logService,

				`Memento.update(${storageKey})`,
			);

			this._logError(
				`Memento.update: Error setting key='${storageKey}' via RPC:`,

				refinedError.message,
			);

			// Rethrow to signal failure to the extension.
			throw refinedError;
		}
	}

	/**
	 * {@inheritDoc vscode.Memento.keys}
	 *
	 */
	public async keys(
		options?: MementoKeysOptions,
	): Promise<readonly string[]> {
		this._log(
			`keys() called with options: ${options ? JSON.stringify(options) : "(none)"}`,
		);

		if (!this.#mainThreadStorageProxy?.$keys) {
			this._logWarn(
				"Memento.keys() not available: MainThreadStorageProxy.$keys is not defined or proxy unavailable. Returning empty array.",
			);

			return Object.freeze([]);
		}

		try {
			const result = await this.#mainThreadStorageProxy.$keys(
				{ scope: this.#scope },

				options,
			);

			// Ensure readonly array and handle null/undefined result.
			return Object.freeze(result || []);
		} catch (err: any) {
			const refinedError = refineErrorForShim(
				err,

				this.#logService,

				"Memento.keys()",
			);

			this._logError("Memento.keys() RPC failed:", refinedError.message);

			// Return empty array on error.
			return Object.freeze([]);
		}
	}

	/**
	 * @deprecated This method is part of an internal VS Code API related to settings sync
	 * and typically should not be called by extensions. It's a NOP in this shim.
	 */
	public setKeysForSync(keys: readonly string[]): void {
		this._logWarn(
			`Memento.setKeysForSync([${keys.join(", ")}]) called. This is related to VS Code settings sync and is a No-Operation in this shim.`,
		);
	}
}

/**
 * Cocoon's implementation of `IExtHostStorage`.
 * This service acts as a factory for creating `Memento` instances for extensions.
 */
export class ShimExtHostStorage
	extends BaseCocoonShim
	implements VscodeIExtHostStorage
{
	// Required by VS Code's service types
	public readonly _serviceBrand: undefined;

	#mainThreadStorageProxy: MainThreadStorageShape | null = null;

	/**
	 * Creates an instance of ShimExtHostStorage.
	 * @param rpcService The RPC service adapter for communication with MainThreadStorage.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostStorage", rpcService, logService);

		this._log("Initializing...");

		if (this._rpcService) {
			this.#mainThreadStorageProxy = this._getProxy(
				MainContext.MainThreadStorage as ProxyIdentifier<MainThreadStorageShape>,
			);
		}

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				"Failed to get MainThreadStorage RPC proxy! Memento functionality will be severely impaired or non-functional. This is a critical issue.",
			);
		}
	}

	/**
	 * Creates a `Memento` instance for a given extension and scope.
	 * @param extensionId The identifier of the extension requesting the Memento.
	 * @param isGlobal `true` for global (application) scope, `false` for workspace (profile) scope.
	 * @returns A `vscode.Memento` instance.
	 * @throws Error if the MainThreadStorage RPC proxy is unavailable.
	 */
	public createMemento(
		extensionId: string,

		isGlobal: boolean,
	): VscodeMemento {
		const scopeName = isGlobal
			? "Global (Application)"
			: "Workspace (Profile)";

		this._log(
			`Creating Memento for extensionId='${extensionId}', Scope: ${scopeName}`,
		);

		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot create Memento for '${extensionId}' (Scope: ${scopeName}): MainThreadStorage RPC proxy is unavailable. This is critical for extension state persistence.`,
			);

			// VS Code might return a Memento that always fails its operations, or throw.
			// Throwing makes the failure explicit early on.
			throw new Error(
				"Cannot create Memento: MainThreadStorage RPC proxy is unavailable. Extension state will not be saved or loaded.",
			);
		}

		return new ShimMementoImpl(
			extensionId,

			isGlobal,

			this.#mainThreadStorageProxy,

			this._logService,
		);
	}

	/**
	 * Initializes the storage system. In this shim, it's a NOP as Mementos fetch data on demand.
	 * In a full VS Code setup, this might involve pre-loading data from the main thread.
	 * @returns A promise that resolves when initialization is complete.
	 */
	public async initialize(): Promise<void> {
		this._log("initialize() called (No-Operation in this shim).");

		// If MainThreadStorage required an explicit initialization call:
		// if (this.#mainThreadStorageProxy?.$initialize) {

		//    await this.#mainThreadStorageProxy.$initialize();

		// }

		return Promise.resolve();
	}

	/**
	 * Optimizes the storage. In this shim, it's a NOP.
	 * In a full VS Code setup, this might trigger compaction or cleanup on the main thread.
	 * @returns A promise that resolves when optimization is complete.
	 */
	public async optimize(): Promise<void> {
		this._log("optimize() called (No-Operation in this shim).");

		// If MainThreadStorage supported an optimize call:
		// if (this.#mainThreadStorageProxy?.$optimize) {

		//    await this.#mainThreadStorageProxy.$optimize();

		// }

		return Promise.resolve();
	}

	// `updateWorkspaceStorageData` is an internal method for IExtHostStorage,

	// typically called by the main thread to push initial workspace-specific Memento data.
	// This shim's Memento fetches data on demand, so this method might be a NOP
	// unless Mountain uses a push model for initial Memento state.
	// public $updateWorkspaceStorageData(data: IStringDictionary<any>): void {

	// this._logWarn("$updateWorkspaceStorageData called by MainThread - STUBBED in this shim. Memento data is fetched on demand.");

	// If used, this would involve populating a cache or directly updating the
	// relevant workspace Memento instance(s) if they were pre-created.
	// }
}
