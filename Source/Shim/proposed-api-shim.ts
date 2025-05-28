/*---------------------------------------------------------------------------------------------
 * Cocoon Proposed API Shim (proposed-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements a service responsible for managing and checking the enablement status of
 * proposed (experimental or unstable) VS Code APIs for extensions running within Cocoon.
 *
 * This shim determines proposed API enablement by parsing configuration data
 * provided during Cocoon's initialization, sourced from:
 *  1. `initData.product?.extensionEnabledApiProposals` (typically from product.json defaults).
 *  2. `initData.environment.extensionEnabledProposedApi` (typically from environment settings
 *     or command-line flags, can override product defaults).
 * This configuration can specify globally enabled proposals or grant enablement for
 * specific proposals to individual extensions.
 *
 * Responsibilities:
 * - Parsing and merging proposed API configurations from both product and environment sources.
 * - Providing the `isProposedApiEnabled(extensionId: ExtensionIdentifier, proposalName: string)`
 *   method to check if a specific proposed API is permitted for a given extension.
 * - Logging the effective proposed API configuration during initialization.
 *
 * Key Interactions:
 * - Registered with DI in `Cocoon/index.ts`.
 * - Relies on `ExtHostInitData` (specifically `environment.extensionEnabledProposedApi`
 *   and `product.extensionEnabledApiProposals`) from Mountain.
 * - `isProposedApiEnabled` is consumed by the API factory and potentially `ExtHostExtensionService`.
 * - Uses `BaseCocoonShim` for logging.
 *
 * TODO:
 *  - Consider dynamic updates to proposed API configuration via RPC if needed in the future.
 *--------------------------------------------------------------------------------------------*/

import {
	ExtensionIdentifier, // VS Code's type for representing extension identifiers
	type IEnabledApiProposals, // VS Code's type for the proposed API configuration object
} from "vs/platform/extensions/common/extensions";
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService"; // For initData structure

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---
// ShimInitDataForProposedApi is effectively ExtHostInitData, focusing on relevant fields.
type ShimInitDataForProposedApi = Pick<
	ExtHostInitData,
	"environment" | "product"
>;

export interface IExtHostProposedApisShape {
	readonly _serviceBrand: undefined;
	isProposedApiEnabled(
		extensionId: ExtensionIdentifier,
		proposalName: string,
	): boolean;
}

