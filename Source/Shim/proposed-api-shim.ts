/*---------------------------------------------------------------------------------------------
 * Cocoon Proposed API Shim (proposed-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements a service responsible for managing and checking the enablement status of
 * proposed (experimental or unstable) VS Code APIs for extensions running within Cocoon.
 *
 * In the VS Code ecosystem, extensions must explicitly declare their intent to use
 * proposed APIs in their `package.json`. The editor (or in this case, Mountain/Cocoon)
 * then controls whether these requested proposals are actually enabled, either globally
 * for all extensions or on a per-extension basis. This mechanism allows for the safe
 * introduction and testing of new API features.
 *
 * This shim determines proposed API enablement primarily by parsing configuration data
 * provided during Cocoon's initialization, typically sourced from
 * `initData.environment.extensionEnabledProposedApi`. This configuration can specify
 * globally enabled proposals (e.g., via a `"*"` key or a flat array) or grant
 * enablement for specific proposals to individual extensions.
 *
 * Responsibilities:
 * - Parsing and storing the configuration of enabled proposed APIs from the
 *   initialization data received from Mountain. This includes handling both:
 *     - A simple array of strings, where each string is a globally enabled proposal name.
 *     - An `IEnabledApiProposals` object (e.g., `{"*": ["globalProposal"], "pub.extId": ["extSpecificProposal"]}`)
 *       for more granular control.
 * - Providing the `isProposedApiEnabled(extensionId: ExtensionIdentifier, proposalName: string)`
 *   method. This method is queried to determine if a specific proposed API feature
 *   (identified by `proposalName`) is permitted for use by the given extension.
 * - Logging the parsed proposed API configuration during initialization for transparency.
 *
 * Key Interactions:
 * - An instance of `ShimExtensionsProposedApi` is registered with Dependency Injection
 *   in `Cocoon/index.ts` (e.g., as `ICocoonExtHostProposedApis` or a similar DI key).
 * - It relies on `ExtHostInitData.environment.extensionEnabledProposedApi` (provided by
 *   Mountain via `index.ts`) as the source of truth for enablement status.
 * - The `isProposedApiEnabled` method is crucial and typically consumed by:
 *   - The API factory (`createApiFactory` in `index.ts`) when it constructs the `vscode`
 *     API object for an extension. The factory uses this check to decide whether to
 *     include or expose specific proposed API functionalities on the `vscode` object.
 *   - The `ExtHostExtensionService` (or its shim) during the extension activation
 *     process if it needs to perform checks before enabling certain internal features
 *     tied to proposed APIs.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

import {
	// VS Code's type for representing extension identifiers
	ExtensionIdentifier,
	// VS Code's type for the proposed API configuration object
	type IEnabledApiProposals,
} from "vs/platform/extensions/common/extensions";

import {
	BaseCocoonShim,
	// For BaseCocoonShim constructor
	type ILogServiceForShim,
	// For BaseCocoonShim constructor, though not directly used by this shim's core logic
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the structure of `initData.environment` relevant to this proposed API shim.
 * This is a subset of `ExtHostInitData.environment`.
 */
interface ShimInitDataForProposedApi {
	environment?: {
		/**
		 * Configuration for enabled proposed APIs. This can be:
		 * 1. An array of strings: Each string is a proposal name that is globally
		 *    enabled for any extension that declares it in its `package.json`.
		 * 2. An `IEnabledApiProposals` object: Allows for finer-grained control,
		 *    mapping extension IDs (or a wildcard `*` for global) to an array of
		 *    enabled proposal names for that scope.
		 *    Example: `{"*": ["proposalA"], "publisher.extensionId": ["proposalB"]}`
		 */
		extensionEnabledProposedApi?: string[] | IEnabledApiProposals;

		// ... other environment properties might exist but are not used by this shim.
	};

	// ... other initData properties might exist.
}

/**
 * Defines the service interface for checking proposed API enablement within the ExtHost.
 * This should align with VS Code's internal `ExtHostProposedApisShape` or a similar
 * service interface if this shim is intended for direct DI registration and consumption
 * by other VS Code ExtHost components.
 */
export interface IExtHostProposedApisShape {
	// For DI registration compatibility.
	readonly _serviceBrand: undefined;

	/**
	 * Checks if a specific proposed API feature is enabled for the given extension.
	 * The determination is based on the configuration provided at startup.
	 *
	 * @param extensionId The `ExtensionIdentifier` of the extension making the API request
	 *                    or for which enablement is being checked.
	 * @param proposalName The name of the proposed API feature (e.g., "chatProvider", "workspaceTrust").
	 * @returns `true` if the proposed API is considered enabled for the specified extension, `false` otherwise.
	 */
	isProposedApiEnabled(
		extensionId: ExtensionIdentifier,
		proposalName: string,
	): boolean;

