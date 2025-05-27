/*---------------------------------------------------------------------------------------------
 * Cocoon Secrets Shim (secret-state-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.SecretStorage` API, typically accessed via an extension's
 * `ExtensionContext.secrets` property. This service provides extensions with a secure
 * mechanism to store and retrieve sensitive data (e.g., API tokens, passwords).
 *
 * Operations are proxied to the Mountain host process, which is responsible for
 * interacting with the operating system's native keychain or credential store
 * (e.g., macOS Keychain, Windows Credential Manager, Linux Secret Service API).
 * This shim makes RPC-like calls using standard VS Code method names (e.g., "$getPassword")
 * via Cocoon's direct IPC mechanism (`_ipcRequestResponse`). These calls are then
 * typically processed by Mountain's effects system (e.g., `track.rs` dispatching to
 * `SecretsProvider` effects), which in turn call the underlying handlers
 * (e.g., in `handlers/secrets.rs` using the `keyring` crate).
 *
 * Responsibilities:
 * - Implementing the `vscode.SecretStorage` interface methods: `get(key)`, *   `store(key, value)`, and `delete(key)`.
 * - Storing the `extensionId` for which this `SecretStorage` instance is scoped. This ID
 *   is crucial for namespacing secrets within the OS keychain on the Mountain side.
 * - Proxying `get`, `store`, and `delete` operations to Mountain via IPC, using
 *   standard VS Code RPC method names (`$getPassword`, `$setPassword`, `$deletePassword`)
 *   and sending parameters as an array `[extensionId, key, value?]`.
 * - Managing and firing the `onDidChange` event when a secret is successfully
 *   stored or deleted through this shim instance.
 *
 * Key Interactions:
 * - An instance of this class (or a class that composes it) is typically
 *   instantiated by `ExtHostExtensionService` (or its shim) when creating an
 *   `ExtensionContext` for an extension, providing the necessary `extensionId`.
 * - Uses `BaseCocoonShim._ipcRequestResponse` (which itself uses `sendToMountainAndWait`
 *   from `cocoon-ipc.ts`) for all IPC communication with Mountain.
 * - Relies on Mountain's `handlers/secrets.rs` (invoked via `SecretsProvider` effects, *   dispatched by `track.rs`) to perform the actual interaction with the OS keychain.
 * - Implements `VscodeIExtHostSecretState` for Dependency Injection registration if this
 *   shim (or a factory for it) acts as the central ExtHost service for secrets, although
 *   instances are typically per-extension.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// VS Code internal interface, if this shim were to be registered as a singleton service using this DI key.
// However, SecretStorage is usually per-extension via ExtensionContext.
import type { IExtHostSecretState as VscodeIExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
// Import types from the public 'vscode' API that this shim implements.
import type { SecretStorage, SecretStorageChangeEvent } from "vscode";

// BaseCocoonShim provides _ipcRequestResponse which uses sendToMountainAndWait from cocoon-ipc.ts.
import {
	BaseCocoonShim,
	// Use the more specific error refiner
	refineErrorForShim,
	// For BaseCocoonShim constructor
	type ILogServiceForShim,
	// For BaseCocoonShim constructor
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Cocoon's implementation of `vscode.SecretStorage`.
 * It proxies secret storage operations to the Mountain host, scoped to a specific extension, * using standard VS Code RPC method names tunnelled over direct IPC.
 * This class can also fulfill the `VscodeIExtHostSecretState` interface if used as a central service, * but its instances are typically created per extension.
 */
