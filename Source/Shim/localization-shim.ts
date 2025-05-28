/*---------------------------------------------------------------------------------------------
 * Cocoon Localization Shim (localization-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides an implementation for the `IExtHostLocalizationService`.
 * In a full VS Code environment, this service is essential for National Language Support (NLS).
 * It loads localized string bundles from extensions and core components.
 *
 * This Cocoon shim implements:
 *  - Fetching localized string bundles (`package.nls.<language_code>.json` and `package.nls.json`)
 *    from an extension's specified l10n path (or its root) via RPC calls to Mountain.
 *  - Providing extensions with access to these localized strings via `getBundle()`.
 *  - `getBundleUri()` to provide the URI of the localization bundle that would be used.
 *  - `initializeLocalizedMessages()` to trigger the loading for a given extension.
 *  - `onDidInitializeLocalization` event, signaled after initial setup.
 *
 * Limitations:
 *  - Does not yet directly provide the `vscode.l10n.t()` API; that requires a separate `ExtHostL10nService`
 *    shim that would consume the bundles loaded by this service.
 *  - `getSystemTranslations()` is stubbed.
 *
 * Key Interactions:
 * - An instance is registered with DI and typically injected into `ExtHostExtensionService`.
 * - Uses RPC to `MainThreadLocalization` on Mountain to fetch NLS bundle contents.
 * - Uses `BaseCocoonShim` for logging and RPC.
 *
 * TODO:
 *  - Implement `getSystemTranslations()` if needed, likely requiring new RPCs.
 *  - Refine `signalLocalizationInitialized()` call point in `index.ts` for accuracy.
 *  - Create and integrate `l10n-shim.ts` for `vscode.l10n.t()` API.
 *--------------------------------------------------------------------------------------------*/