	// TODO (Future): If Cocoon needs to support dynamic registration of proposals (e.g., by built-in extensions
	// that are part of Mountain/Cocoon itself), methods like these might be needed, likely involving RPC
	// to a `MainThreadProposedApis` service on Mountain.
	// $registerBuiltinProposalActions?(extensionIdString: string, proposals: string[]): Promise<void>;

	// $registerProductProperty?(propertyName: string, value: any): Promise<void>;
}

/**
 * Cocoon's implementation for managing and checking proposed API enablement.
 * It reads the enablement configuration from initialization data (`initData`)
 * provided by Mountain at startup.
 */
export class ShimExtensionsProposedApi
	extends BaseCocoonShim
	implements IExtHostProposedApisShape
{
	public readonly _serviceBrand: undefined;

	// Stores globally enabled proposal names (as strings).
	readonly #globallyEnabledProposedApis = new Set<string>();

	// Stores per-extension enabled proposals: Map<canonicalExtensionIdString, Set<proposalNameString>>.
	readonly #perExtensionEnabledProposedApis = new Map<string, Set<string>>();

	/**
	 * Creates an instance of ShimExtensionsProposedApi.
	 * Parses the proposed API enablement configuration from `initData`.
	 *
	 * @param initData The initialization data from Mountain, expected to contain
	 *                 `environment.extensionEnabledProposedApi`. Can be `undefined` if no
	 *                 initData is available, in which case no proposals will be enabled by default.
	 * @param logService The logging service instance.
	 */
	constructor(
		initData: ShimInitDataForProposedApi | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super(
			// Service identifier for logging
			"ExtHostProposedApi",
			// rpcService is not used by this shim for its core initData-based checks.
			undefined,
			logService,
		);

		const enabledApiConfig =
			initData?.environment?.extensionEnabledProposedApi;

		this._logInfo(
			"Initializing proposed API enablement state from initData...",
		);

		if (Array.isArray(enabledApiConfig)) {
			// Case 1: `extensionEnabledProposedApi` is a simple array of globally enabled proposal names.
			enabledApiConfig.forEach((proposalName) => {
				if (
					typeof proposalName === "string" &&
					proposalName.trim().length > 0
				) {
					this.#globallyEnabledProposedApis.add(proposalName.trim());
				} else {
					this._logWarn(
						`Ignoring invalid (empty or non-string) entry in global 'extensionEnabledProposedApi' array: '${String(proposalName)}'`,
					);
				}
			});

			this._logInfo(
				`Initialized with ${this.#globallyEnabledProposedApis.size} globally enabled proposed API(s): [${[...this.#globallyEnabledProposedApis].join(", ")}]`,
			);
		} else if (
			typeof enabledApiConfig === "object" &&
			enabledApiConfig !== null
		) {
			// Case 2: `extensionEnabledProposedApi` is an `IEnabledApiProposals` object
			// (e.g., `{"*": ["globalProposal"], "publisher.extensionId": ["extSpecificProposal"]}`).
			let globalProposalsCount = 0;

			let perExtensionConfigsCount = 0;

			for (const key in enabledApiConfig) {
				if (
					!Object.prototype.hasOwnProperty.call(enabledApiConfig, key)
				)
					continue;

				const proposalsForThisKey =
					// e.g., ["proposalA", "proposalB"]
					(enabledApiConfig as IEnabledApiProposals)[key];

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
								`Ignoring invalid proposal name ('${String(pName)}') found under key '${key}' in 'extensionEnabledProposedApi' object. Proposal names must be non-empty strings.`,
							);
						}
					});

					if (validProposalsForKey.size === 0) {
						// Skip if no valid proposals after filtering
						this._logDebug(
							`No valid proposals found for key '${key}' after filtering invalid entries.`,
						);

						continue;
					}

					if (key === "*") {
						// Key for globally enabled proposals
						validProposalsForKey.forEach((p) =>
							this.#globallyEnabledProposedApis.add(p),
						);

						globalProposalsCount =
							this.#globallyEnabledProposedApis.size;
					} else {
						// Key is an extension ID (e.g., "publisher.name") for per-extension proposals
						this.#perExtensionEnabledProposedApis.set(
							key,
							validProposalsForKey,
						);

						perExtensionConfigsCount++;

						this._logDebug(
							`Stored ${validProposalsForKey.size} proposed API(s) for extension '${key}': [${[...validProposalsForKey].join(", ")}]`,
						);
					}
				} else {
					this._logWarn(
						`Invalid proposal list for key '${key}' in 'extensionEnabledProposedApi' object (expected an array, but got type: ${typeof proposalsForThisKey}). This configuration key will be ignored.`,
					);
				}
			}

			this._logInfo(
				`Initialized proposed APIs from object configuration. Globally enabled count: ${globalProposalsCount}. Specific configurations for ${perExtensionConfigsCount} extension(s) processed.`,
			);
		} else if (enabledApiConfig !== undefined) {
			// Config is present but not array or object
			this._logError(
				`'extensionEnabledProposedApi' in initData was provided but is of an unexpected type: ${typeof enabledApiConfig}. Expected string array or object. No proposed APIs will be considered enabled by default from this configuration.`,
			);
		} else {
			// Config is undefined or null
			this._logWarn(
				`'extensionEnabledProposedApi' configuration not found or is undefined in initData. No proposed APIs will be considered enabled by default from initData.`,
			);
		}
	}

	/**
	 * This shim's core functionality (checking enablement based on `initData`) does not require RPC.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc IExtHostProposedApisShape.isProposedApiEnabled}
	 *
	 */
	public isProposedApiEnabled(
		extensionIdentifier: ExtensionIdentifier,
		proposalName: string,
	): boolean {
		if (!(extensionIdentifier instanceof ExtensionIdentifier)) {
			this._logError(
				"isProposedApiEnabled was called with an invalid 'extensionIdentifier'. It must be an instance of 'ExtensionIdentifier'.",
				"Received type:",
				typeof extensionIdentifier,
				"Value:",
				extensionIdentifier,
			);

			return false;
		}

		if (typeof proposalName !== "string" || !proposalName.trim()) {
			this._logWarn(
				`isProposedApiEnabled called with an invalid or empty 'proposalName': '${String(proposalName)}' for extension '${extensionIdentifier.value}'. Returning false.`,
			);

			return false;
		}

		const trimmedProposalName = proposalName.trim();

		// Get the canonical string ID (publisher.name)
		const extensionIdString = extensionIdentifier.value;

		// Priority 1: Check globally enabled proposals (from "*" key or top-level array in config).
		if (this.#globallyEnabledProposedApis.has(trimmedProposalName)) {
			this._logService?.trace(
				`Proposed API '${trimmedProposalName}' for extension '${extensionIdString}' is GLOBALLY ENABLED.`,
			);

			return true;
		}

		// Priority 2: Check proposals specifically enabled for this particular extension ID.
		const extensionSpecificProposals =
			this.#perExtensionEnabledProposedApis.get(extensionIdString);

		if (extensionSpecificProposals?.has(trimmedProposalName)) {
			this._logService?.trace(
				`Proposed API '${trimmedProposalName}' for extension '${extensionIdString}' is SPECIFICALLY ENABLED for this extension.`,
			);

			return true;
		}

		// If not found in either global or extension-specific enabled lists.
		this._logService?.trace(
			`Proposed API '${trimmedProposalName}' for extension '${extensionIdString}' is NOT ENABLED based on current configuration.`,
		);

		return false;
	}

	// TODO (Future): Implement other methods from a more complete `ExtHostProposedApisShape` if Cocoon
	// needs to support dynamic registration of proposals by built-in extensions. This would likely involve
	// RPC calls to a corresponding `MainThreadProposedApis` service on the Mountain side.
	// Example placeholder for such a method:
	// public async $registerBuiltinProposalActions(extensionIdString: string, proposals: string[]): Promise<void> {

	// Convert string ID to ExtensionIdentifier
	//     const extensionId = new ExtensionIdentifier(extensionIdString);

	//     this._logWarn(`RPC $registerBuiltinProposalActions called for extension '${extensionId.value}' with proposals [${proposals.join(', ')}] - STUBBED. This would update local enablement state for built-ins.`);

	// This would typically involve:
	//
	// 1. Validating that `extensionIdString` refers to a known "built-in" or trusted extension.
	//
	// 2. Updating `this.#perExtensionEnabledProposedApis` or a similar internal store.
	//
	// 3. Potentially notifying other services if the enablement change needs to be broadcast.
	//
	// }

	/**
	 * Disposes of resources held by this shim instance, primarily clearing the
	 * internal caches of enabled proposed APIs.
	 */
	public override dispose(): void {
		// From BaseCocoonShim, handles _instanceDisposables
		super.dispose();

		this.#globallyEnabledProposedApis.clear();

		this.#perExtensionEnabledProposedApis.clear();

		this._logInfo("Disposed and cleared proposed API enablement caches.");
	}
}