export class ShimExtHostSecretState
	extends BaseCocoonShim
	implements SecretStorage, VscodeIExtHostSecretState
{
	// For VscodeIExtHostSecretState DI compatibility.
	public readonly _serviceBrand: undefined;

	private readonly _onDidChangeEmitter =
		new VscodeEmitter<SecretStorageChangeEvent>();

	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> =
		this._onDidChangeEmitter.event;

	// The ID of the extension this SecretStorage instance is for.
	private readonly _extensionId: string;

	/**
	 * Creates an instance of ShimExtHostSecretState.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim, not directly used by this shim's core IPC logic).
	 * @param logService The logging service instance.
	 * @param extensionId The identifier of the extension to which these secrets belong. This is crucial for
	 *                    namespacing secrets in the OS keychain via Mountain.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,

		// Extension ID is required for proper namespacing.
		extensionId: string,
	) {
		// Use a more specific service identifier for logging if this class instance is per-extension.
		super(`ExtHostSecretState[${extensionId}]`, rpcService, logService);

		this._extensionId = extensionId;

		this._logInfo(
			`Initialized SecretStorage for extension '${this._extensionId}'.`,
		);

		// If this class were to also handle incoming RPCs (e.g., from Mountain for external credential changes),

		// it would need to be registered with the RPCService using a specific ExtHostContext identifier.
		// Example:
		// if (this._rpcService) {

		//    this._rpcService.set(ExtHostContext.ExtHostSecretState as ProxyIdentifier<VscodeIExtHostSecretState>, this);

		// }
	}

	/**
	 * This shim uses direct IPC (via `_ipcRequestResponse`, which in turn calls `sendToMountainAndWait`)
	 * to send messages that are then interpreted as RPC-like calls by Mountain's Track dispatcher.
	 * It does not rely on `BaseCocoonShim._getProxy` for its core secret storage functionality.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc vscode.SecretStorage.get}
	 *
	 *
	 *
	 * Retrieves a secret value associated with the given key for the current extension.
	 * @param key The key of the secret to retrieve. Must be a non-empty string.
	 * @returns A promise that resolves to the secret string value if found,
	 *
	 *
	 *          or `undefined` if the secret is not found or an error occurs during retrieval.
	 */
	public async get(key: string): Promise<string | undefined> {
		if (!key || typeof key !== "string") {
			this._logError(
				"SecretStorage.get: Invalid key provided. Key must be a non-empty string.",
			);

			// Consistent with native SecretStorage, return undefined for invalid key.
			return undefined;
		}

		this._logService?.trace(
			`SecretStorage.get: Requesting secret for key='${key}' for extension '${this._extensionId}'.`,
		);

		try {
			// This shim uses direct IPC, but the method name and parameters are structured like a standard VS Code RPC call
			// to `MainThreadSecretState.$getPassword(extensionId: string, key: string)`.
			// Mountain's `track.rs` (or equivalent dispatcher) is expected to route this to the appropriate effect/handler.
			const result = await this._ipcRequestResponse(
				// Standard VS Code RPC method name for getting a secret.
				"$getPassword",

				// Arguments as an array [extensionId, key].
				[this._extensionId, key],

				// Timeout for the operation.
				3000,
			);

			// IPC might return null if not found, which should be treated as undefined by the API.
			return result === null ? undefined : (result as string | undefined);
		} catch (error: any) {
			const refinedError = refineErrorForShim(
				error,

				this._logService,

				`SecretStorage.get(key: ${key}) for ext: ${this._extensionId}`,
			);

			this._logError(
				`SecretStorage.get for key='${key}' (ext: ${this._extensionId}) failed: ${refinedError.message}`,
			);

			// The API contract for `SecretStorage.get` is to return `undefined` if not found or on error.
			return undefined;
		}
	}

	/**
	 * {@inheritDoc vscode.SecretStorage.store}
	 *
	 *
	 *
	 * Stores a secret value associated with the given key for the current extension.
	 * @param key The key for the secret. Must be a non-empty string.
	 * @param value The secret value to store. Must be a string.
	 * @returns A promise that resolves when the secret is successfully stored, or rejects on error.
	 */
	public async store(key: string, value: string): Promise<void> {
		if (!key || typeof key !== "string") {
			const msg =
				"SecretStorage.store: Invalid key provided. Key must be a non-empty string.";

			this._logError(msg);

			// Throw error for invalid arguments as per API behavior.
			throw new Error(msg);
		}

		if (typeof value !== "string") {
			const msg =
				"SecretStorage.store: Value to be stored must be a string.";

			this._logError(msg);

			throw new Error(msg);
		}

		this._logService?.trace(
			`SecretStorage.store: Storing secret for key='${key}' for extension '${this._extensionId}'.`,
		);

		try {
			// Standard VS Code RPC: `$setPassword(extensionId: string, key: string, value: string): Promise<void>;`
			await this._ipcRequestResponse(
				// Standard RPC method name for storing a secret.
				"$setPassword",

				// Arguments as an array [extensionId, key, value].
				[this._extensionId, key, value],

				3000,
			);

			// Fire event on successful store.
			this._onDidChangeEmitter.fire({ key });

			this._logDebug(
				`Secret successfully stored for key='${key}' (ext: ${this._extensionId}).`,
			);
		} catch (error: any) {
			const refinedError = refineErrorForShim(
				error,

				this._logService,

				`SecretStorage.store(key: ${key}) for ext: ${this._extensionId}`,
			);

			this._logError(
				`SecretStorage.store for key='${key}' (ext: ${this._extensionId}) failed: ${refinedError.message}`,
			);

			// Rethrow to signal failure to the extension.
			throw refinedError;
		}
	}

	/**
	 * {@inheritDoc vscode.SecretStorage.delete}
	 *
	 *
	 *
	 * Deletes a secret associated with the given key for the current extension.
	 * @param key The key of the secret to delete. Must be a non-empty string.
	 * @returns A promise that resolves when the secret is successfully deleted, or rejects on error.
	 */
	public async delete(key: string): Promise<void> {
		if (!key || typeof key !== "string") {
			const msg =
				"SecretStorage.delete: Invalid key provided. Key must be a non-empty string.";

			this._logError(msg);

			throw new Error(msg);
		}

		this._logService?.trace(
			`SecretStorage.delete: Deleting secret for key='${key}' for extension '${this._extensionId}'.`,
		);

		try {
			// Standard VS Code RPC: `$deletePassword(extensionId: string, key: string): Promise<void>;`
			await this._ipcRequestResponse(
				// Standard RPC method name for deleting a secret.
				"$deletePassword",

				// Arguments as an array [extensionId, key].
				[this._extensionId, key],

				3000,
			);

			// Fire event on successful delete.
			this._onDidChangeEmitter.fire({ key });

			this._logDebug(
				`Secret successfully deleted for key='${key}' (ext: ${this._extensionId}).`,
			);
		} catch (error: any) {
			const refinedError = refineErrorForShim(
				error,

				this._logService,

				`SecretStorage.delete(key: ${key}) for ext: ${this._extensionId}`,
			);

			this._logError(
				`SecretStorage.delete for key='${key}' (ext: ${this._extensionId}) failed: ${refinedError.message}`,
			);

			// Rethrow to signal failure.
			throw refinedError;
		}
	}

	/**
	 * Disposes of resources held by this `SecretStorage` instance, primarily its event emitter.
	 */
	public override dispose(): void {
		// Handles `_instanceDisposables` from `BaseCocoonShim`.
		super.dispose();

		this._onDidChangeEmitter.dispose();

		this._logInfo(
			`Disposed SecretStorage instance for extension '${this._extensionId}'.`,
		);
	}

	// If this service were to handle RPC calls from Mountain (e.g., for external credential changes
	// that Mountain detected and needs to propagate to ExtHost), methods like this would be implemented:
	// public $onSecretsChangedExternally(event: VscodeSecretStorageChangeEvent): void {

	//     this._logInfo(`RPC $onSecretsChangedExternally received for key: ${event.key} (ext: ${this._extensionId}). Firing onDidChange.`);

	//     this._onDidChangeEmitter.fire(event);

	// }
}
