/*---------------------------------------------------------------------------------------------
 * Cocoon Secrets Shim 
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
 * - Implementing the `vscode.SecretStorage` interface methods: `get(key)`,
 *   `store(key, value)`, and `delete(key)`.
 * - Storing the `extensionId` for which this `SecretStorage` instance is scoped. This ID
 *   is crucial for namespacing secrets within the OS keychain on the Mountain side.
 * - Proxying `get`, `store`, and `delete` operations to Mountain via IPC, using
 *   standard VS Code RPC method names and argument arrays like `[extensionId, key, value?]`.
 * - Managing and firing the `onDidChange` event when a secret is successfully
 *   stored or deleted through this shim instance.
 *
 * Key Interactions:
 * - Instantiated per extension (e.g., when `ExtensionContext.secrets` is accessed).
 * - Uses `BaseCocoonShim._ipcRequestResponse` for all IPC communication with Mountain,
 *   which sends messages that Mountain's Track dispatcher can route as RPC calls.
 * - Relies on Mountain's secrets handlers (e.g., `handlers/secrets.rs` via `SecretsProvider`
 *   effects) for OS keychain interaction using the `keyring` crate.
 * - Implements `VscodeIExtHostSecretState` for DI registration if this shim were to act
 *   as the central ExtHost service for secrets, though instances are typically per-extension.
 *
 * Assumed IPC Contract with Mountain (mimicking VS Code RPC via Track dispatcher):
 * - Method "$getPassword":
 *   - Cocoon Params (sent as array): `[extensionId: string, key: string]`
 *   - Mountain Response (Success, from effects): `{ params: string | null | undefined }` (null/undefined if not found)
 * - Method "$setPassword":
 *   - Cocoon Params (sent as array): `[extensionId: string, key: string, value: string]`
 *   - Mountain Response (Success, from effects): `{ params: null }` (or void-like)
 * - Method "$deletePassword":
 *   - Cocoon Params (sent as array): `[extensionId: string, key: string]`
 *   - Mountain Response (Success, from effects): `{ params: null }` (or void-like)
 * Errors from Mountain are expected as VineErrorPayload.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	type Event as VscodeEvent,
} from "vs/base/common/event";
// VS Code internal interface, if this shim is registered as such for DI.
import type { IExtHostSecretState as VscodeIExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
// Import types from the public 'vscode' API
import type { SecretStorage, SecretStorageChangeEvent } from "vscode";

// BaseCocoonShim provides _ipcRequestResponse which uses sendToMountainAndWait
import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

/**
 * Cocoon's implementation of `vscode.SecretStorage`.
 * It proxies secret storage operations to the Mountain host, scoped to a specific extension,
 * using standard VS Code RPC method names conventions for IPC calls.
 */
