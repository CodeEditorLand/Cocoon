/*
 * File: Cocoon/Source/Shim/ProposedAPI.ts
 * Responsibility: Implements a service to manage and check the enablement status of proposed VS Code APIs for extensions in Cocoon, ensuring that only explicitly allowed APIs are accessible.
 * Modified: 2025-06-07 00:57:38 UTC
 * Dependency: vs/workbench/api/common/extHostInitDataService
 * Export: IExtHostProposedApisShape, ShimExtensionsProposedApi
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Proposed API Shim
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
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import {
	ExtensionIdentifier, // VS Code's type for representing extension identifiers
	type IEnabledApiProposals, // VS Code's type for the proposed API configuration object
} from "vs/platform/extensions/common/extensions";
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService"; // For initData structure

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter, // Not used by this shim, but part of BaseCocoonShim constructor
} from "./_baseShim";

// --- Type Definitions ---
// ShimInitDataForProposedApi focuses on the parts of ExtHostInitData relevant to this service.
type ShimInitDataForProposedApi = Pick<
	ExtHostInitData,
	"environment" | "product"
>;

/**
 * Defines the service interface for checking proposed API enablement.
 * This aligns with VS Code's internal service shape for this purpose.
 */
export interface IExtHostProposedApisShape {
	readonly _serviceBrand: undefined; // For DI registration
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

	/**
	 * Creates an instance of ShimExtensionsProposedApi.
	 * @param initData The initialization data containing proposed API enablement configuration from product.json and environment.
	 * @param logService The logging service.
	 */
	constructor(
		initData: ShimInitDataForProposedApi | undefined, // Can be undefined if no initData provided
		logService: ILogServiceForShim | undefined,
	) {
		super(
			"ExtHostProposedApi", // Service identifier for logging
			undefined, // rpcService is not strictly needed for initData-based checks
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

		// Process environment-defined proposed APIs (these can override/augment product defaults)
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

		// Log the final state
		if (this.#globallyEnabledProposedApis.size > 0) {
			this._logInfo(
				`Globally enabled proposed APIs: [${[...this.#globallyEnabledProposedApis].join(", ")}]`,
			);
		}
		if (this.#perExtensionEnabledProposedApis.size > 0) {
			this._logInfo(
				`Per-extension proposed API configurations loaded for ${this.#perExtensionEnabledProposedApis.size} specific extension(s).`,
			);
			// For verbose debugging of per-extension settings (can be uncommented if needed):
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
	 * Parses an API proposal configuration (from product.json or environment variables)
	 * and updates the internal enablement sets.
	 * @param config The configuration data, which can be a simple array of proposal names
	 *               (for global enablement) or an `IEnabledApiProposals` object for more
	 *               granular per-extension or global enablement.
	 * @param sourceName A string identifying the source of the configuration (for logging purposes).
	 */
	private _parseAndApplyApiProposalConfig(
		config: string[] | IEnabledApiProposals,
		sourceName: string,
	): void {
		if (Array.isArray(config)) {
			// Case 1: `config` is a simple array of globally enabled proposal names.
			config.forEach((proposalName) => {
				if (
					typeof proposalName === "string" &&
					proposalName.trim().length > 0
				) {
					this.#globallyEnabledProposedApis.add(proposalName.trim());
				} else {
					this._logWarn(
						`[${sourceName}] Ignoring invalid global proposed API entry (empty or non-string): '${String(proposalName)}'`,
					);
				}
			});
		} else if (typeof config === "object" && config !== null) {
			// Case 2: `config` is an `IEnabledApiProposals` object.
			// Example: `{"*": ["globalProposal"], "publisher.extensionId": ["extSpecificProposal"]}`
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

					if (validProposalsForKey.size === 0) continue; // Skip if no valid proposals for this key.

					if (key === "*") {
						// Key for globally enabled proposals within the object structure.
						validProposalsForKey.forEach((p) =>
							this.#globallyEnabledProposedApis.add(p),
						);
					} else {
						// Key is an extension ID for per-extension proposals.
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
						`[${sourceName}] Invalid proposal list for key '${key}' (expected array, got ${typeof proposalsForThisKey}). Ignoring.`,
					);
				}
			}
		} else if (config !== undefined) {
			// Log error if the configuration is present but of an unexpected type.
			this._logError(
				`[${sourceName}] Proposed API config is an unexpected type: ${typeof config}. Expected string array or object. Configuration ignored.`,
			);
		}
	}

	/**
	 * This shim does not require RPC for its core functionality of checking enablement
	 * based on initialization data.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc IExtHostProposedApisShape.isProposedApiEnabled}
	 * Checks if a specific proposed API is enabled for the given extension.
	 * @param extensionIdentifier The `ExtensionIdentifier` of the extension making the API request.
	 * @param proposalName The name of the proposed API feature (e.g., "chatProvider", "textSearchProvider").
	 * @returns `true` if the proposed API is enabled for the extension (either globally or specifically),
	 *          `false` otherwise.
	 */
	public isProposedApiEnabled(
		extensionIdentifier: ExtensionIdentifier,
		proposalName: string,
	): boolean {
		if (!(extensionIdentifier instanceof ExtensionIdentifier)) {
			this._logError(
				"isProposedApiEnabled called with invalid 'extensionIdentifier' type. It must be an instance of ExtensionIdentifier.",
				"Received:",
				extensionIdentifier,
			);
			return false;
		}
		if (typeof proposalName !== "string" || !proposalName.trim()) {
			this._logWarn(
				`isProposedApiEnabled called with invalid 'proposalName' (empty or non-string): '${String(proposalName)}' for extension '${extensionIdentifier.value}'.`,
			);
			return false;
		}

		const trimmedProposalName = proposalName.trim();
		const extensionIdString = extensionIdentifier.value; // Get the canonical string ID (e.g., "publisher.name")

		// 1. Check globally enabled proposals (from "*" key in object config or top-level array config)
		if (this.#globallyEnabledProposedApis.has(trimmedProposalName)) {
			this._logService?.trace(
				`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is GLOBALLY ENABLED.`,
			);
			return true;
		}

		// 2. Check per-extension enabled proposals
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

	/**
	 * Disposes of resources held by this shim instance.
	 * Clears the cached proposed API enablement sets.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this.#globallyEnabledProposedApis.clear();
		this.#perExtensionEnabledProposedApis.clear();
		this._logInfo("Disposed and cleared proposed API enablement caches.");
	}
}
