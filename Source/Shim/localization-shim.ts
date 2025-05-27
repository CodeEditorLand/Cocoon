/*---------------------------------------------------------------------------------------------
 * Cocoon Localization Shim (localization-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic stub implementation for the `IExtHostLocalizationService`.
 * In a full VS Code environment, this service is essential for National Language Support (NLS).
 * It is responsible for:
 *  - Fetching localized string bundles (typically from `package.nls.json` and
 *    `package.nls.<language_code>.json` files within extensions or core components).
 *  - Providing extensions with access to these localized strings via `vscode.l10n.t()`
 *    (which would internally use this service or a related NLS utility).
 *  - Managing information about available language packs and the current application language.
 *
 * For Cocoon's MVP (Minimum Viable Product), this shim provides minimal functionality.
 * It generally returns unlocalized (default) strings or empty/undefined bundles, as
 * implementing full NLS support (including bundle loading from potentially varied
 * sources, parsing, language negotiation, and integration with a translation system)
 * is a complex undertaking beyond the initial scope.
 *
 * Responsibilities (as a stub):
 * - Implementing the `IExtHostLocalizationService` interface with No-Operation (NOP)
 *   methods or methods that return default/empty values.
 * - Logging warnings (typically once per method) when its API methods are called,
 *
 *   to indicate that full localization functionality is not currently supported.
 * - Providing a NOP `onDidInitializeLocalization` event, which in a real system would
 *   signal when localization data is ready.
 * - The `initializeLocalizedMessages` method (called by `ExtHostExtensionService`
 *   before extension activation) is a NOP but logs if an extension manifest
 *   indicates it has localized messages.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostLocalizationService` is registered with DI in
 *   `Cocoon/index.ts` and is typically injected into the `ExtHostExtensionService`
 *   (or its shim) and potentially used by the API factory constructing the `vscode` object.
 * - In a full implementation, this service would interact heavily with a
 *   `MainThreadLocalization` service on the Mountain host via RPC to fetch NLS
 *   bundles, language pack information, and the current application language.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

// For VscodeEvent.None
import { Event as VscodeEvent } from "vs/base/common/event";
// For URI type if bundle URIs are handled (e.g., in a full implementation or for initData)
// import { URI as VSCodeInternalURI, type UriComponents as VSCodeInternalUriComponents } from "vs/base/common/uri";

import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// Import the actual VS Code interface definition for IExtHostLocalizationService
import type { IExtHostLocalizationService as VscodeIExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";

// For `vscode.Uri` type consistency in public API signatures (e.g., getBundleUri)
import { Uri as VscodeApiUri } from "../Shim/out/vscode";
import {
	BaseCocoonShim,
	// Updated type from BaseCocoonShim
	type ILogServiceForShim,
	// Updated type from BaseCocoonShim
	type IRpcProtocolServiceAdapter,
	// Uncomment if/when RPC is used
	// type ProxyIdentifier,
} from "./_baseShim";

// TODO: Import MainContext from `extHost.protocol.ts` if RPC calls are implemented for full NLS.
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

/**
 * Placeholder for the RPC interface of a `MainThreadLocalization` service on Mountain.
 * This would define methods for fetching NLS bundle information and their content if
 * Cocoon were to implement full NLS by proxying requests.
 */
// interface MainThreadLocalizationProxyShape {

//     /**
//      * Fetches the URI (as components) for a built-in NLS bundle for a given extension/component ID and language.
//      * @param id The identifier of the extension or component (e.g., "vscode.git").
//      * @param language The BCP 47 language tag (e.g., "de", "zh-cn").
//      */
//     $fetchBuiltInBundleUri(id: string, language: string): Promise<VSCodeInternalUriComponents | undefined>;

//
//     /**
//      * Fetches the string content of an NLS bundle given its URI components.
//      * @param uriComponents The URI components of the NLS bundle file.
//      */
//     $fetchBundleContents(uriComponents: VSCodeInternalUriComponents): Promise<string>;

//
// Potentially other methods for language packs, pseudotranslation status, user language, etc.
//
// $getLanguage(): Promise<string>; // To get the current application language from MainThread.
//
// }