export class ShimExtHostSecretState
	extends BaseCocoonShim
	implements SecretStorage, VscodeIExtHostSecretState
{
	// Implement both for DI and API shape
	public readonly _serviceBrand: undefined; // For VscodeIExtHostSecretState DI compatibility

	private readonly _onDidChangeEmitter = this._instanceDisposables.add(
		new VscodeEmitter<SecretStorageChangeEvent>(),
	);
	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> =
		this._onDidChangeEmitter.event;

	private readonly _extensionId: string; // ID of the extension this instance is for

	/**
	 * Creates an instance of ShimExtHostSecretState.
	 * @param rpcService The RPC service adapter (passed to BaseCocoonShim).
	 * @param logService The logging service.
	 * @param extensionId The identifier of the extension to which these secrets belong. This is crucial for namespacing secrets.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined, // For BaseCocoonShim consistency
		logService: ILogServiceForShim | undefined,
		extensionId: string, // Crucial for namespacing secrets on the Mountain side
	) {
		super(`ExtHostSecretState[${extensionId}]`, rpcService, logService);
		if (
			!extensionId ||
			typeof extensionId !== "string" ||
			extensionId.trim() === ""
		) {
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

	/**
	 * This shim uses direct IPC (via _ipcRequestResponse which calls sendToMountainAndWait)
	 * to send messages that are then interpreted as RPC calls by Mountain's Track dispatcher.
	 * It does not rely on _getProxy for its core functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc vscode.SecretStorage.get}
	 * Retrieves a secret for the current extension.
	 */
	public async get(key: string): Promise<string | undefined> {
		if (!key || typeof key !== "string" || key.trim() === "") {
			this._logError(
				"SecretStorage.get: Invalid key. Must be a non-empty string.",
				"Key:",
				key,
			);
			return undefined; // API contract: undefined for invalid key
		}
		this._logService?.trace(
			`SecretStorage.get: Requesting key='${key}' for ext='${this._extensionId}'.`,
		);

		try {
			// IPC method name matches VS Code's MainThreadSecretState RPC method "$getPassword".
			// Parameters are sent as an array by BaseCocoonShim's _ipcRequestResponse when `params` is an array.
			const result = await this._ipcRequestResponse(
				"$getPassword", // Standard VS Code RPC method name
				[this._extensionId, key], // Argument as an array: [extensionId, key]
				3000, // Timeout for the IPC call
			);
			// Mountain's effect handler for $getPassword should return { params: string | null | undefined }
			// Our _ipcRequestResponse (if it directly returns the `params` field from such a payload)
			// will give us string | null | undefined.
			return result === null ? undefined : (result as string | undefined);
		} catch (error: any) {
			// _ipcRequestResponse already refines and logs the error details.
			this._logError(
				`SecretStorage.get failed for key='${key}', ext='${this._extensionId}'. Error already logged by IPC layer.`,
			);
			return undefined; // API contract: undefined on error or if not found
		}
	}

	/**
	 * {@inheritDoc vscode.SecretStorage.store}
	 * Stores a secret for the current extension.
	 */
	public async store(key: string, value: string): Promise<void> {
		if (!key || typeof key !== "string" || key.trim() === "") {
			const msg =
				"SecretStorage.store: Invalid key. Must be a non-empty string.";
			this._logError(msg, "Key:", key);
			throw new Error(msg);
		}
		if (typeof value !== "string") {
			const msg = "SecretStorage.store: Value must be a string.";
			this._logError(msg, "Value type:", typeof value);
			throw new Error(msg);
		}
		this._logService?.trace(
			`SecretStorage.store: Storing key='${key}' for ext='${this._extensionId}'.`,
		);

		try {
			// Standard VS Code RPC method name "$setPassword".
			// Parameters: [extensionId, key, value]
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
			throw refineErrorForShim(
				error,
				this._logService,
				`SecretStorage.store(key: ${key})`,
			); // Rethrow refined error
		}
	}

	/**
	 * {@inheritDoc vscode.SecretStorage.delete}
	 * Deletes a secret for the current extension.
	 */
	public async delete(key: string): Promise<void> {
		if (!key || typeof key !== "string" || key.trim() === "") {
			const msg =
				"SecretStorage.delete: Invalid key. Must be a non-empty string.";
			this._logError(msg, "Key:", key);
			throw new Error(msg);
		}
		this._logService?.trace(
			`SecretStorage.delete: Deleting key='${key}' for ext='${this._extensionId}'.`,
		);

		try {
			// Standard VS Code RPC method name "$deletePassword".
			// Parameters: [extensionId, key]
			// Note: VS Code's MainThreadSecretState.$setPassword also handles deletion if value is null.
			// Using a dedicated $deletePassword is cleaner if Mountain supports it.
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
			throw refineErrorForShim(
				error,
				this._logService,
				`SecretStorage.delete(key: ${key})`,
			); // Rethrow refined error
		}
	}

	/**
	 * Disposes of resources held by this shim instance, primarily the event emitter.
	 */
	public override dispose(): void {
		super.dispose(); // Handles _onDidChangeEmitter via _instanceDisposables in BaseCocoonShim
		this._logInfo(
			`Disposed SecretStorage instance for extension '${this._extensionId}'.`,
		);
	}

	// If this service were to handle RPC calls from Mountain (e.g., for external credential changes):
	// public $onSecretsChanged(event: SecretStorageChangeEvent): void {
	//     this._logDebug(`RPC $onSecretsChanged received for key: ${event.key}`);
	//     this._onDidChangeEmitter.fire(event);
	// }
}