/** Cocoon's implementation for managing and checking proposed API enablement. */
export class ShimExtensionsProposedApi
	extends BaseCocoonShim
	implements IExtHostProposedApisShape
{
	public readonly _serviceBrand: undefined;
	readonly #globallyEnabledProposedApis = new Set<string>(); // Stores globally enabled proposal names
	readonly #perExtensionEnabledProposedApis = new Map<string, Set<string>>(); // Key: canonicalExtensionIdString

	constructor(
		initData: ShimInitDataForProposedApi | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super(
			"ExtHostProposedApi",
			undefined /* rpcService not used */,
			logService,
		);
		this._logInfo("Initializing proposed API enablement state...");

		// Process product-defined proposed APIs first (these are defaults)
		const productProposals =
			initData?.product?.extensionEnabledApiProposals;
		if (productProposals) {
			this._logDebug(
				"Processing product-defined proposed APIs:",
				productProposals,
			);
			this._parseAndApplyApiProposalConfig(
				productProposals,
				"product.json",
			);
		} else {
			this._logDebug(
				"No product-defined proposed APIs found in initData.product.",
			);
		}

		// Process environment-defined proposed APIs (these can override/augment product)
		const environmentProposals =
			initData?.environment?.extensionEnabledProposedApi;
		if (environmentProposals) {
			this._logDebug(
				"Processing environment-defined proposed APIs:",
				environmentProposals,
			);
			this._parseAndApplyApiProposalConfig(
				environmentProposals,
				"initData.environment",
			);
		} else {
			this._logDebug(
				"No environment-defined proposed APIs found in initData.environment.",
			);
		}

		if (this.#globallyEnabledProposedApis.size > 0) {
			this._logInfo(
				`Globally enabled proposed APIs: [${[...this.#globallyEnabledProposedApis].join(", ")}]`,
			);
		}
		if (this.#perExtensionEnabledProposedApis.size > 0) {
			this._logInfo(
				`Per-extension proposed API configurations loaded for ${this.#perExtensionEnabledProposedApis.size} specific extension(s).`,
			);
			// For verbose debugging of per-extension settings:
			// this.#perExtensionEnabledProposedApis.forEach((proposals, extId) => {
			//     this._logDebug(`  Ext: ${extId}, Proposals: [${[...proposals].join(", ")}]`);
			// });
		}
		if (
			this.#globallyEnabledProposedApis.size === 0 &&
			this.#perExtensionEnabledProposedApis.size === 0
		) {
			this._logInfo("No proposed APIs are configured as enabled.");
		}
	}

	/**
	 * Parses an API proposal configuration (either array or object) and updates
	 * the internal enablement sets.
	 * @param config The configuration data (string[] or IEnabledApiProposals).
	 * @param sourceName A string identifying the source of the configuration (for logging).
	 */
	private _parseAndApplyApiProposalConfig(
		config: string[] | IEnabledApiProposals,
		sourceName: string,
	): void {
		if (Array.isArray(config)) {
			config.forEach((proposalName) => {
				if (
					typeof proposalName === "string" &&
					proposalName.trim().length > 0
				) {
					this.#globallyEnabledProposedApis.add(proposalName.trim());
				} else {
					this._logWarn(
						`[${sourceName}] Ignoring invalid global proposed API entry: '${String(proposalName)}'`,
					);
				}
			});
		} else if (typeof config === "object" && config !== null) {
			for (const key in config) {
				if (!Object.prototype.hasOwnProperty.call(config, key))
					continue;
				const proposalsForThisKey = (config as IEnabledApiProposals)[
					key
				];
				if (Array.isArray(proposalsForThisKey)) {
					const validProposalsForKey = new Set<string>();
					proposalsForThisKey.forEach((pName) => {
						if (
							typeof pName === "string" &&
							pName.trim().length > 0
						) {
							validProposalsForKey.add(pName.trim());
						} else {
							this._logWarn(
								`[${sourceName}] Ignoring invalid proposal name ('${String(pName)}') under key '${key}'.`,
							);
						}
					});
					if (validProposalsForKey.size === 0) continue;

					if (key === "*") {
						// Global proposals from object config
						validProposalsForKey.forEach((p) =>
							this.#globallyEnabledProposedApis.add(p),
						);
					} else {
						// Per-extension proposals
						const existing =
							this.#perExtensionEnabledProposedApis.get(key) ||
							new Set<string>();
						validProposalsForKey.forEach((p) => existing.add(p));
						this.#perExtensionEnabledProposedApis.set(
							key,
							existing,
						);
					}
				} else {
					this._logWarn(
						`[${sourceName}] Invalid proposal list for key '${key}' (expected array). Ignoring.`,
					);
				}
			}
		} else if (config !== undefined) {
			this._logError(
				`[${sourceName}] Proposed API config is an unexpected type: ${typeof config}. Expected string array or object.`,
			);
		}
	}

	protected override _requiresRpc(): boolean {
		return false;
	}

	public isProposedApiEnabled(
		extensionIdentifier: ExtensionIdentifier,
		proposalName: string,
	): boolean {
		if (!(extensionIdentifier instanceof ExtensionIdentifier)) {
			this._logError(
				"isProposedApiEnabled called with invalid 'extensionIdentifier'.",
				"Received:",
				extensionIdentifier,
			);
			return false;
		}
		if (typeof proposalName !== "string" || !proposalName.trim()) {
			this._logWarn(
				`isProposedApiEnabled called with invalid 'proposalName': '${String(proposalName)}' for ext '${extensionIdentifier.value}'.`,
			);
			return false;
		}
		const trimmedProposalName = proposalName.trim();
		const extensionIdString = extensionIdentifier.value;

		if (this.#globallyEnabledProposedApis.has(trimmedProposalName)) {
			this._logService?.trace(
				`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is GLOBALLY ENABLED.`,
			);
			return true;
		}
		const extensionSpecificProposals =
			this.#perExtensionEnabledProposedApis.get(extensionIdString);
		if (extensionSpecificProposals?.has(trimmedProposalName)) {
			this._logService?.trace(
				`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is EXTENSION-SPECIFICALLY ENABLED.`,
			);
			return true;
		}
		this._logService?.trace(
			`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is NOT ENABLED.`,
		);
		return false;
	}

	public override dispose(): void {
		super.dispose();
		this.#globallyEnabledProposedApis.clear();
		this.#perExtensionEnabledProposedApis.clear();
		this._logInfo("Disposed and cleared proposed API enablement caches.");
	}
}
