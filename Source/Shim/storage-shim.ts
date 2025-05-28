/*---------------------------------------------------------------------------------------------
 * Cocoon Storage (Memento) Shim (storage-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.Memento` API, which provides extensions with persistent
 * key-value storage capabilities. This API is exposed to extensions via the
 * `ExtensionContext.globalState` and `ExtensionContext.workspaceState` properties.
 *
 * This shim architecture consists of two main classes:
 * - `ShimExtHostStorage` (implements `IExtHostStorage`):
 *   - Acts as a factory. Its primary method, `createMemento(extensionId, isGlobal)`, is
 *     called by `ExtHostExtensionService` (or its shim) when an `ExtensionContext`
 *     is being created for an extension.
 *   - It obtains and holds the RPC proxy to the `MainThreadStorage` service on Mountain.
 *
 * - `ShimMementoImpl` (implements `vscode.Memento`):
 *   - Each instance represents a specific storage scope (Global/Application or
 *     Workspace/Profile) for a particular extension.
 *   - It proxies Memento operations (`get(key)`, `update(key, value)`, and `keys()`)
 *     to the corresponding RPC calls (`$getValue`, `$setValue`, `$keys`) on the
 *     `MainThreadStorage` service.
 *   - When `update(key, value)` is called with `value: undefined`, this signals an
 *     intent to delete the key. This shim marshals `undefined` as `null` for the RPC
 *     call, as Mountain's `StorageProvider` typically interprets a `null` value in
 *     `$setValue` as a deletion request.
 *   - Provides a `whenReady` promise that resolves immediately (on-demand data fetching).
 *   - Includes an `onDidChange` event that fires when a key is changed *through this Memento instance*.
 *     (Note: `vscode.Memento` itself does not have a public `onDidChange` event in `vscode.d.ts`.
 *     This event here is more for internal consistency or future API alignment if needed).
 *
 * Key Interactions:
 * - `ShimExtHostStorage` is registered with DI in `Cocoon/index.ts`.
 * - The real `ExtHostExtensionService` (or its shim) invokes `ShimExtHostStorage.createMemento`.
 * - All Memento data operations result in RPC calls to `MainContext.MainThreadStorage` on Mountain.
 * - Uses `BaseCocoonShim` for common utilities.
 *
 * Assumed RPC Contract with Mountain (mimicking VS Code RPC for MainThreadStorage):
 * - Target Service: `MainContext.MainThreadStorage`
 * - Method "$getValue":
 *   - Params: `target: { scope: InternalMementoScope, key: string }`
 *   - Returns: `Promise<T | undefined | null>`
 * - Method "$setValue":
 *   - Params: `target: { scope: InternalMementoScope, key: string }, value: any | null` (null means delete)
 *   - Returns: `Promise<void>`
 * - Method "$keys" (Optional, if Memento.keys() is to be functional):
 *   - Params: `target: { scope: InternalMementoScope }, options?: MementoKeysOptions`
 *   - Returns: `Promise<string[]>`
 * Errors from Mountain are expected as VineErrorPayload.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// For onDidChange event
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
import {
	type MementoKeysOptions,
	type IExtHostStorage as VscodeIExtHostStorage,
} from "vs/workbench/api/common/extHostStorage";
import type {
	SecretStorageChangeEvent,
	Memento as VscodeMemento,
} from "vscode";

// API Type, SecretStorageChangeEvent for onDidChange type

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

enum InternalMementoScope {
	PROFILE = 0,
	APPLICATION = 1,
} // PROFILE for Workspace, APPLICATION for Global

interface MainThreadStorageShape {
	$getValue<T>(target: {
		scope: InternalMementoScope;
		key: string;
	}): Promise<T | undefined | null>;
	$setValue(
		target: { scope: InternalMementoScope; key: string },
		value: any | null,
	): Promise<void>;
	$keys?(
		target: { scope: InternalMementoScope },
		options?: MementoKeysOptions,
	): Promise<string[]>;
}

class ShimMementoImpl implements VscodeMemento {
	readonly #scope: InternalMementoScope;
	readonly #extensionIdForLog: string;
	readonly #mainThreadStorageProxy: MainThreadStorageShape | null;
	#logService?: ILogServiceForShim; // Made mutable for dispose
	readonly #whenReadyPromise: Promise<void>;

	// Note: vscode.Memento interface does not officially have onDidChange.
	// This is for internal consistency or potential future API alignment.
	// If used, it fires when *this instance* successfully calls update/delete.
	private readonly _onDidChangeEmitter =
		new VscodeEmitter<SecretStorageChangeEvent>(); // Using SecretStorageChangeEvent as it has {key}
	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> =
		this._onDidChangeEmitter.event;
	private readonly _disposables = new DisposableStore();

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
		this.#whenReadyPromise = Promise.resolve();
		this._disposables.add(this._onDidChangeEmitter);
		this._logDebug(
			`Created Memento instance (Scope: ${InternalMementoScope[this.#scope]})`,
		);
	}

	private _logDebug(message: string, ...args: any[]): void {
		this.#logService?.debug(
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
			console.error(
				`${prefix} ${message instanceof Error ? message.message : message}`,
				...args,
				message instanceof Error ? message.stack : "",
			);
		}
	}
	private _logWarn(message: string, ...args: any[]): void {
		this.#logService?.warn(
			`[Memento][${this.#extensionIdForLog}][${InternalMementoScope[this.#scope]}] ${message}`,
			...args,
		);
	}

	get whenReady(): Promise<void> {
		return this.#whenReadyPromise;
	}

	public get<T>(key: string): T | undefined;
	public get<T>(key: string, defaultValue: T): T;
	public get<T>(key: string, defaultValue?: T): T | undefined {
		if (!key || typeof key !== "string") {
			this._logError("Invalid key for Memento.get()", "Key:", key);
			return defaultValue;
		}
		const storageKey = key;
		this._logDebug(`get: Key='${storageKey}'`);
		if (!this.#mainThreadStorageProxy) {
			this._logError(
				`Cannot Memento.get('${storageKey}'): RPC proxy unavailable. Returning defaultValue.`,
			);
			return defaultValue;
		}

		return this.#mainThreadStorageProxy
			.$getValue<T>({ scope: this.#scope, key: storageKey })
			.then((resultValue) =>
				resultValue === undefined || resultValue === null
					? defaultValue
					: resultValue,
			) // Treat null from storage as not found
			.catch((err) => {
				this._logError(
					`Memento.get('${storageKey}') RPC failed:`,
					refineErrorForShim(
						err,
						this.#logService,
						`Memento.get(${storageKey})`,
					),
				);
				return defaultValue;
			});
	}

	public async update(key: string, value: any): Promise<void> {
		if (!key || typeof key !== "string") {
			const msg = `Invalid key for Memento.update(): '${String(key)}'.`;
			this._logError(msg);
			throw new Error(msg);
		}
		const storageKey = key;
		const valueForRpc = value === undefined ? null : value; // null signals deletion
		if (valueForRpc !== null) {
			try {
				JSON.stringify(valueForRpc);
			} catch (e: any) {
				const msg = `Value for Memento key '${storageKey}' not JSON serializable. Type: ${typeof valueForRpc}. Err: ${e.message}`;
				this._logError(msg);
				throw new Error(msg);
			}
		}
		this._logDebug(
			`update: Key='${storageKey}', ValueType=${typeof value} (${value === undefined ? "DELETE" : "SET/UPDATE"})`,
		);
		if (!this.#mainThreadStorageProxy) {
			const msg = `Cannot Memento.update('${storageKey}'): RPC proxy unavailable.`;
			this._logError(msg);
			throw new Error(msg);
		}

		try {
			await this.#mainThreadStorageProxy.$setValue(
				{ scope: this.#scope, key: storageKey },
				valueForRpc,
			);
			this._logDebug(`update: Key='${storageKey}' RPC success.`);
			this._onDidChangeEmitter.fire({ key }); // Fire event on successful update/delete
		} catch (err: any) {
			const refinedError = refineErrorForShim(
				err,
				this.#logService,
				`Memento.update(${storageKey})`,
			);
			this._logError(
				`Memento.update('${storageKey}') RPC failed: ${refinedError.message}`,
			);
			throw refinedError;
		}
	}

	public async keys(
		options?: MementoKeysOptions,
	): Promise<readonly string[]> {
		this._logDebug(
			`keys() called. Options: ${options ? JSON.stringify(options) : "none"}`,
		);
		if (!this.#mainThreadStorageProxy) {
			this._logError(
				"Cannot Memento.keys(): RPC proxy unavailable. Returning [].",
			);
			return Object.freeze([]);
		}
		if (!this.#mainThreadStorageProxy.$keys) {
			this._logWarn(
				"Memento.keys() unavailable: MainThreadProxy lacks '$keys'. Returning [].",
			);
			return Object.freeze([]);
		}
		try {
			const resultKeysArray = await this.#mainThreadStorageProxy.$keys(
				{ scope: this.#scope },
				options,
			);
			return Object.freeze(resultKeysArray || []);
		} catch (err: any) {
			const refinedError = refineErrorForShim(
				err,
				this.#logService,
				"Memento.keys() RPC",
			);
			this._logError(
				`Memento.keys() RPC failed: ${refinedError.message}`,
			);
			return Object.freeze([]);
		}
	}

	public setKeysForSync(_keys: readonly string[]): void {
		this._logWarn(
			`Memento.setKeysForSync called by ext '${this.#extensionIdForLog}'. NOP in Cocoon shim.`,
		);
	}

	public dispose(): void {
		this._disposables.dispose();
		this.#logService = undefined; // Help GC
	}
}

export class ShimExtHostStorage
	extends BaseCocoonShim
	implements VscodeIExtHostStorage
{
	public readonly _serviceBrand: undefined;
	#mainThreadStorageProxy: MainThreadStorageShape | null = null;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostStorage", rpcService, logService);
		this._logInfo("Initializing...");
		if (this._rpcService) {
			this.#mainThreadStorageProxy = this._getProxy(
				MainContext.MainThreadStorage as ProxyIdentifier<MainThreadStorageShape>,
			);
		}
		if (!this.#mainThreadStorageProxy) {
			this._logError(
				"CRITICAL: MainThreadStorage RPC proxy unavailable! Memento functionality will FAIL.",
			);
		}
	}

	public createMemento(
		extensionId: string,
		isGlobal: boolean,
	): VscodeMemento {
		const scopeName = isGlobal
			? "Global (Application)"
			: "Workspace (Profile)";
		this._logDebug(
			`Creating Memento for ExtId='${extensionId}', Scope='${scopeName}'`,
		);
		if (!this.#mainThreadStorageProxy) {
			const criticalErrorMsg = `Cannot create Memento for ext '${extensionId}' (Scope: ${scopeName}): MainThreadStorage RPC proxy unavailable. Extension state persistence will FAIL.`;
			this._logError(criticalErrorMsg);
			throw new Error(criticalErrorMsg);
		}
		return new ShimMementoImpl(
			extensionId,
			isGlobal,
			this.#mainThreadStorageProxy,
			this._logService,
		);
	}

	public async initialize(): Promise<void> {
		this._logDebug(
			"ExtHostStorage.initialize() called (NOP in this shim).",
		);
		return Promise.resolve();
	}
	public async optimize(): Promise<void> {
		this._logDebug("ExtHostStorage.optimize() called (NOP in this shim).");
		return Promise.resolve();
	}

	// $acceptValue is part of ExtHostStorageShape for MainThread to push changes.
	// If Cocoon's Memento is purely pull-based (extensions get/update, no external changes pushed),
	// then this method might not be actively used unless settings sync or shared storage scenarios are implemented.
	public $acceptValue(
		_shared: boolean,
		_key: string,
		_value: any | null,
	): void {
		this._logWarnOnce(
			`RPC $acceptValue called by MainThread. This indicates an external storage change. Cocoon's Memento shim currently does not have a central onDidChangeStorage event to propagate this widely. Individual Memento instances only fire onDidChange for their own updates. Key: ${_key}`,
		);
		// TODO: If a global onDidChangeStorage event is needed for IExtHostStorage consumers:
		// 1. Add _onDidChangeStorageEmitter to ShimExtHostStorage.
		// 2. Fire it here: this._onDidChangeStorageEmitter.fire({ shared, key, value: this._reviveApiArgument(value) });
	}

	public override dispose(): void {
		super.dispose();
		this._logInfo("Disposed.");
	}
}
