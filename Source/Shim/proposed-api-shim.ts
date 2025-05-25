/*---------------------------------------------------------------------------------------------
 * Cocoon Proposed API Shim (proposed-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements a service responsible for checking whether specific proposed VS Code APIs
 * are enabled for a given extension. In the VS Code ecosystem, "proposed APIs" are
 * experimental or unstable APIs that extensions can opt into by declaring them in their
 * `package.json` and which require explicit enablement by the user or product.
 *
 * This shim determines enablement based on configuration data provided during Cocoon's
 * initialization (typically from `initData.environment.extensionEnabledProposedApi`).
 * This data can specify globally enabled proposals or per-extension enablement.
 *
 * Responsibilities:
 * - Parsing and storing the list of enabled proposed APIs from initialization data.
 *   This includes handling both globally enabled proposals (e.g., from a `"*"` key)
 *   and proposals enabled for specific extension IDs.
 * - Providing an `isProposedApiEnabled(extensionId, proposalName)` method that checks
 *   if a given proposed API (`proposalName`) is enabled for the specified extension
 *   (`extensionId`).
 *
 * Key Interactions:
 * - Relies on `ExtHostInitData` (specifically `environment.extensionEnabledProposedApi`)
 *   provided during Cocoon's startup in `index.ts`.
 * - The `isProposedApiEnabled` method is typically used by:
 *   - The API factory (`createApiFactory` in `index.ts`) when constructing the `vscode`
 *     API object for an extension, to decide whether to include proposed API features.
 *   - The `ExtHostExtensionService` (or its shim) during extension activation if it
 *     needs to perform checks before exposing certain functionalities.
 * - Registered with Dependency Injection in `Cocoon/index.ts` (e.g., as `IExtHostProposedApis`).
 * - Uses `BaseCocoonShim` for logging.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import {
	ExtensionIdentifier,
	// VS Code's type for proposed API configuration
	type IEnabledApiProposals,
} from "vs/platform/extensions/common/extensions";

import {
	BaseCocoonShim,
	// Renamed from ILogService
	type ILogServiceForShim,
	// Renamed from IExtHostRpcService
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// --- Type Definitions ---

/**
 * Defines the structure of `initData.environment` relevant to this proposed API shim.
 */
interface ShimInitDataForProposedApi {
	environment?: {
		/**
		 * Configuration for enabled proposed APIs.
		 * Can be a simple array of proposal names (globally enabled for all extensions
		 * that request them), or an `IEnabledApiProposals` object for more granular
		 * per-extension enablement (e.g., `{"*": ["proposalA"], "ext.id": ["proposalB"]}`).
		 */
		extensionEnabledProposedApi?: string[] | IEnabledApiProposals;

		// ... other environment properties
	};

	// ... other initData properties
}

/**
 * Defines the service interface for checking proposed API enablement.
 * This should align with VS Code's `ExtHostProposedApisShape` or a similar
 * internal service interface if this shim is to implement it for DI.
 */
export interface IExtHostProposedApisShape {
	// Renamed to Shape for clarity if API is different
	// For DI registration
	readonly _serviceBrand: undefined;

	/**
	 * Checks if a specific proposed API is enabled for the given extension.
	 * @param extensionId The identifier of the extension making the API request.
	 * @param proposalName The name of the proposed API feature (e.g., "chatProvider").
	 * @returns `true` if the proposed API is enabled for the extension, `false` otherwise.
	 */
	isProposedApiEnabled(
		extensionId: ExtensionIdentifier,

		proposalName: string,
	): boolean;

	// Example of other methods a full ExtHostProposedApis service might have:
	// $registerBuiltinProposalActions?(extensionId: string, proposals: string[]): Promise<void>;

	// $registerProductProperty?(name: string, value: any): Promise<void>;
}

/**
 * Cocoon's implementation for managing and checking proposed API enablement.
 * It reads enablement configuration from `initData`.
 */
