/*---------------------------------------------------------------------------------------------
 * Cocoon Secrets Shim (secret-state-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.SecretStorage` API, typically accessed via an extension's
 * `ExtensionContext.secrets` property. This service provides extensions with a secure
 * mechanism to store and retrieve sensitive data (e.g., API tokens, passwords).
 *
 * Operations are proxied to the Mountain host process, which is responsible for
 * interacting with the operating system's native keychain or credential store.
 * This shim makes IPC calls (using `_ipcRequestResponse` from `BaseCocoonShim`) that
 * mimic standard VS Code RPC method names (e.g., "$getPassword") and parameter structures.
 * These calls are then typically processed by Mountain's effects system, leading to
 * handlers that use libraries like `keyring`.
 *
 * Responsibilities:
 * - Implementing the `vscode.SecretStorage` interface methods: `get(key)`, *   `store(key, value)`, and `delete(key)`.
 * - Storing the `extensionId` for which this `SecretStorage` instance is scoped. This ID
 *   is crucial for namespacing secrets within the OS keychain on the Mountain side.
 * - Proxying `get`, `store`, and `delete` operations to Mountain via IPC, using
 *   standard VS Code RPC method names and argument arrays like `[extensionId, key, value?]`.
 * - Marshalling `value: undefined` in `store()` to `null` for IPC to signal deletion.
 * - Managing and firing the `onDidChange` event when a secret is successfully
 *   stored or deleted through this shim instance.
 *
 * Key Interactions:
 * - Instantiated per extension (e.g., when `ExtensionContext.secrets` is accessed).
 * - Uses `BaseCocoonShim._ipcRequestResponse` for all IPC communication with Mountain.
 * - Relies on Mountain's secrets handlers (e.g., using `keyring` crate) for OS keychain interaction.
 * - Can fulfill `VscodeIExtHostSecretState` for DI if needed as a central factory,
 *   though instances are typically per-extension.
 *
 * Assumed IPC Contract with Mountain (mimicking VS Code RPC):
 * - Method "$getPassword":
 *   - Cocoon Params: `[extensionId: string, key: string]`
 *   - Mountain Response (Success): `{ params: string | null | undefined }` (null/undefined if not found)
 * - Method "$setPassword":
 *   - Cocoon Params: `[extensionId: string, key: string, value: string | null]` (null value means delete)
 *   - Mountain Response (Success): `{ params: null }`
 * - Method "$deletePassword":
 *   - Cocoon Params: `[extensionId: string, key: string]`
 *   - Mountain Response (Success): `{ params: null }`
 * Errors from Mountain are expected as VineErrorPayload.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
import type { IExtHostSecretState as VscodeIExtHostSecretState } from "vs/workbench/api/common/extHostSecretState"; // For DI type compatibility
import type { SecretStorage, SecretStorageChangeEvent } from "vscode"; // Public API types

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

export class ShimExtHostSecretState
	extends BaseCocoonShim
	implements SecretStorage, VscodeIExtHostSecretState
{
	// Fulfills both API and potential DI interface
	public readonly _serviceBrand: undefined; // For VscodeIExtHostSecretState DI compatibility
	private readonly _onDidChangeEmitter = this._instanceDisposables.add(
		new VscodeEmitter<SecretStorageChangeEvent>(),
	);
	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> =
		this._onDidChangeEmitter.event;
	private readonly _extensionId: string; // ID of the extension this instance is for

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined, // For BaseCocoonShim
		logService: ILogServiceForShim | undefined,
		extensionId: string, // Crucial for namespacing secrets
	) {
		super(`ExtHostSecretState[${extensionId}]`, rpcService, logService);
		if (!extensionId || typeof extensionId !== "string") {
			const errMsg =
				"ShimExtHostSecretState constructor: extensionId must be a non-empty string.";
			this._logError(errMsg);
			throw new Error(errMsg); // Fail fast if extensionId is invalid
		}
		this._extensionId = extensionId;
		this._logInfo(
			`Initialized SecretStorage for extension '${this._extensionId}'.`,
		);
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Uses direct IPC

	public async get(key: string): Promise<string | undefined> {
		if (!key || typeof key !== "string") {
			this._logError(
				"SecretStorage.get: Invalid key. Must be non-empty string.",
				"Key:",
				key,
			);
			return undefined; // API contract: undefined for invalid key
		}
		this._logService?.trace(
			`SecretStorage.get: Requesting key='${key}' for ext='${this._extensionId}'.`,
		);
		try {
			// IPC method name matches VS Code's MainThreadSecretState RPC method
			const result = await this._ipcRequestResponse(
				"$getPassword",
				[this._extensionId, key],
				3000,
			);
			return result === null ? undefined : (result as string | undefined);
		} catch (error: any) {
			// _ipcRequestResponse already refines and logs the error message/stack
			this._logError(
				`SecretStorage.get failed for key='${key}', ext='${this._extensionId}'. Error already logged by IPC layer.`,
			);
			return undefined; // API contract: undefined on error
		}
	}

	public async store(key: string, value: string): Promise<void> {
		if (!key || typeof key !== "string") {
			const msg =
				"SecretStorage.store: Invalid key. Must be non-empty string.";
			this._logError(msg, "Key:", key);
			throw new Error(msg);
		}
		if (typeof value !== "string") {
			// API requires string value
			const msg = "SecretStorage.store: Value must be a string.";
			this._logError(msg, "Value type:", typeof value);
			throw new Error(msg);
		}
		this._logService?.trace(
			`SecretStorage.store: Storing key='${key}' for ext='${this._extensionId}'.`,
		);
		try {
			// Value `undefined` is not possible due to type signature, but if it were, it would mean delete.
			// The IPC payload `[this._extensionId, key, value]` handles string values.
			// Deletion via store(key, undefined) is handled by extensions calling .delete(key)
			await this._ipcRequestResponse(
				"$setPassword",
				[this._extensionId, key, value],
				3000,
			);
			this._onDidChangeEmitter.fire({ key });
			this._logDebug(
				`Secret stored for key='${key}', ext='${this._extensionId}'.`,
			);
		} catch (error: any) {
			this._logError(
				`SecretStorage.store failed for key='${key}', ext='${this._extensionId}'. Error already logged by IPC layer.`,
			);
			throw error; // Rethrow to signal failure to extension
		}
	}

	public async delete(key: string): Promise<void> {
		if (!key || typeof key !== "string") {
			const msg =
				"SecretStorage.delete: Invalid key. Must be non-empty string.";
			this._logError(msg, "Key:", key);
			throw new Error(msg);
		}
		this._logService?.trace(
			`SecretStorage.delete: Deleting key='${key}' for ext='${this._extensionId}'.`,
		);
		try {
			// For deletion via $setPassword, the value should be null.
			// Using a dedicated $deletePassword matches VS Code's internal RPC more closely.
			await this._ipcRequestResponse(
				"$deletePassword",
				[this._extensionId, key],
				3000,
			);
			this._onDidChangeEmitter.fire({ key });
			this._logDebug(
				`Secret deleted for key='${key}', ext='${this._extensionId}'.`,
			);
		} catch (error: any) {
			this._logError(
				`SecretStorage.delete failed for key='${key}', ext='${this._extensionId}'. Error already logged by IPC layer.`,
			);
			throw error; // Rethrow to signal failure
		}
	}

	public override dispose(): void {
		super.dispose(); // Handles _onDidChangeEmitter via _instanceDisposables
		this._logInfo(
			`Disposed SecretStorage instance for extension '${this._extensionId}'.`,
		);
	}
}
