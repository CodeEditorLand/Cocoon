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
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
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
// For RPC proxy to MainThread
import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// For initData.environment.appLanguage
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService";
// VS Code service interface this shim implements
import type { IExtHostLocalizationService as VscodeIExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";
// Public API type (ensure this path resolves to Cocoon's 'vscode' shim)
import { Uri as VscodeApiUri } from "vscode";

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
	public readonly _serviceBrand: undefined; // Required by VS Code's service type system for DI
	private _mainThreadLocalizationProxy: MainThreadLocalizationProxyShape | null =
		null;

	// Key: extensionId.value (string), Value: Record<string, string> (parsed NLS JSON bundle)
	readonly #nlsBundlesCache = new Map<string, Record<string, string>>();
	#currentLanguage: string = "en"; // Default language, updated from initData

	// Barrier to signal when initial localization phase (e.g., after first extensions load) is considered done.
	readonly #initializationBarrier = new Barrier();
	/** Event that fires when localization has been initialized (e.g., initial bundles loaded). */
	public readonly onDidInitializeLocalization: VscodeEvent<void> =
		this.#initializationBarrier.onisOpen;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
		initData: ExtHostInitData, // To get current UI language from initData.environment
	) {
		super("ExtHostLocalizationService", rpcService, logService);
		this.#currentLanguage = initData.environment.appLanguage || "en"; // Default to 'en' if not specified
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
				"MainThreadLocalization RPC proxy NOT available. NLS bundle loading will FAIL for all extensions.",
			);
		}
	}

	/**
	 * Signals that the initial phase of localization can be considered complete.
	 * This is typically called after the first batch of extensions have had their
	 * `initializeLocalizedMessages` called.
	 */
	public signalLocalizationInitialized(): void {
		if (!this.#initializationBarrier.isOpen()) {
			this._logInfo(
				"Signaling that localization has been initialized (initializationBarrier opened).",
			);
			this.#initializationBarrier.open();
		}
	}

	/** {@inheritDoc VscodeIExtHostLocalizationService.getSystemTranslations} */
	public async getSystemTranslations(
		_extensionId: ExtensionIdentifier,
	): Promise<Record<string, string> | undefined> {
		this._logWarnOnce(
			"API STUB: getSystemTranslations() called. Returning undefined. System-level NLS (e.g., for built-in UI components) is not supported by this shim.",
		);
		return undefined;
	}

	/** {@inheritDoc VscodeIExtHostLocalizationService.getBundle} */
	public getBundle(extensionId: string): Record<string, string> | undefined {
		return this.#nlsBundlesCache.get(extensionId);
	}

	/** {@inheritDoc VscodeIExtHostLocalizationService.getBundleUri} */
	public getBundleUri(extensionId: string): VscodeApiUri | undefined {
		// This helper might be problematic if IExtHostExtensionService is not easily accessible
		// to get all IExtensionDescriptions. This method is primarily for API completeness.
		const extension = this._findExtensionDescription(extensionId);
		if (!extension) {
			this._logWarn(
				`getBundleUri: Extension description not found for ID '${extensionId}'. Cannot determine bundle URI.`,
			);
			return undefined;
		}
		const { l10nBundleLanguageSpecific, l10nBundleDefault } =
			this._getPotentialBundleUris(extension);

		// Prefer language-specific URI if it exists, otherwise default.
		// This method constructs the conventional URI; it does not check for file existence.
		const targetInternalUri =
			l10nBundleLanguageSpecific || l10nBundleDefault;
		return targetInternalUri
			? VscodeApiUri.from(targetInternalUri)
			: undefined;
	}

	/** {@inheritDoc VscodeIExtHostLocalizationService.initializeLocalizedMessages} */
	public async initializeLocalizedMessages(
		extension: IExtensionDescription,
	): Promise<void> {
		// Wait for the service to be fully "ready" if the barrier is used for initial batch loading.
		// This ensures that any early setup (like RPC proxy availability) is complete.
		await this.#initializationBarrier.wait();

		if (!this._mainThreadLocalizationProxy) {
			this._logWarn(
				`Cannot initialize localized messages for extension '${extension.identifier.value}': MainThreadLocalization RPC proxy is unavailable.`,
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
					`Fetching default NLS bundle for '${extension.identifier.value}' from: ${l10nBundleDefault.toString()}`,
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
					refineErrorForShim(
						e,
						this._logService,
						"$fetchBundleContents (default)",
					),
				);
			}
		}

		// 2. Try to load language-specific `package.nls.<language>.json` and merge if found.
		//    Only attempt if the current language is not 'en' (assuming 'en' is in the default bundle).
		if (
			l10nBundleLanguageSpecific &&
			this.#currentLanguage.toLowerCase() !== "en"
		) {
			try {
				this._logDebug(
					`Fetching language-specific NLS bundle ('${this.#currentLanguage}') for '${extension.identifier.value}' from: ${l10nBundleLanguageSpecific.toString()}`,
				);
				const specificContent =
					await this._mainThreadLocalizationProxy.$fetchBundleContents(
						l10nBundleLanguageSpecific.toJSON(),
					);
				if (specificContent) {
					mergedBundle = {
						...mergedBundle,
						...JSON.parse(specificContent),
					}; // Language-specific overrides default
					loadedBundle = mergedBundle; // Mark as loaded if specific exists
					this._logDebug(
						`Successfully loaded and merged language-specific NLS bundle ('${this.#currentLanguage}') for '${extension.identifier.value}'.`,
					);
				}
			} catch (e: any) {
				this._logWarn(
					`Failed to load or parse language-specific NLS bundle ('${this.#currentLanguage}') for '${extension.identifier.value}' from ${l10nBundleLanguageSpecific.toString()}:`,
					refineErrorForShim(
						e,
						this._logService,
						"$fetchBundleContents (lang-specific)",
					),
				);
			}
		}

		if (loadedBundle) {
			this.#nlsBundlesCache.set(extension.identifier.value, loadedBundle);
		} else {
			// Only log a warning if an l10n path was specified but no bundle was loaded.
			// If no l10n path, it's expected that no bundle will be loaded.
			if (extension.l10n) {
				this._logWarn(
					`No NLS bundle content found or loaded for extension '${extension.identifier.value}' (l10n path configured: '${extension.l10n}'). Extension will use default strings.`,
				);
			} else {
				this._logService?.trace(
					`Extension '${extension.identifier.value}' does not specify an 'l10n' path in its manifest; no NLS bundle to load.`,
				);
			}
		}
	}

	/**
	 * Constructs the potential URIs for an extension's NLS bundles (default and language-specific).
	 * @param extension The description of the extension.
	 * @returns An object containing the URIs for the language-specific and default NLS bundles.
	 */
	private _getPotentialBundleUris(extension: IExtensionDescription): {
		l10nBundleLanguageSpecific: VSCodeInternalURI | undefined;
		l10nBundleDefault: VSCodeInternalURI | undefined;
	} {
		// Determine the base path for NLS files: either `extensionLocation + l10n` or just `extensionLocation`.
		const l10nBasePath = extension.l10n
			? path.join(extension.extensionLocation.fsPath, extension.l10n) // Path is relative to extension root
			: extension.extensionLocation.fsPath; // If no l10n path, assume bundles are in the extension root.

		let l10nBundleDefault: VSCodeInternalURI | undefined = undefined;
		try {
			l10nBundleDefault = VSCodeInternalURI.file(
				path.join(l10nBasePath, `package.nls.json`),
			);
		} catch (e) {
			this._logWarn(
				`Could not form default NLS bundle URI for extension '${extension.identifier.value}' (Base path: '${l10nBasePath}'). Error:`,
				e,
			);
		}

		let l10nBundleLanguageSpecific: VSCodeInternalURI | undefined =
			undefined;
		// Only form language-specific URI if current language is not 'en' (as 'en' is often in the default bundle).
		// This check might need refinement based on actual NLS fallback strategies.
		if (
			this.#currentLanguage &&
			this.#currentLanguage.toLowerCase() !== "en"
		) {
			try {
				l10nBundleLanguageSpecific = VSCodeInternalURI.file(
					path.join(
						l10nBasePath,
						`package.nls.${this.#currentLanguage}.json`,
					),
				);
			} catch (e) {
				this._logWarn(
					`Could not form language-specific NLS bundle URI for extension '${extension.identifier.value}' (Language: '${this.#currentLanguage}', Base path: '${l10nBasePath}'). Error:`,
					e,
				);
			}
		}
		return { l10nBundleLanguageSpecific, l10nBundleDefault };
	}

	/**
	 * Helper to find an IExtensionDescription by its ID string.
	 * This is a placeholder and indicates a dependency on access to the list of all extensions,
	 * typically managed by `IExtHostExtensionService`.
	 */
	private _findExtensionDescription(
		extensionIdString: string,
	): IExtensionDescription | undefined {
		// TODO: This requires access to the list of all known IExtensionDescriptions.
		// This might come from `IExtHostInitDataService.value.extensions.allExtensions` or
		// from `IExtHostExtensionService.getExtensions()`.
		// For this shim to be self-contained for this method, it relies on access to initData.
		// In a real DI setup, IExtHostExtensionService might be injected if needed here.
		const allExtensions = (this as any)._initData?.extensions
			?.allExtensions as IExtensionDescription[] | undefined;
		if (allExtensions) {
			return allExtensions.find(
				(ext) => ext.identifier.value === extensionIdString,
			);
		}
		this._logWarnOnce(
			`_findExtensionDescription for '${extensionIdString}' is a STUB and relies on internal access to _initData. Full implementation might need access to IExtHostExtensionService or similar.`,
		);
		return undefined;
	}

	public override dispose(): void {
		super.dispose(); // Handles _instanceDisposables
		this.#nlsBundlesCache.clear();
		if (
			this.#initializationBarrier &&
			!this.#initializationBarrier.isOpen()
		) {
			this.#initializationBarrier.open(); // Ensure barrier is open on dispose if not already
		}
		this._logInfo("Disposed.");
	}
}
