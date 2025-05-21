/*---------------------------------------------------------------------------------------------
 * Cocoon Secrets Shim (shims/secret-state-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `vscode.SecretStorage` API (`IExtHostSecretState`) for Cocoon.
 * Provides extensions with a way to securely store and retrieve sensitive data using
 * the operating system's keychain or credential store, proxied via Mountain.
 *
 * Responsibilities:
 * - Implementing the `SecretStorage` interface methods (`get`, `store`, `delete`).
 * - Proxying these method calls to the corresponding Mountain handlers (`secrets_get`,
 *
 *
 *
 *   `secrets_store`, `secrets_delete`) via direct Vine IPC (`sendToMountainAndWait`).
 *   (Alternatively, could use RPC via `MainThreadSecretState.$getPassword`, etc. if defined).
 * - Implementing the `onDidChange` event emitter (stubbed for MVP, would require
 *   notifications from Mountain).
 * - Passing necessary arguments (extension ID, key, value) to Mountain.
 *
 * Key Interactions:
 * - Provides the `vscode.SecretStorage` API (typically accessed via `ExtensionContext.secrets`).
 * - Uses `sendToMountainAndWait` from `cocoon-ipc.js` to interact with Mountain handlers.
 * - Relies on Mountain (`handlers/secrets.rs`) to interact with the OS keychain (`keyring` crate).
 *--------------------------------------------------------------------------------------------*/

import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
// For onDidChange event

// For the event payload type
import { SecretStorageChangeEvent } from "vscode";

// Assuming typed: (method: string | { method: string; params: any }, paramsOrTimeout?: any, timeout?: number) => Promise<any>
import { sendToMountainAndWait } from "../cocoon-ipc";
// For constructor, though not directly used in methods
import { IExtHostRpcService } from "./_baseShim";

// Define the IExtHostSecretState interface based on VS Code's API.
// This would typically come from VS Code's type definitions.
export interface IExtHostSecretState {
	readonly _serviceBrand: undefined;

	get(extensionId: string, key: string): Promise<string | undefined>;

	store(extensionId: string, key: string, value: string): Promise<void>;

	delete(extensionId: string, key: string): Promise<void>;

	// Event when a secret changes
	onDidChange: VscodeEvent<SecretStorageChangeEvent>;

	// VS Code's SecretStorage also has:
	// storeToken(extensionId: string, token: string): Promise<void>;

	// getToken(extensionId: string): Promise<string | undefined>;

	// deleteToken(extensionId: string): Promise<void>;
}

export class ShimExtHostSecretState implements IExtHostSecretState {
	public readonly _serviceBrand: undefined;

	// Kept for consistency if other methods might use it later
	// #rpcService: IExtHostRpcService | undefined;

	// Emitter for onDidChange event
	// This needs to be triggered by notifications from Mountain if a secret actually changes externally.
	private readonly _onDidChangeEmitter =
		new VscodeEmitter<SecretStorageChangeEvent>();

	public readonly onDidChange: VscodeEvent<SecretStorageChangeEvent> =
		this._onDidChangeEmitter.event;

	constructor(rpcService: IExtHostRpcService | undefined) {
		// rpcService not directly used by these methods if using direct IPC
		// this.#rpcService = rpcService;

		console.log("[Cocoon Shim] ShimExtHostSecretState initialized.");
	}

	public async get(
		extensionId: string,

		key: string,
	): Promise<string | undefined> {
		console.log(
			`[Cocoon Shim] SecretState.get requesting from Mountain: ext=${extensionId}, key=${key}`,
		);

		try {
			// The original JS passed an object { method, params } as the first arg to sendToMountainAndWait.
			// Adjusting to match that, or assuming sendToMountainAndWait handles method string and params object.
			// Let's assume sendToMountainAndWait(methodName: string, params: any, timeout?: number)
			const result = await sendToMountainAndWait(
				"secrets_get",

				{ extensionId, key },

				// Timeout
				2000,
			);

			// Cast, as result could be null/undefined from IPC
			return result as string | undefined;
		} catch (error: any) {
			console.error(
				`[Cocoon Shim] SecretState.get failed for ext=${extensionId}, key=${key}:`,

				error,
			);

			// Should it rethrow or return undefined on failure?
			// VS Code's API typically returns undefined if not found or on error.
			return undefined;
		}
	}

	public async store(
		extensionId: string,

		key: string,

		value: string,
	): Promise<void> {
		console.log(
			`[Cocoon Shim] SecretState.store requesting from Mountain: ext=${extensionId}, key=${key}`,
		);

		try {
			await sendToMountainAndWait(
				"secrets_store",

				{ extensionId, key, value },

				2000,
			);

			// After successfully storing, fire the onDidChange event
			this._onDidChangeEmitter.fire({ key });
		} catch (error: any) {
			console.error(
				`[Cocoon Shim] SecretState.store failed for ext=${extensionId}, key=${key}:`,

				error,
			);

			// Rethrow to signal failure to the extension, as `store` is Promise<void>
			throw error;
		}
	}

	public async delete(extensionId: string, key: string): Promise<void> {
		console.log(
			`[Cocoon Shim] SecretState.delete requesting from Mountain: ext=${extensionId}, key=${key}`,
		);

		try {
			await sendToMountainAndWait(
				"secrets_delete",

				{ extensionId, key },

				2000,
			);

			// After successfully deleting, fire the onDidChange event
			this._onDidChangeEmitter.fire({ key });
		} catch (error: any) {
			console.error(
				`[Cocoon Shim] SecretState.delete failed for ext=${extensionId}, key=${key}:`,

				error,
			);

			// Rethrow to signal failure
			throw error;
		}
	}

	// The original JS shim had onDidChangePassword, which seems to be a typo/legacy for onDidChange.
	// The vscode.SecretStorage interface has `onDidChange: Event<SecretStorageChangeEvent>;`
	// where SecretStorageChangeEvent = { readonly key: string; }

	// The emitter for this is now correctly set up as `_onDidChangeEmitter`.
}

// Class is already exported
// export { ShimExtHostSecretState };