export class ShimExtensionsProposedApi
	extends BaseCocoonShim
	implements IExtHostProposedApisShape
{
	public readonly _serviceBrand: undefined;

	// Stores globally enabled proposal names (strings).
	readonly #globallyEnabledProposedApis = new Set<string>();

	// Stores per-extension enabled proposals: Map<extensionIdString, Set<proposalNameString>>.
	readonly #perExtensionEnabledProposedApis = new Map<string, Set<string>>();

	/**
	 * Creates an instance of ShimExtensionsProposedApi.
	 * @param initData The initialization data containing proposed API enablement configuration.
	 * @param logService The logging service.
	 */
	constructor(
		// Can be undefined if no initData provided
		initData: ShimInitDataForProposedApi | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super(
			// Service identifier for logging
			"ExtHostProposedApi",

			// rpcService is not strictly needed for initData-based checks
			undefined,

			logService,
		);

		const enabledApiConfig =
			initData?.environment?.extensionEnabledProposedApi;

		this._log("Initializing proposed API enablement state...");

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
						`Ignoring invalid (empty or non-string) entry in global 'extensionEnabledProposedApi' list: '${String(proposalName)}'`,
					);
				}
			});

			this._log(
				`Initialized with ${this.#globallyEnabledProposedApis.size} globally enabled proposed API(s): [${[...this.#globallyEnabledProposedApis].join(", ")}]`,
			);
		} else if (
			typeof enabledApiConfig === "object" &&
			enabledApiConfig !== null
		) {
			// Case 2: `extensionEnabledProposedApi` is an `IEnabledApiProposals` object
			// (e.g., `{"*": ["globalProposal"], "publisher.extensionId": ["extSpecificProposal"]}`).
			let globalCount = 0;

			let perExtensionConfigCount = 0;

			for (const key in enabledApiConfig) {
				if (
					!Object.prototype.hasOwnProperty.call(enabledApiConfig, key)
				)
					continue;

				const proposalsForThisKey = (
					enabledApiConfig as IEnabledApiProposals
				)[key];

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
								`Ignoring invalid proposal name ('${String(pName)}') under key '${key}' in 'extensionEnabledProposedApi'.`,
							);
						}
					});

					// Skip if no valid proposals for this key
					if (validProposalsForKey.size === 0) continue;

					if (key === "*") {
						// Key for globally enabled proposals
						validProposalsForKey.forEach((p) =>
							this.#globallyEnabledProposedApis.add(p),
						);

						globalCount = this.#globallyEnabledProposedApis.size;
					} else {
						// Key is an extension ID for per-extension proposals
						this.#perExtensionEnabledProposedApis.set(
							key,

							validProposalsForKey,
						);

						perExtensionConfigCount++;
					}
				} else {
					this._logWarn(
						`Invalid proposal list for key '${key}' in 'extensionEnabledProposedApi' object (expected array, got ${typeof proposalsForThisKey}). Ignoring.`,
					);
				}
			}

			this._log(
				`Initialized proposed APIs from object configuration. Globally enabled: ${globalCount}. Specific configurations for ${perExtensionConfigCount} extension(s).`,
			);
		} else if (enabledApiConfig !== undefined) {
			this._logError(
				`'extensionEnabledProposedApi' in initData was of an unexpected type: ${typeof enabledApiConfig}. No proposed APIs will be considered enabled by default based on this configuration.`,
			);
		} else {
			this._logWarn(
				`'extensionEnabledProposedApi' not found or is undefined in initData. No proposed APIs will be considered enabled by default based on this configuration.`,
			);
		}
	}

	/**
	 * This shim does not require RPC for its core functionality of checking initData.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * {@inheritDoc IExtHostProposedApisShape.isProposedApiEnabled}
	 *
	 */
	public isProposedApiEnabled(
		// Expect ExtensionIdentifier for type safety
		extensionIdentifier: ExtensionIdentifier,

		proposalName: string,
	): boolean {
		if (!(extensionIdentifier instanceof ExtensionIdentifier)) {
			this._logError(
				"isProposedApiEnabled called with invalid extensionIdentifier type. It must be an instance of ExtensionIdentifier.",

				"Received:",

				extensionIdentifier,
			);

			return false;
		}

		if (typeof proposalName !== "string" || !proposalName.trim()) {
			this._logWarn(
				`isProposedApiEnabled called with invalid proposalName: '${String(proposalName)}' for extension '${extensionIdentifier.value}'.`,
			);

			return false;
		}

		const trimmedProposalName = proposalName.trim();

		// Get the canonical string ID
		const extensionIdString = extensionIdentifier.value;

		// 1. Check globally enabled proposals (from "*" or top-level array)
		if (this.#globallyEnabledProposedApis.has(trimmedProposalName)) {
			// this._logService?.trace(`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is GLOBALLY ENABLED.`);

			return true;
		}

		// 2. Check per-extension enabled proposals
		const extensionSpecificProposals =
			this.#perExtensionEnabledProposedApis.get(extensionIdString);

		if (extensionSpecificProposals?.has(trimmedProposalName)) {
			// this._logService?.trace(`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is specifically ENABLED for this extension.`);

			return true;
		}

		// this._logService?.trace(`Proposed API '${trimmedProposalName}' for ext '${extensionIdString}' is NOT ENABLED.`);

		return false;
	}

	// TODO: Implement other methods from IExtHostProposedApis or VS Code's ExtHostProposedApisShape
	// if they are needed by Cocoon (e.g., for dynamic registration of proposals by built-in extensions,

	// which would likely involve RPC calls to a MainThreadProposedApis service).
	// Example placeholder:
	// public async $registerBuiltinProposalActions(extensionIdString: string, proposals: string[]): Promise<void> {

	//     const extensionId = new ExtensionIdentifier(extensionIdString);

	//     this._logWarn(`RPC $registerBuiltinProposalActions for ${extensionId.value}, proposals [${proposals.join(', ')}] - STUBBED. This would update local enablement state.`);

	// This would typically involve updating #perExtensionEnabledProposedApis or similar,

	//
	// and potentially notifying other services if enablement changes dynamically.
	//
	// }

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		this.#globallyEnabledProposedApis.clear();

		this.#perExtensionEnabledProposedApis.clear();

		this._log("Disposed and cleared proposed API enablement caches.");
	}
}
