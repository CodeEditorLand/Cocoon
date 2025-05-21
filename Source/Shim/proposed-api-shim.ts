/*---------------------------------------------------------------------------------------------
 * Cocoon Proposed API Shim (shims/proposed-api-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Handles checks for proposed VS Code APIs enablement based on initial environment data.
 * In a real scenario, this integrates deeply with the extension service and API factory.
 * For Cocoon's MVP, it primarily reads the list of globally enabled proposed APIs
 * from initData and provides a check function (`isProposedApiEnabled`).
 *--------------------------------------------------------------------------------------------*/
// For strict type checking/comparison
import { ExtensionIdentifier } from "vs/platform/extensions/common/extensions";

// IExtHostRpcService not needed
import { BaseCocoonShim, ILogService } from "./_baseShim";

// Define the structure of initData relevant to this shim
interface ShimInitDataProposedApi {
	environment?: {
		extensionEnabledProposedApi?: string[];

		// ... other environment properties
	};

	// ... other initData properties
}

// Define the interface this shim might implement (e.g., from ExtHostProposedApiShape)
export interface IExtHostProposedApi {
	readonly _serviceBrand: undefined;

	isProposedApiEnabled(
		extensionId: ExtensionIdentifier,
		proposalName: string,
	): boolean;

	// Other methods like $registerBuiltinየ... if dynamically registering proposals
}

export class ShimExtensionsProposedApi
	extends BaseCocoonShim
	implements IExtHostProposedApi
{
	public readonly _serviceBrand: undefined;

	// Stores proposal names (strings)
	readonly #enabledProposedApis = new Set<string>();

	constructor(
		// Make initData potentially undefined for robustness
		initData: ShimInitDataProposedApi | undefined,
		logService: ILogService | undefined,
	) {
		// No RPC needed for basic enablement checks based on initData passed during startup
		super("ExtensionsProposedApi", undefined /* rpcService */, logService);

		const enabledList = initData?.environment?.extensionEnabledProposedApi;

		if (Array.isArray(enabledList)) {
			enabledList.forEach((proposalName) => {
				if (
					typeof proposalName === "string" &&
					proposalName.length > 0
				) {
					this.#enabledProposedApis.add(proposalName);
				} else {
					this._logWarn(
						`Ignoring non-string or empty entry in extensionEnabledProposedApi list: ${proposalName}`,
					);
				}
			});

			this._log(
				`Initialized with ${this.#enabledProposedApis.size} enabled proposed APIs: ${[...this.#enabledProposedApis].join(", ")}`,
			);
		} else {
			this._logWarn(
				`No 'extensionEnabledProposedApi' list found or not an array in initData.environment. No proposed APIs will be considered enabled.`,
			);
		}
	}

	/**
	 * Checks if a specific proposal is enabled (based on the initial global list).
	 * This is the core logic used by the API factory or extension service when constructing
	 * extension APIs or contexts.
	 * @param {ExtensionIdentifier | string} extensionId Extension ID object or string identifier.
	 * @param {string} proposalName Name of the proposed API feature (e.g., 'testProposedApi').
	 * @returns {boolean} True if the proposal name was in the initial `extensionEnabledProposedApi` list.
	 */
	public isProposedApiEnabled(
		extensionIdInput: ExtensionIdentifier | string,
		proposalName: string,
	): boolean {
		let extensionIdString: string;

		if (extensionIdInput instanceof ExtensionIdentifier) {
			extensionIdString = extensionIdInput.value;
		} else if (typeof extensionIdInput === "string") {
			extensionIdString = extensionIdInput;
		} else {
			this._logWarn(
				`isProposedApiEnabled called with invalid extensionId type:`,
				extensionIdInput,
			);

			// Cannot determine for unknown extension ID type
			return false;
		}

		const enabled = this.#enabledProposedApis.has(proposalName);

		this._log(
			`isProposedApiEnabled check: ext='${extensionIdString}', proposal='${proposalName}', enabled=${enabled}`,
		);

		// MVP behavior: Check only against the global list provided by initData.
		// Real VS Code might have more complex per-extension enablement logic involving extension manifests etc.,
		// but this covers the basic enablement flag passed from the main process.
		return enabled;
	}

	// Other methods potentially part of the real ExtHostProposedApiShape (like $registerBuiltinProvider)
	// are omitted as they typically involve RPC communication for dynamic registration or
	// changes, which isn't the focus of this simple initData-based check shim.
	// Example:
	// public async $registerBuiltinProvider(extensionId: ExtensionIdentifier, proposalName: string, providerId: string): Promise<void> {

	//     this._logWarn(`$registerBuiltinProvider for ${extensionId.value}, proposal ${proposalName} - STUB`);

	// This would typically involve RPC to the main thread.
	//
	// }
}

// Class is already exported
// export { ShimExtensionsProposedApi };
