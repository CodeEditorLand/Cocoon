/*---------------------------------------------------------------------------------------------
 * Cocoon Proposed API Shim (proposed-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Handles checks for proposed VS Code API enablement. In Cocoon's context, this shim
 * primarily relies on initialization data from Mountain to determine which proposed APIs
 * are globally enabled or enabled for specific extensions.
 *
 * Responsibilities:
 * - Reading the list of enabled proposed APIs from `initData.environment.extensionEnabledProposedApi`.
 * - Providing `isProposedApiEnabled(extensionId, proposalName)` to check if a specific
 *   proposal is enabled for a given extension.
 *
 * Key Interactions:
 * - Relies on `initData` provided during Cocoon startup.
 * - Used by the API factory (`createApiFactory` in `index.ts`) or `ExtHostExtensionService`
 *   when constructing the `vscode` API object for an extension, to determine if
 *   proposed API features should be exposed.
 *--------------------------------------------------------------------------------------------*/

import {
	ExtensionIdentifier,
	type IEnabledApiProposals,
} from "vs/platform/extensions/common/extensions";

import { BaseCocoonShim, type ILogService } from "./_baseShim";

// TODO: Ensure IEnabledApiProposals is correctly defined or imported if it's a specific VS Code type.
// It's often `string[] | { [extensionId: string]: string[]; '*': string[] }`.

// --- Type Definitions ---

// Structure of initData relevant to this shim
interface ShimInitDataForProposedApi {
	environment?: {
		// In VS Code, this can be a simple array of proposal names (globally enabled)
		// or an IEnabledApiProposals object for per-extension enablement.
		extensionEnabledProposedApi?: string[] | IEnabledApiProposals;

		// ... other environment properties
	};

	// ... other initData properties
}

// Interface for the service this shim provides (should align with VS Code's ExtHostProposedApisShape or similar)
// TODO: Define this more accurately based on the actual VS Code interface if this shim is to implement it fully.
export interface IExtHostProposedApis {
	readonly _serviceBrand: undefined;

	isProposedApiEnabled(
		extensionId: ExtensionIdentifier,

		proposalName: string,
	): boolean;

	// Example of other methods a full ExtHostProposedApis might have:
	// $registerBuiltinProposalActions?(extensionId: string, proposals: string[]): Promise<void>;

	// $registerProductProperty?(name: string, value: any): Promise<void>;
}

export class ShimExtensionsProposedApi
	extends BaseCocoonShim
	implements IExtHostProposedApis
{
	public readonly _serviceBrand: undefined;

	// Stores globally enabled proposal names (strings)
	readonly #globallyEnabledProposedApis = new Set<string>();

	// Stores per-extension enabled proposals
	readonly #perExtensionEnabledProposedApis = new Map<string, Set<string>>();

	constructor(
		initData: ShimInitDataForProposedApi | undefined,

		logService: ILogService | undefined,
	) {
		super(
			"ExtensionsProposedApi",

			undefined /* rpcService not needed for initData-based checks */,

			logService,
		);

		const enabledApiConfig =
			initData?.environment?.extensionEnabledProposedApi;

		if (Array.isArray(enabledApiConfig)) {
			// Simple list: all are globally enabled
			enabledApiConfig.forEach((proposalName) => {
				if (
					typeof proposalName === "string" &&
					proposalName.length > 0
				) {
					this.#globallyEnabledProposedApis.add(proposalName);
				} else {
					this._logWarn(
						`Ignoring invalid entry in global extensionEnabledProposedApi list: ${proposalName}`,
					);
				}
			});

			this._log(
				`Initialized with ${this.#globallyEnabledProposedApis.size} globally enabled proposed APIs: [${[...this.#globallyEnabledProposedApis].join(", ")}]`,
			);
		} else if (
			typeof enabledApiConfig === "object" &&
			enabledApiConfig !== null
		) {
			// IEnabledApiProposals object: { '*': string[], 'ext.id': string[] }
			let globalCount = 0;

			let perExtCount = 0;

			for (const key in enabledApiConfig) {
				const proposals = (enabledApiConfig as IEnabledApiProposals)[
					key
				];

				if (Array.isArray(proposals)) {
					if (key === "*") {
						// Global proposals
						proposals.forEach((p) => {
							if (typeof p === "string" && p.length > 0)
								this.#globallyEnabledProposedApis.add(p);
						});

						globalCount = this.#globallyEnabledProposedApis.size;
					} else {
						// Per-extension proposals
						const extProposals = new Set<string>();

						proposals.forEach((p) => {
							if (typeof p === "string" && p.length > 0)
								extProposals.add(p);
						});

						if (extProposals.size > 0) {
							this.#perExtensionEnabledProposedApis.set(
								key,

								extProposals,
							);

							perExtCount++;
						}
					}
				} else {
					this._logWarn(
						`Invalid proposal list for key '${key}' in extensionEnabledProposedApi:`,

						proposals,
					);
				}
			}
			this._log(
				`Initialized proposed APIs. Globally enabled: ${globalCount}. Specific configurations for ${perExtCount} extensions.`,
			);
		} else {
			this._logWarn(
				`'extensionEnabledProposedApi' not found or invalid in initData. No proposed APIs will be considered enabled by default.`,
			);
		}
	}

	/**
	 * Checks if a specific proposed API is enabled for a given extension.
	 * It checks globally enabled APIs and per-extension enabled APIs.
	 */
	public isProposedApiEnabled(
		extensionIdentifier: ExtensionIdentifier, // Use ExtensionIdentifier directly
		proposalName: string,
	): boolean {
		if (!(extensionIdentifier instanceof ExtensionIdentifier)) {
			this._logError(
				"isProposedApiEnabled called with invalid extensionIdentifier type:",

				extensionIdentifier,
			);

			return false;
		}
		const extensionIdString = extensionIdentifier.value;

		// 1. Check globally enabled proposals
		if (this.#globallyEnabledProposedApis.has(proposalName)) {
			this._log(
				`Proposed API '${proposalName}' for ext '${extensionIdString}' is GLOBALLY ENABLED.`,
			);

			return true;
		}

		// 2. Check per-extension enabled proposals
		const extensionSpecificProposals =
			this.#perExtensionEnabledProposedApis.get(extensionIdString);

		if (extensionSpecificProposals?.has(proposalName)) {
			this._log(
				`Proposed API '${proposalName}' for ext '${extensionIdString}' is specifically ENABLED for this extension.`,
			);

			return true;
		}

		this._log(
			`Proposed API '${proposalName}' for ext '${extensionIdString}' is NOT ENABLED.`,
		);

		return false;
	}

	// TODO: Implement other methods from IExtHostProposedApis or VS Code's ExtHostProposedApisShape
	// if they are needed (e.g., for dynamic registration of proposals by built-in extensions,

	// which would likely involve RPC calls to MainThreadProposedApis).
	// Example:
	// public async $registerBuiltinProposalActions(extensionIdString: string, proposals: string[]): Promise<void> {

	//     const extensionId = new ExtensionIdentifier(extensionIdString);

	//     this._logWarn(`$registerBuiltinProposalActions for ${extensionId.value}, proposals [${proposals.join(', ')}] - STUB`);

	//     // This would typically involve updating local enablement state and/or notifying other services.
	// }
}