import * as path from "node:path"; // For joining paths for bundle URIs
import { Barrier } from "vs/base/common/async";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import {
	URI as VSCodeInternalURI,
	type UriComponents as VSCodeInternalUriComponents,
} from "vs/base/common/uri";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import { MainContext } from "vs/workbench/api/common/extHost.protocol"; // For MainThread RPC
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService"; // For initData.environment.appLanguage
import type { IExtHostLocalizationService as VscodeIExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
import { Uri as VscodeApiUri } from "vscode"; // Public API type

import {
	BaseCocoonShim,
	refineErrorForShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	type ProxyIdentifier,
} from "./_baseShim";

/** RPC interface for MainThreadLocalization service on Mountain. */
interface MainThreadLocalizationProxyShape {
	$fetchBundleContents(
		uriComponents: VSCodeInternalUriComponents,
	): Promise<string | null>;
	// $getUILanguage?(): Promise<string>; // Optional: if language isn't reliably in initData
}

/** Cocoon's implementation of `IExtHostLocalizationService`. */
export class ShimExtHostLocalizationService
	extends BaseCocoonShim
	implements VscodeIExtHostLocalizationService
{
	public readonly _serviceBrand: undefined;
	private _mainThreadLocalizationProxy: MainThreadLocalizationProxyShape | null =
		null;

	// Key: extensionId.value (string), Value: Record<string, string> (parsed NLS JSON)
	readonly #nlsBundlesCache = new Map<string, Record<string, string>>();
	#currentLanguage: string = "en"; // Default, updated from initData

	// Barrier to signal when initial localization phase (e.g., after first extensions load) is done.
	readonly #initializationBarrier = new Barrier();
	public readonly onDidInitializeLocalization: VscodeEvent<void> =
		this.#initializationBarrier.onisOpen;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		initData: ExtHostInitData, // To get current language
	) {
		super("ExtHostLocalizationService", rpcService, logService);
		this.#currentLanguage = initData.environment.appLanguage || "en";
		this._logInfo(
			`Initialized. Current UI language: '${this.#currentLanguage}'. NLS bundle loading is active.`,
		);

		if (this._rpcService) {
			this._mainThreadLocalizationProxy = this._getProxy(
				MainContext.MainThreadLocalization as ProxyIdentifier<MainThreadLocalizationProxyShape>,
			);
		}
		if (!this._mainThreadLocalizationProxy) {
			this._logError(
				"MainThreadLocalization RPC proxy NOT available. NLS bundle loading will FAIL.",
			);
		}
	}

	/** Signals that the initial batch of localizations can be considered loaded. */
	public signalLocalizationInitialized(): void {
		if (!this.#initializationBarrier.isOpen()) {
			this._logInfo("Signaling that localization has been initialized.");
			this.#initializationBarrier.open();
		}
	}

	public async getSystemTranslations(
		_extensionId: ExtensionIdentifier,
	): Promise<Record<string, string> | undefined> {
		this._logWarnOnce(
			"API STUB: getSystemTranslations() called. Returning undefined. System-level NLS not supported.",
		);
		return undefined;
	}

	public getBundle(extensionId: string): Record<string, string> | undefined {
		return this.#nlsBundlesCache.get(extensionId);
	}

	public getBundleUri(extensionId: string): VscodeApiUri | undefined {
		const extension = this._findExtensionDescription(extensionId); // Helper needed or assume access
		if (!extension) {
			this._logWarn(
				`getBundleUri: Extension description not found for ID '${extensionId}'.`,
			);
			return undefined;
		}
		const { l10nBundleLanguageSpecific, l10nBundleDefault } =
			this._getPotentialBundleUris(extension);
		// Prefer language-specific URI if it exists, otherwise default.
		// This doesn't check for file existence, just conventional URI.
		return l10nBundleLanguageSpecific
			? VscodeApiUri.from(l10nBundleLanguageSpecific)
			: l10nBundleDefault
				? VscodeApiUri.from(l10nBundleDefault)
				: undefined;
	}

	public async initializeLocalizedMessages(
		extension: IExtensionDescription,
	): Promise<void> {
		// Wait for the service to be fully "ready" (e.g., after initial extensions processed in index.ts)
		// This prevents trying to load bundles too early if initializationBarrier is used.
		await this.#initializationBarrier.wait();

		if (!this._mainThreadLocalizationProxy) {
			this._logWarn(
				`Cannot initialize messages for '${extension.identifier.value}': RPC proxy unavailable.`,
			);
			return;
		}

		const { l10nBundleLanguageSpecific, l10nBundleDefault } =
			this._getPotentialBundleUris(extension);
		let loadedBundle: Record<string, string> | undefined = undefined;
		let mergedBundle: Record<string, string> = {};

		// 1. Try to load default `package.nls.json`
		if (l10nBundleDefault) {
			try {
				this._logDebug(
					`Fetching default NLS bundle for '${extension.identifier.value}' from ${l10nBundleDefault.toString()}`,
				);
				const defaultContent =
					await this._mainThreadLocalizationProxy.$fetchBundleContents(
						l10nBundleDefault.toJSON(),
					);
				if (defaultContent) {
					mergedBundle = {
						...mergedBundle,
						...JSON.parse(defaultContent),
					};
					loadedBundle = mergedBundle; // Mark as loaded if default exists
					this._logDebug(
						`Successfully loaded and parsed default NLS bundle for '${extension.identifier.value}'.`,
					);
				}
			} catch (e: any) {
				this._logWarn(
					`Failed to load or parse default NLS bundle for '${extension.identifier.value}' from ${l10nBundleDefault.toString()}:`,
					e.message,
				);
			}
		}

		// 2. Try to load language-specific `package.nls.<language>.json` and merge if found
		if (
			l10nBundleLanguageSpecific &&
			this.#currentLanguage.toLowerCase() !== "en"
		) {
			// No need to load en specific if default is en
			try {
				this._logDebug(
					`Fetching language-specific NLS bundle ('${this.#currentLanguage}') for '${extension.identifier.value}' from ${l10nBundleLanguageSpecific.toString()}`,
				);
				const specificContent =
					await this._mainThreadLocalizationProxy.$fetchBundleContents(
						l10nBundleLanguageSpecific.toJSON(),
					);
				if (specificContent) {
					// Language-specific overrides default
					mergedBundle = {
						...mergedBundle,
						...JSON.parse(specificContent),
					};
					loadedBundle = mergedBundle; // Mark as loaded if specific exists
					this._logDebug(
						`Successfully loaded and merged language-specific NLS bundle ('${this.#currentLanguage}') for '${extension.identifier.value}'.`,
					);
				}
			} catch (e: any) {
				this._logWarn(
					`Failed to load or parse language-specific NLS bundle ('${this.#currentLanguage}') for '${extension.identifier.value}' from ${l10nBundleLanguageSpecific.toString()}:`,
					e.message,
				);
			}
		}

		if (loadedBundle) {
			this.#nlsBundlesCache.set(extension.identifier.value, loadedBundle);
		} else {
			if (extension.l10n) {
				// Only log if l10n was configured but nothing loaded
				this._logWarn(
					`No NLS bundle content found or loaded for extension '${extension.identifier.value}' (l10n path: ${extension.l10n}).`,
				);
			} else {
				this._logService?.trace(
					`Extension '${extension.identifier.value}' does not specify an l10n path.`,
				);
			}
		}
	}

	private _getPotentialBundleUris(extension: IExtensionDescription): {
		l10nBundleLanguageSpecific: VSCodeInternalURI | undefined;
		l10nBundleDefault: VSCodeInternalURI | undefined;
	} {
		const l10nLocationPath = extension.l10n
			? path.join(extension.extensionLocation.fsPath, extension.l10n) // Relative to extension root
			: extension.extensionLocation.fsPath; // Assumed to be in root if no l10n path

		let l10nBundleDefault: VSCodeInternalURI | undefined = undefined;
		try {
			l10nBundleDefault = VSCodeInternalURI.file(
				path.join(l10nLocationPath, `package.nls.json`),
			);
		} catch (e) {
			this._logWarn(
				`Could not form default NLS bundle URI for ${extension.identifier.value}`,
				e,
			);
		}

		let l10nBundleLanguageSpecific: VSCodeInternalURI | undefined =
			undefined;
		if (this.#currentLanguage.toLowerCase() !== "en") {
			// Often, 'en' is in the default bundle
			try {
				l10nBundleLanguageSpecific = VSCodeInternalURI.file(
					path.join(
						l10nLocationPath,
						`package.nls.${this.#currentLanguage}.json`,
					),
				);
			} catch (e) {
				this._logWarn(
					`Could not form lang-specific NLS bundle URI for ${extension.identifier.value} (${this.#currentLanguage})`,
					e,
				);
			}
		}
		return { l10nBundleLanguageSpecific, l10nBundleDefault };
	}

	// Helper to find IExtensionDescription, needed for getBundleUri.
	// This suggests a dependency or helper method access to IExtHostExtensionService might be needed
	// if this service doesn't already have all IExtensionDescriptions.
	// For now, assuming it's passed in where needed or a placeholder strategy.
	private _findExtensionDescription(
		extensionId: string,
	): IExtensionDescription | undefined {
		// TODO: This needs a way to access all known IExtensionDescriptions.
		// This might come from IExtHostExtensionService.getExtensions() or similar.
		// For this shim in isolation, this is a gap.
		// In index.ts, `initializeLocalizedMessages` is called with the IExtensionDescription.
		this._logWarnOnce(
			`_findExtensionDescription for '${extensionId}' is a STUB. Full implementation needs access to IExtHostExtensionService or similar.`,
		);
		// Placeholder:
		const placeholderInitData = (this as any)._initData as
			| ExtHostInitData
			| undefined; // Access initData if possible
		return placeholderInitData?.extensions.allExtensions.find(
			(ext) => ext.identifier.value === extensionId,
		);
	}

	public override dispose(): void {
		super.dispose();
		this.#nlsBundlesCache.clear();
		this._logInfo("Disposed.");
	}
}
