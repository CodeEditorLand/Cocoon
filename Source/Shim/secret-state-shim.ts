// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/134_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 6c17820e3fdd9c547c074bd802cd6aa15434b652fd92326c6b3ab7984081fc83
// Extracted to File: Backup/TSFMSC/Code/secret-state-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:57.040Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE secret-state-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Secrets Shim (secret-state-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.SecretStorage` API, typically accessed via `ExtensionContext.secrets`.
 * This service provides extensions with a secure way to store and retrieve sensitive data
 * (e.g., API tokens, passwords) by proxying these operations to the Mountain host process,
 * which is then responsible for interacting with the operating system's keychain or
 * credential store.
 *
 * Responsibilities:
 * - Implementing the `vscode.SecretStorage` interface methods: `get(key)`, `store(key, value)`,
 *   and `delete(key)`.
 * - Proxying these method calls to Mountain handlers (e.g., `secrets_get`, `secrets_store`,
 *   `secrets_delete`) via direct Vine IPC, using `sendToMountainAndWait` from `BaseCocoonShim`.
 * - Managing and firing the `onDidChange` event when a secret is stored or deleted
 *   through this shim. Full detection of external changes to the underlying store would
 *   require notifications from Mountain.
 * - Ensuring that communication with Mountain includes the necessary parameters (key, value)
 *   for the secret operations. The association with a specific extension is assumed to be
 *   handled by Mountain based on the calling context or a pre-configured IPC/RPC channel.
 *
 * Key Interactions:
 * - Provides the `vscode.SecretStorage` API, typically made available to extensions
 *   via their `ExtensionContext.secrets` property.
 * - Uses `sendToMountainAndWait` (from `BaseCocoonShim`, which uses `cocoon-ipc.ts`)
 *   for all IPC communication with Mountain.
 * - Relies on Mountain (e.g., `handlers/secrets.rs` or similar) to perform the actual
 *   interaction with the OS keychain or secure storage.
 * - Implements `VscodeIExtHostSecretState` for DI registration if this shim acts as
 *   the central ExtHost service for secrets.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// VS Code internal interface, if this shim is registered as such.
