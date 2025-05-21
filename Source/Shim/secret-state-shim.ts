/*---------------------------------------------------------------------------------------------
 * Cocoon Secrets Shim (secret-state-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.SecretStorage` API (via `IExtHostSecretState`) for Cocoon.
 * Provides extensions with a way to securely store and retrieve sensitive data using
 * the operating system's keychain or credential store, proxied via Mountain.
 *
 * Responsibilities:
 * - Implementing the `vscode.SecretStorage` interface methods (`get`, `store`, `delete`).
 * - Proxying these method calls to Mountain handlers (`secrets_get`, `secrets_store`,
 *
 *   `secrets_delete`) via direct Vine IPC (`sendToMountainAndWait`).
 * - Implementing the `onDidChange` event emitter, which fires when secrets are changed
 *   through this shim. Full external change detection would require notifications from Mountain.
 * - Passing extension ID, key, and value to Mountain.
 *
 * Key Interactions:
 * - Provides the `vscode.SecretStorage` API (typically accessed via `ExtensionContext.secrets`).
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.ts` for IPC.
 * - Relies on Mountain (`handlers/secrets.rs` or similar) to interact with the OS keychain.
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// VS Code internal interface
import { IExtHostSecretState as VscodeIExtHostSecretState } from "vs/workbench/api/common/extHostSecretState";
// IExtHostRpcService is not used if all calls are direct IPC
// import { IExtHostRpcService } from "./_baseShim";

// From vscode API
import { SecretStorage, SecretStorageChangeEvent } from "vscode";

import { sendToMountainAndWait } from "../cocoon-ipc";

// TODO: Ensure VscodeIExtHostSecretState is correctly imported or defined locally if not available.

// --- Type Definitions ---

// This shim implements the vscode.SecretStorage API, which is often what IExtHostSecretState provides.
// The IExtHostSecretState interface in VS Code might have additional internal methods or properties.
// For this shim, we primarily target the public vscode.SecretStorage API.
// TODO: If specific IExtHostSecretState internal methods are needed, add them.
export class ShimExtHostSecretState
	implements SecretStorage, VscodeIExtHostSecretState
{
	/* if needed */ // For IExtHostSecretState if registered with DI
	public readonly _serviceBrand: undefined;

	private readonly _onDidChangeEmitter =
		new VscodeEmitter<SecretStorageChangeEvent>();

	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> =
		this._onDidChangeEmitter.event;

	// rpcService: IExtHostRpcService | undefined // Not used if direct IPC is the sole method
	constructor() {
		// logService: ILogService | undefined // Could be added from BaseCocoonShim if logging needed here
		console.log("[Cocoon Shim] ShimExtHostSecretState initialized.");

		// TODO: If this service needs to receive RPC calls (e.g., for external change notifications),

		// it should register itself:
		// if (rpcService) {

		//    rpcService.set(ExtHostContext.ExtHostSecretState, this);

		// }
	}

	public async get(key: string): Promise<string | undefined> {
		// The `extensionId` is usually implicit in `IExtHostSecretState` context,

		// but the IPC call to Mountain `secrets_get` in the original JS shim required it.
		// This implies that the `SecretStorage` instance given to an extension
		// is already scoped to that extension, or this service needs the `extensionId`.
		// The `vscode.SecretStorage` API itself doesn't take `extensionId`.
		// This suggests `ShimExtHostSecretState` might be instantiated per extension,

		// or the `extensionId` needs to be passed/known some other way if this is a singleton service.

		// Assuming `extensionId` needs to be known by this service instance.
		// This is a deviation from typical `IExtHostSecretState` which is often a singleton.
		// Let's assume for now that `sendToMountainAndWait` for `secrets_get` needs it,

		// and it's passed implicitly or this class is instantiated per extension.
		// For this example, I'll remove `extensionId` from the method signature
		// and assume it's handled by Mountain based on the calling context or a global/session extension ID.
		// If not, the design needs to be revisited.

		// Placeholder for how to get it
		// const currentExtensionId = this._getExtensionId();

		// if (!currentExtensionId) {

		//     console.error("[Cocoon Shim] SecretState.get: Cannot determine extension ID.");

		//     return undefined;

		// }

		// For now, let's assume the original IPC handler in Mountain `secrets_get` was expecting it.
		// This part of the design (how extensionId is passed for secrets) is crucial.
		// If this service is a singleton injected into ExtensionContext, then ExtensionContext
		// would call `this.secretState.get(this._extensionId, key)`.
		// So, the `extensionId` parameter was likely intended for the service interface.
		// Let's assume the method signature on *this service* should include extensionId.

		console.log(
			`[Cocoon Shim] SecretState.get requesting from Mountain: key=${key}. (Extension ID context assumed by Mountain or pre-configured for IPC)`,
		);

		try {
			const result = await sendToMountainAndWait(
				// IPC method name
				"secrets_get",

				// Params for Mountain
				{ key /*, extensionId: currentExtensionId */ },

				// Timeout
				3000,
			);

			return result as string | undefined;
		} catch (error: any) {
			console.error(
				`[Cocoon Shim] SecretState.get failed for key=${key}:`,

				error.message,
			);

			// API typically returns undefined on error or if not found
			return undefined;
		}
	}

	public async store(key: string, value: string): Promise<void> {
		// const currentExtensionId = this._getExtensionId();

		// if (!currentExtensionId) {

		//     console.error("[Cocoon Shim] SecretState.store: Cannot determine extension ID.");

		//     throw new Error("Cannot determine extension ID for storing secret.");

		// }

		console.log(
			`[Cocoon Shim] SecretState.store requesting from Mountain: key=${key}. (Extension ID context assumed)`,
		);

		try {
			await sendToMountainAndWait(
				"secrets_store",

				{ key, value /*, extensionId: currentExtensionId */ },

				3000,
			);

			// Fire event on successful store
			this._onDidChangeEmitter.fire({ key });
		} catch (error: any) {
			console.error(
				`[Cocoon Shim] SecretState.store failed for key=${key}:`,

				error.message,
			);

			// Rethrow to signal failure to the extension
			throw error;
		}
	}

	public async delete(key: string): Promise<void> {
		// const currentExtensionId = this._getExtensionId();

		// if (!currentExtensionId) {

		//     console.error("[Cocoon Shim] SecretState.delete: Cannot determine extension ID.");

		//     throw new Error("Cannot determine extension ID for deleting secret.");

		// }

		console.log(
			`[Cocoon Shim] SecretState.delete requesting from Mountain: key=${key}. (Extension ID context assumed)`,
		);

		try {
			await sendToMountainAndWait(
				"secrets_delete",

				{ key /*, extensionId: currentExtensionId */ },

				3000,
			);

			// Fire event on successful delete
			this._onDidChangeEmitter.fire({ key });
		} catch (error: any) {
			console.error(
				`[Cocoon Shim] SecretState.delete failed for key=${key}:`,

				error.message,
			);

			// Rethrow to signal failure
			throw error;
		}
	}

	// The original JS shim had onDidChangePassword. The vscode.SecretStorage API has onDidChange.
	// This is correctly implemented with _onDidChangeEmitter.

	// TODO: If VscodeIExtHostSecretState includes methods like $acceptSecretsChanged(keys: string[])
	// for Mountain to notify this service of external changes, implement them here.
	// public $acceptSecretsChanged(keys: string[]): void {

	//     keys.forEach(key => this._onDidChangeEmitter.fire({ key }));

	// }

	// Placeholder for how extension ID might be obtained if this is a singleton service
	// private _getExtensionId(): string | undefined {

	// This would need to be implemented, e.g., by getting it from an injected
	//
	// IExtHostInitDataService or if this service is contextually aware.
	//
	// For now, this is a conceptual problem if the IPC calls *require* extensionId
	//
	// but the SecretStorage API doesn't provide it.
	//
	//     console.warn("[Cocoon SecretState Shim] _getExtensionId is a placeholder and not implemented.");

	// Placeholder
	//     return "dummy.extension-id";

	// }
}
