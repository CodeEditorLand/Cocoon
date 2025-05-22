/*---------------------------------------------------------------------------------------------
 * Cocoon Localization Shim (localization-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a basic shim for the `IExtHostLocalizationService`.
 * In VS Code, this service is responsible for fetching and providing localized
 * strings (NLS bundles) for extensions.
 *
 * For Cocoon's MVP, this shim provides minimal functionality, likely returning
 * unlocalized (default) strings or empty bundles, as full localization support
 * is complex.
 *
 * Key Interactions:
 * - Injected into `AbstractExtHostExtensionService`.
 * - Would interact with `MainThreadLocalization` via RPC in a full implementation.
 *--------------------------------------------------------------------------------------------*/

import { Event as VscodeEvent } from "vs/base/common/event";
import { URI as VSCodeInternalURI } from "vs/base/common/uri";
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// Actual VS Code interface
import { IExtHostLocalizationService as VscodeIExtHostLocalizationService } from "vs/workbench/api/common/extHostLocalizationService";

import {
	BaseCocoonShim,
	IExtHostRpcService,
	ILogService,
	ProxyIdentifier,
} from "./_baseShim";

// TODO: Import MainContext if RPC calls are made to MainThreadLocalization
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// TODO: Define MainThreadLocalizationShape if RPC is used
// interface MainThreadLocalizationProxyShape {

//     $fetchBuiltInBundleUri(id: string, language: string): Promise<VSCodeInternalUriComponents | undefined>;

//     $fetchBundleContents(uriComponents: VSCodeInternalUriComponents): Promise<string>;

// }

export interface CocoonIExtHostLocalizationService
	extends VscodeIExtHostLocalizationService {
	// No Cocoon-specific extensions needed for this service currently.
}

export class ShimExtHostLocalizationService
	extends BaseCocoonShim
	implements CocoonIExtHostLocalizationService
{
	public readonly _serviceBrand: undefined;

	// #mainThreadLocalizationProxy: MainThreadLocalizationProxyShape | null = null;

	constructor(
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtHostLocalizationService", rpcService, logService);

		// this._log("Initialized (basic stub).");

		// if (this._rpcService) {

		//     this.#mainThreadLocalizationProxy = this._getProxy(
		//         MainContext.MainThreadLocalization as ProxyIdentifier<MainThreadLocalizationProxyShape>
		//     );

		// }

		// if (!this.#mainThreadLocalizationProxy) {

		//     this._logWarn("MainThreadLocalization proxy not available. Localization will be stubbed.");

		// }
	}

	public async getSystemTranslations(
		_extensionId: ExtensionIdentifier,
	): Promise<Record<string, string> | undefined> {
		this._logWarnOnce(
			"getSystemTranslations() STUB - returning undefined. Full NLS not supported in MVP Cocoon.",
		);

		return undefined;
	}

	public getBundle(extensionId: string): Record<string, string> | undefined {
		// For MVP, return undefined or an empty object, indicating no bundle found.
		this._logWarnOnce(
			`getBundle('${extensionId}') STUB - returning undefined. Full NLS not supported in MVP Cocoon.`,
		);

		return undefined;
	}

	public getBundleUri(extensionId: string): VscodeApiUri | undefined {
		// vscode.Uri
		this._logWarnOnce(
			`getBundleUri('${extensionId}') STUB - returning undefined.`,
		);

		return undefined;
	}

	public async initializeLocalizedMessages(
		extension: IExtensionDescription,
	): Promise<void> {
		// This is called by ExtHostExtensionService before activating an extension.
		// A real implementation would fetch the NLS JSON from the main thread or disk.
		// For MVP Cocoon, this can be a NOP if extensions don't rely heavily on this for basic functionality.
		// this._log(`initializeLocalizedMessages for ${extension.identifier.value} (NOP in shim).`);

		if (extension.localizedMessages?.default) {
			this._log(
				`Extension ${extension.identifier.value} has default localizedMessages URI: ${extension.localizedMessages.default.toString()}`,
			);

			// TODO: If actual NLS loading is attempted, this would involve:
			// 1. Fetching the bundle content (e.g., via `this.#mainThreadLocalizationProxy?.$fetchBundleContents(...)`).
			// 2. Parsing it and storing it, perhaps in a map, for `getBundle` to use.
		}

		return Promise.resolve();
	}

	public readonly onDidInitializeLocalization: VscodeEvent<void> =
		// Stub event
		VscodeEvent.None;
}