import type { IExtHostSecretState as VscodeIExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";

// Import types from the public 'vscode' API
import type { SecretStorage, SecretStorageChangeEvent } from "vscode";

import { sendToMountainAndWait } from "../cocoon-ipc"; // Direct IPC call
import {
	BaseCocoonShim,
	refineError, // Use refineErrorForShim for consistency if BaseCocoonShim provides it
	type IRpcProtocolServiceAdapter,
	type ILogServiceForShim,
} from "./_baseShim";

/**
 * Cocoon's implementation of `vscode.SecretStorage` and `IExtHostSecretState`.
 * It proxies secret storage operations to the Mountain host.
 */
export class ShimExtHostSecretState
	extends BaseCocoonShim
	implements SecretStorage, VscodeIExtHostSecretState
{
	public readonly _serviceBrand: undefined; // For IExtHostSecretState if registered with DI

	private readonly _onDidChangeEmitter = new VscodeEmitter<SecretStorageChangeEvent>();
	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> = this._onDidChangeEmitter.event;

	/**
	 * Creates an instance of ShimExtHostSecretState.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim, not directly used for IPC here).
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostSecretState", rpcService, logService);
		this._log("Initialized.");

		// This shim primarily makes outbound IPC calls. If Mountain needs to call methods
		// on this service (e.g., to notify of external credential changes),
		// it would need to be registered with the RPCService:
		// if (this._rpcService) {
		//    this._rpcService.set(ExtHostContext.ExtHostSecretState as ProxyIdentifier<VscodeIExtHostSecretState>, this);
		// }
	}

    /**
     * This shim uses direct IPC and does not strictly require RPC for its core functionality.
     */
    protected override _requiresRpc(): boolean {
        return false;
    }

	/**
	 * Retrieves a secret value associated with the given key.
	 * The secret is implicitly scoped to the calling extension by Mountain.
	 * @param key The key of the secret to retrieve.
	 * @returns A promise that resolves to the secret value, or `undefined` if not found or an error occurs.
	 */
	public async get(key: string): Promise<string | undefined> {
		if (!key || typeof key !== "string") {
			this._logError("SecretStorage.get: Invalid key provided.");
			return undefined;
		}
		this._log(`SecretStorage.get: Requesting secret for key='${key}' from Mountain.`);

		try {
			// Assuming Mountain's 'secrets_get' handler can determine the extension context
			// without an explicit extensionId in the payload for direct IPC.
			// If extensionId were required: sendToMountainAndWait("secrets_get", { key, extensionId: this._extensionId });
			const result = await sendToMountainAndWait("secrets_get", { key }, 3000);
			return result as string | undefined; // Cast, as IPC might return null for not found
		} catch (error: any) {
			// Use refineErrorForShim for consistency if it's better than BaseCocoonShim's refineError
			const refinedError = refineErrorForShim(error, this._logService, `SecretStorage.get(${key})`);
			this._logError(`SecretStorage.get failed for key='${key}':`, refinedError.message);
			// The API contract for SecretStorage.get is to return undefined if not found or on error.
			return undefined;
		}
	}

	/**
	 * Stores a secret value associated with the given key.
	 * The secret is implicitly scoped to the calling extension by Mountain.
	 * @param key The key for the secret.
	 * @param value The secret value to store.
	 * @returns A promise that resolves when the secret is stored, or rejects on error.
	 */
	public async store(key: string, value: string): Promise<void> {
		if (!key || typeof key !== "string") {
			this._logError("SecretStorage.store: Invalid key provided.");
			throw new Error("Invalid key for storing secret.");
		}
		if (typeof value !== "string") {
            this._logError("SecretStorage.store: Value must be a string.");
			throw new Error("Secret value must be a string.");
        }
		this._log(`SecretStorage.store: Storing secret for key='${key}' with Mountain.`);

		try {
			await sendToMountainAndWait("secrets_store", { key, value }, 3000);
			this._onDidChangeEmitter.fire({ key }); // Fire event on successful store
		} catch (error: any) {
			const refinedError = refineErrorForShim(error, this._logService, `SecretStorage.store(${key})`);
			this._logError(`SecretStorage.store failed for key='${key}':`, refinedError.message);
			throw refinedError; // Rethrow to signal failure to the extension
		}
	}

	/**
	 * Deletes a secret associated with the given key.
	 * The secret is implicitly scoped to the calling extension by Mountain.
	 * @param key The key of the secret to delete.
	 * @returns A promise that resolves when the secret is deleted, or rejects on error.
	 */
	public async delete(key: string): Promise<void> {
		if (!key || typeof key !== "string") {
			this._logError("SecretStorage.delete: Invalid key provided.");
			throw new Error("Invalid key for deleting secret.");
		}
		this._log(`SecretStorage.delete: Deleting secret for key='${key}' with Mountain.`);

		try {
			await sendToMountainAndWait("secrets_delete", { key }, 3000);
			this._onDidChangeEmitter.fire({ key }); // Fire event on successful delete
		} catch (error: any) {
			const refinedError = refineErrorForShim(error, this._logService, `SecretStorage.delete(${key})`);
			this._logError(`SecretStorage.delete failed for key='${key}':`, refinedError.message);
			throw refinedError; // Rethrow to signal failure
		}
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // Calls _instanceDisposables.dispose()
		this._onDidChangeEmitter.dispose();
	}

	// TODO: If VscodeIExtHostSecretState includes methods like $acceptSecretsChanged(keys: string[])
	// for Mountain to notify this service of external changes, implement them here.
	// public $acceptSecretsChanged(keys: string[]): void {
	//     this._log(`RPC $acceptSecretsChanged received for keys: [${keys.join(', ')}]`);
	//     keys.forEach(key => this._onDidChangeEmitter.fire({ key }));
	// }
}
--- END OF FILE secret-state-shim.ts ---