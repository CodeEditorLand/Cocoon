/*---------------------------------------------------------------------------------------------
 * Cocoon Localization Shim (localization-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `IExtHostLocalizationService`.
 * In a full VS Code environment, this service is responsible for fetching and providing
 * localized strings (National Language Support - NLS - bundles) for extensions, enabling
 * them to display UI elements and messages in the user's configured language.
 *
 * For Cocoon's MVP (Minimum Viable Product), this shim provides minimal functionality.
 * It typically returns unlocalized (default) strings or empty/undefined bundles, as
 * implementing full NLS, including bundle loading, parsing, and language negotiation,
 * 
 * 
 * is complex and often deferred.
 *
 * Responsibilities (as a stub):
 * - Implementing the `IExtHostLocalizationService` interface with NOPs or default return values.
 * - Logging warnings when its methods are called to indicate that full localization is not supported.
 * - Providing a NOP `onDidInitializeLocalization` event.
 *
 * Key Interactions:
 * - Injected into `AbstractExtHostExtensionService` (or the real `ExtHostExtensionService`)
 *   and potentially used by the API factory.
 * - In a full implementation, it would interact with a `MainThreadLocalization` service
 *   via RPC to fetch NLS bundles and language information.
 * - Uses `BaseCocoonShim` for logging.
 *

 *--------------------------------------------------------------------------------------------*/

import { Event as VscodeEvent } from "vs/base/common/event";
// For URI type if bundle URIs are handled
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// Actual VS Code interface definition
import type { IExtHostLocalizationService as VscodeIExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";

// For vscode.Uri type consistency in API
import { Uri as VscodeApiUri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	type ILogServiceForShim,
	// Uncomment if RPC is used
	// ProxyIdentifier,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// TODO: Import MainContext if RPC calls are made to MainThreadLocalization
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

/**
 * Placeholder for the RPC shape of MainThreadLocalization.
 * This would define methods for fetching NLS bundle information and content.
 */
// interface MainThreadLocalizationProxyShape {

//     /** Fetches the URI for a built-in NLS bundle. */
//     $fetchBuiltInBundleUri(id: string, language: string): Promise<VSCodeInternalUriComponents | undefined>;

//     /** Fetches the content of an NLS bundle given its URI. */
//     $fetchBundleContents(uriComponents: VSCodeInternalUriComponents): Promise<string>;

// Potentially other methods for language packs, pseudotranslation status, etc.
//
// }

/**
 * Cocoon's stub implementation of `IExtHostLocalizationService`.
 * Provides NOPs or default values for localization-related API calls.
 */
export class ShimExtHostLocalizationService
	extends BaseCocoonShim
	implements VscodeIExtHostLocalizationService
{
	// Implement the actual VS Code interface
	// Required by VS Code's service types
	public readonly _serviceBrand: undefined;

	// #mainThreadLocalizationProxy: MainThreadLocalizationProxyShape | null = null;

	/**
	 * Creates an instance of ShimExtHostLocalizationService.
	 * @param rpcService The RPC service adapter (passed to base, currently unused by this stub).
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostLocalizationService", rpcService, logService);

		// this._log("Initialized (basic stub implementation).");

		// If this service were to make RPC calls:
		// if (this._rpcService) {

		//     this.#mainThreadLocalizationProxy = this._getProxy(
		//         MainContext.MainThreadLocalization as ProxyIdentifier<MainThreadLocalizationProxyShape>
		//     );

		// }

		// if (!this.#mainThreadLocalizationProxy) {

		//     this._logWarn("MainThreadLocalization proxy not available. Full NLS will be unavailable.");

		// }
	}

	/**
	 * This shim, in its stubbed form, does not require RPC.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Gets system-level translations for a given extension.
	 * In this stub, it returns `undefined` indicating no system translations are available.
	 * @param _extensionId The identifier of the extension (unused in stub).
	 * @returns A promise resolving to `undefined`.
	 */
	public async getSystemTranslations(
		_extensionId: ExtensionIdentifier,
	): Promise<Record<string, string> | undefined> {
		this._logWarnOnce(
			"getSystemTranslations() STUB - returning undefined. Full NLS (system translations) not supported in Cocoon MVP.",
		);

		return undefined;
	}

	/**
	 * Gets the NLS (National Language Support) bundle for a given extension.
	 * In this stub, it returns `undefined`, indicating no bundle is found or loaded.
	 * A full implementation would fetch and parse the appropriate `package.nls.<lang>.json` file.
	 * @param extensionId The identifier string of the extension.
	 * @returns `undefined` in this stub implementation.
	 */
	public getBundle(extensionId: string): Record<string, string> | undefined {
		this._logWarnOnce(
			`getBundle('${extensionId}') STUB - returning undefined. Full NLS (extension-specific bundles) not supported in Cocoon MVP.`,
		);

		return undefined;
	}

	/**
	 * Gets the URI for the NLS bundle of a given extension.
	 * In this stub, it returns `undefined`.
	 * A full implementation would construct the URI based on the extension's location and language.
	 * @param extensionId The identifier string of the extension.
	 * @returns `undefined` in this stub implementation.
	 */
	public getBundleUri(extensionId: string): VscodeApiUri | undefined {
		// Return type is vscode.Uri
		this._logWarnOnce(
			`getBundleUri('${extensionId}') STUB - returning undefined. Bundle URIs are not resolved in Cocoon MVP.`,
		);

		return undefined;
	}

	/**
	 * Initializes localized messages for an extension. This is typically called by the
	 * extension service before activating an extension.
	 * A real implementation would load the NLS JSON content from the main thread or disk
	 * and make it available via `getBundle`.
	 *
	 * This stub implementation is a No-Operation but logs if an extension provides
	 * a default NLS bundle path in its manifest.
	 *
	 * @param extension The description of the extension for which to initialize messages.
	 * @returns A promise that resolves when initialization is complete (immediately in this stub).
	 */
	public async initializeLocalizedMessages(
		extension: IExtensionDescription,
	): Promise<void> {
		// Log if an extension *expects* to have localized messages.
		if (extension.localizedMessages?.default) {
			this._log(
				`Extension ${extension.identifier.value} has a default localizedMessages URI declared in its manifest: ${extension.localizedMessages.default.toString()}. NLS loading is currently stubbed.`,
			);

			// TODO: In a fuller implementation, this would involve:
			// 1. Constructing the correct bundle URI (e.g., using `this.#mainThreadLocalizationProxy?.$fetchBuiltInBundleUri(...)` or resolving locally).
			// 2. Fetching the bundle content (e.g., `this.#mainThreadLocalizationProxy?.$fetchBundleContents(...)`).
			// 3. Parsing the JSON content and storing it (e.g., in a Map<extensionId, NlsBundle>) for `getBundle` to use.
		} else {
			// Can be verbose if many extensions don't have NLS
			// this._log(`initializeLocalizedMessages for ${extension.identifier.value} (extension has no default NLS bundle specified or NLS loading is stubbed).`);
		}

		return Promise.resolve();
	}

	/**
	 * An event that fires when localization has been initialized.
	 * In this stub, it's a NOP event that never fires.
	 */
	public readonly onDidInitializeLocalization: VscodeEvent<void> =
		VscodeEvent.None;

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		// Dispose any event emitters or resources specific to this shim if they were created.
	}
}