/**
 * Cocoon's stub implementation of `IExtHostLocalizationService`.
 * It provides NOPs or default placeholder values for localization-related API calls,
 *
 * as full NLS support is not part of Cocoon's MVP.
 */
export class ShimExtHostLocalizationService
	extends BaseCocoonShim
	implements VscodeIExtHostLocalizationService
{
	// Ensure implementation of the VS Code interface
	// Required by VS Code's service type system for DI.
	public readonly _serviceBrand: undefined;

	// private _mainThreadLocalizationProxy: MainThreadLocalizationProxyShape | null = null;

	/**
	 * Creates an instance of ShimExtHostLocalizationService.
	 * @param rpcService The RPC service adapter (passed to `BaseCocoonShim`, currently unused by this stub's core logic).
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostLocalizationService", rpcService, logService);

		this._logInfo(
			"Initialized (basic STUB implementation). Full NLS is not supported.",
		);

		// If this service were to make RPC calls for NLS data:
		// if (this._rpcService) {

		//     this._mainThreadLocalizationProxy = this._getProxy(
		//         MainContext.MainThreadLocalization as ProxyIdentifier<MainThreadLocalizationProxyShape>
		//     );

		// }

		// if (!this._mainThreadLocalizationProxy) {

		//     this._logWarn("MainThreadLocalization RPC proxy not available. Full NLS functionality will be unavailable; only default (unlocalized) strings will effectively be used.");

		// }
	}

	/**
	 * This shim, in its current stubbed form, does not require RPC for its core functionality.
	 * @returns `false`, as RPC is not currently required by this shim.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc VscodeIExtHostLocalizationService.getSystemTranslations}
	 *
	 *
	 * Retrieves system-level translations for a given extension.
	 * In this stub implementation, it always returns `undefined`, indicating that no
	 * system-level translations are available or provided by Cocoon for extensions.
	 * @param _extensionId The identifier of the extension (currently unused in this stub).
	 * @returns A promise that resolves to `undefined`.
	 */
	public async getSystemTranslations(
		_extensionId: ExtensionIdentifier,
	): Promise<Record<string, string> | undefined> {
		this._logWarnOnce(
			"API STUB: getSystemTranslations() called. Returning undefined. System-level NLS translations are not supported in Cocoon MVP.",
		);

		return undefined;
	}

	/**
	 * {@inheritDoc VscodeIExtHostLocalizationService.getBundle}
	 *
	 *
	 * Gets the NLS (National Language Support) string bundle for a given extension ID.
	 * In this stub implementation, it returns `undefined`, indicating that no NLS bundle
	 * is found or loaded for the specified extension. A full implementation would involve
	 * fetching and parsing the appropriate `package.nls.<language_code>.json` file associated
	 * with the extension.
	 *
	 * @param extensionId The identifier string of the extension (e.g., "publisher.name").
	 * @returns `undefined` in this stub implementation, signifying no bundle is available.
	 */
	public getBundle(extensionId: string): Record<string, string> | undefined {
		this._logWarnOnce(
			`API STUB: getBundle(for extensionId: '${extensionId}') called. Returning undefined. Extension-specific NLS bundles are not loaded in Cocoon MVP.`,
		);

		return undefined;
	}

	/**
	 * {@inheritDoc VscodeIExtHostLocalizationService.getBundleUri}
	 *
	 *
	 * Gets the URI for the NLS bundle of a given extension.
	 * In this stub implementation, it returns `undefined`. A full implementation would
	 * construct the URI based on the extension's installation location, the current
	 * application language, and VS Code's NLS conventions.
	 *
	 * @param extensionId The identifier string of the extension.
	 * @returns `undefined` in this stub implementation, as bundle URIs are not resolved.
	 */
	public getBundleUri(extensionId: string): VscodeApiUri | undefined {
		// Return type is vscode.Uri
		this._logWarnOnce(
			`API STUB: getBundleUri(for extensionId: '${extensionId}') called. Returning undefined. NLS Bundle URIs are not resolved in Cocoon MVP.`,
		);

		return undefined;
	}

	/**
	 * {@inheritDoc VscodeIExtHostLocalizationService.initializeLocalizedMessages}
	 *
	 *
	 * Initializes localized messages for a specific extension. This method is typically
	 * called by the `ExtHostExtensionService` *before* an extension's `activate()`
	 * function is invoked. A real implementation would asynchronously load the NLS JSON
	 * content (e.g., from the main thread via RPC or directly from disk if paths are known)
	 * and make it available for subsequent calls to `getBundle` or for direct use by
	 * an `l10n.t()`-like function.
	 *
	 * This stub implementation is a No-Operation but will log a message if an extension's
	 * manifest (`package.json`) indicates that it has a default NLS bundle path defined.
	 *
	 * @param extension The `IExtensionDescription` of the extension for which to initialize messages.
	 * @returns A promise that resolves immediately in this stub, as no actual loading occurs.
	 */
	public async initializeLocalizedMessages(
		extension: IExtensionDescription,
	): Promise<void> {
		// Log if an extension *is* NLS-aware by declaring `localizedMessages` in its manifest.
		if (extension.localizedMessages?.default) {
			this._logDebug(
				// Use Debug as this can be frequent during startup for many extensions
				`initializeLocalizedMessages for extension '${extension.identifier.value}': Extension declares a default NLS bundle URI at ` +
					`'${extension.localizedMessages.default.toString()}'. However, NLS bundle loading and message localization are currently STUBBED in Cocoon. ` +
					`The application will use default (likely English) strings from the extension if available, or manifest values.`,
			);

			// TODO (Future Full NLS Implementation):
			// 1. Determine the correct bundle URI to load based on `extension.localizedMessages`,

			//    the current application language (e.g., from `this._initData.environment.appLanguage`),

			//    and VS Code's NLS fallback rules (e.g., `package.nls.<lang>.json` -> `package.nls.json`).
			//    This might involve RPC calls like `this._mainThreadLocalizationProxy?.$fetchBuiltInBundleUri(...)`
			//    or resolving the path locally relative to `extension.extensionLocation`.
			// 2. Fetch the content of the determined NLS bundle URI (e.g., via
			//    `this._mainThreadLocalizationProxy?.$fetchBundleContents(...)` or local file read if path is known).
			// 3. Parse the fetched JSON content.
			// 4. Store the parsed NLS bundle (e.g., in a `Map<extensionIdString, NlsBundleObject>`)
			//    so that `getBundle(extensionId)` can return it.
			// 5. If VS Code's `vscode.l10n.t()` API is to be supported, this loaded bundle would also
			//    need to be made available to the `l10n` object provided to the extension, likely
			//    managed by `ExtHostL10n` or a similar dedicated service.
		} else {
			this._logService?.trace(
				// Trace for extensions without NLS declarations, to avoid log spam.
				`initializeLocalizedMessages for extension '${extension.identifier.value}' (extension has no default NLS bundle specified, or NLS loading is stubbed).`,
			);
		}

		// Resolves immediately as it's a NOP for now.
		return Promise.resolve();
	}

	/**
	 * An event that fires when localization (e.g., loading of language packs or
	 * initial NLS bundles) has been initialized for the extension host.
	 * In this stub implementation, it's a NOP event (`VscodeEvent.None`) that never fires,
	 *
	 * as full asynchronous NLS initialization is not implemented.
	 */
	public readonly onDidInitializeLocalization: VscodeEvent<void> =
		VscodeEvent.None;

	/**
	 * Disposes of resources held by this shim instance.
	 * (Currently, this shim holds no complex resources like event emitters that require
	 * explicit disposal beyond what `BaseCocoonShim` handles via `_instanceDisposables`).
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables.
		super.dispose();

		// If any event emitters specific to this service were created (they are not currently), dispose them here.
		// (onDidInitializeLocalization is VscodeEvent.None, so no VscodeEmitter instance to dispose for it).
		// Use Info for major lifecycle.
		this._logInfo("Disposed.");
	}
}
