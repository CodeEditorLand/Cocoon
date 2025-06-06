/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Host Kind Picker Shim 
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service interface from VS Code. This service
 * is pivotal in determining the most appropriate type of extension host environment
 * (e.g., `ExtensionHostKind.LocalProcess` for Node.js extensions, `ExtensionHostKind.Web`
 * for Web Worker based extensions, or a Remote Extension Host) for running a given
 * VS Code extension. The decision process considers the extension's manifest declarations
 * (specifically its `extensionKind` property), its installation location (local vs. remote),
 * the current workspace context, and potentially user or workspace preferences.
 *
 * In the context of Cocoon, which primarily functions as a Node.js sidecar that simulates
 * a standard `ExtensionHostKind.LocalProcess` environment, this shim's main role is to:
 *  1. Validate if an extension, based on its manifest, is designed to run in a Node.js
 *     environment compatible with what Cocoon provides.
 *  2. Normalize the diverse `extensionKind` declarations that can be found in extension
 *     manifests (e.g., simple strings like "ui", "workspace", "web"; arrays of these;
 *     or, less commonly in raw manifests, direct `ExtensionHostKind` enum values) into a
 *     canonical array of `ExtensionHostKind` enum values for consistent evaluation.
 *
 * Responsibilities:
 * - Faithfully implementing the `pickExtensionHostKind(...)` and its convenience wrapper
 *   `pickExtensionHostKindForDescription(...)` methods as defined by the
 *   `IExtensionHostKindPicker` interface.
 * - Parsing and normalizing various forms of `extensionKind` manifest declarations into a
 *   standardized `ExtensionHostKind[]` array through the `_normalizeExtensionManifestKinds` method.
 * - Returning `ExtensionHostKind.LocalProcess` if an extension declares or implies
 *   compatibility with a local Node.js runtime environment. This typically includes
 *   extensions with an `extensionKind` of 'workspace'. "UI" extensions that are
 *   Node.js-compatible and intended to run in the main local extension host (which Cocoon
 *   simulates) are also mapped to `LocalProcess`.
 * - Returning `null` if the extension is deemed unsuitable for execution within Cocoon,
 *   for example, if it's an extension designed exclusively for a Web Worker environment
 *   (`ExtensionHostKind.Web`) and Cocoon is a Node.js host.
 *
 * Key Interactions:
 * - An instance of `ShimExtensionHostKindPicker` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts`.
 * - This service is critically consumed by the real `ExtHostExtensionService` (which runs
 *   within the Cocoon environment) during its extension resolution and activation phase.
 *   The `ExtHostExtensionService` uses this picker to decide if a particular extension
 *   can be loaded and run in the current Cocoon host instance.
 * - It relies on the `ExtensionHostKind` enum and `IExtensionDescription` type definitions,
 *   which are standard types from VS Code's platform/common modules.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 * Last Reviewed/Updated: 2025-05-26 (as per last provided snippet)
 *--------------------------------------------------------------------------------------------*/

// For checking URI schemes, e.g., Schemas.vscodeRemote, to determine if an extension's location is remote.
import { Schemas } from "vs/base/common/network";
// VS Code internal types for extension description structure and host kind enumeration.
import type {
	ExtensionIdentifier,
	IEnabledApiProposals, // This was in one of the versions for initData, keeping for completeness if needed elsewhere
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// For initData structure if parsing API proposals from it (though this shim doesn't directly use IEnabledApiProposals from initData)
import type { ExtHostInitData } from "vs/workbench/api/common/extHostInitDataService";
import {
	ExtensionHostKind, // The enum defining different types of extension hosts (e.g., LocalProcess, Web, Remote).
	type IExtensionHostKindPicker, // The service interface this shim implements.
} from "vs/workbench/services/extensions/common/extensionHostKind";

// Base class for Cocoon shims, providing logging utilities and a common structure.
import {
	BaseCocoonShim,
	type ILogServiceForShim, // For logging via BaseCocoonShim.
	type IRpcProtocolServiceAdapter, // For BaseCocoonShim constructor, though not directly used by this shim's logic.
} from "./_baseShim";

/**
 * Placeholder type for the `preference` parameter in the `pickExtensionHostKind` method.
 * In a full VS Code environment, this would likely be a more specific type, potentially an
 * enum (e.g., `ExtensionRunningPreference`), indicating user or workspace preferences for
 * where an extension should ideally run (e.g., "prefer local execution", "prefer remote execution").
 * For this shim, its value is currently not used in the core decision-making logic, as Cocoon has a fixed role.
 */
type ExtensionRunningPreference = any; // TODO: Replace with actual VS Code type if/when this parameter becomes relevant for Cocoon.

// ShimInitDataForProposedApi was used in the first version, but this shim doesn't use initData directly for proposed APIs.
// It uses initData for logging and basic setup if BaseCocoonShim required it or if this shim read something else from it.
// For this picker, no direct initData fields are consumed for its logic beyond what BaseCocoonShim might do.

/**
 * Cocoon's implementation of `IExtensionHostKindPicker`.
 * This service determines if a given VS Code extension is suitable to run in the Cocoon
 * environment, which primarily simulates a `LocalProcess` (Node.js-based) extension host.
 * The decision is made based on the extension's manifest declarations, particularly its `extensionKind`.
 */
export class ShimExtensionHostKindPicker
	extends BaseCocoonShim
	implements IExtensionHostKindPicker
{
	public readonly _serviceBrand: undefined; // Required by VS Code's service type system for DI.

	/**
	 * Creates an instance of ShimExtensionHostKindPicker.
	 * @param rpcService The RPC service adapter. Passed to `BaseCocoonShim`.
	 * @param logService The logging service instance.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtensionHostKindPicker", rpcService, logService);
		this._logInfo("Initialized."); // Changed from _log to _logInfo for consistency.
	}

	/**
	 * This shim's core decision logic is local, based on manifest data provided to its methods.
	 * It does not require RPC communication with Mountain for its primary functionality.
	 * @returns `false`.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/**
	 * Normalizes the `extensionKind` property from an extension's `package.json` manifest
	 * into a canonical array of `ExtensionHostKind` enum values.
	 * @param extensionId The `ExtensionIdentifier` of the extension, for contextual logging.
	 * @param manifestKinds The `extensionKind` value(s) as declared in the extension's manifest.
	 * @returns An array of `ExtensionHostKind` enum values.
	 */
	private _normalizeExtensionManifestKinds(
		extensionId: ExtensionIdentifier,
		manifestKinds: string | string[] | ExtensionHostKind[] | undefined,
	): ExtensionHostKind[] {
		if (
			!manifestKinds ||
			(Array.isArray(manifestKinds) && manifestKinds.length === 0)
		) {
			this._logWarnOnce(
				`No extension kinds were declared in the manifest for extension '${extensionId.value}', or the provided list was empty. Defaulting to assume potential LocalProcess compatibility for Cocoon's evaluation. This relies on VS Code's standard extension description processing to have applied more sophisticated defaults if applicable.`,
			);
			return [ExtensionHostKind.LocalProcess]; // Default assumption for Cocoon.
		}

		const kindsInputArray = Array.isArray(manifestKinds)
			? manifestKinds
			: [manifestKinds];
		const normalizedKindsSet = new Set<ExtensionHostKind>(); // Use a Set to automatically handle duplicates.

		for (const kind of kindsInputArray) {
			if (typeof kind === "string") {
				switch (kind.toLowerCase()) {
					case "ui":
						normalizedKindsSet.add(ExtensionHostKind.LocalProcess);
						break;
					case "workspace":
						normalizedKindsSet.add(ExtensionHostKind.LocalProcess);
						break;
					case "web":
						normalizedKindsSet.add(ExtensionHostKind.Web);
						break;
					default:
						this._logWarn(
							`Unknown string value '${kind}' encountered in 'extensionKind' manifest declaration for extension '${extensionId.value}'. This kind will be ignored by the picker.`,
						);
						break;
				}
			} else if (
				typeof kind === "number" &&
				Object.values(ExtensionHostKind).includes(
					kind as ExtensionHostKind,
				)
			) {
				normalizedKindsSet.add(kind as ExtensionHostKind);
			} else {
				this._logWarn(
					`Invalid or unrecognized value '${String(kind)}' (type: ${typeof kind}) found in 'extensionKind' manifest declaration for extension '${extensionId.value}'. This value will be ignored by the picker.`,
				);
			}
		}
		return [...normalizedKindsSet];
	}

	/** {@inheritDoc IExtensionHostKindPicker.pickExtensionHostKind} */
	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,
		extensionManifestKinds: (string | ExtensionHostKind)[],
		_isInstalledLocally: boolean, // Currently unused by this shim's decision logic.
		_isInstalledRemotely: boolean, // Currently unused by this shim's decision logic.
		_preference: ExtensionRunningPreference, // Currently unused by this shim's decision logic.
	): ExtensionHostKind | null {
		const declaredHostKinds = this._normalizeExtensionManifestKinds(
			extensionId,
			extensionManifestKinds,
		);

		this._logDebug(
			`pickExtensionHostKind for '${extensionId.value}': Normalized Kinds = [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}] (isLocal=${_isInstalledLocally}, isRemote=${_isInstalledRemotely})`,
		);

		if (declaredHostKinds.length === 0) {
			this._logError(
				`No valid host kinds could be resolved for extension '${extensionId.value}' after normalization of its manifest kinds. Cannot determine a suitable host environment.`,
			);
			return null;
		}

		if (declaredHostKinds.includes(ExtensionHostKind.LocalProcess)) {
			this._logDebug(
				` -> Ext '${extensionId.value}' declares LocalProcess. Selecting LocalProcess for Cocoon.`,
			);
			return ExtensionHostKind.LocalProcess;
		}

		const isExclusivelyWebBased = declaredHostKinds.every(
			(kind) =>
				kind === ExtensionHostKind.Web ||
				kind === ExtensionHostKind.LocalWebWorker,
		);
		if (isExclusivelyWebBased) {
			const kindsString = declaredHostKinds
				.map((k) => ExtensionHostKind[k])
				.join(" or ");
			this._logDebug(
				` -> Ext '${extensionId.value}' targets only ${kindsString}. Cocoon (LocalProcess host) is not suitable. Returning null.`,
			);
			return null;
		}

		this._logWarn(
			` -> Ext '${extensionId.value}' declares kinds [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}] not directly suitable for Cocoon (LocalProcess host). No suitable host kind found. Returning null.`,
		);
		return null;
	}

	/** {@inheritDoc IExtensionHostKindPicker.pickExtensionHostKindForDescription} */
	public pickExtensionHostKindForDescription(
		extensionDescription: IExtensionDescription,
		isInstalledLocally: boolean,
		isInstalledRemotely: boolean,
		preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		const manifestBasedKinds = extensionDescription.extensionKinds || [];

		if (
			extensionDescription.extensionLocation.scheme ===
			Schemas.vscodeRemote
		) {
			const normalizedLocalCandidateKinds =
				this._normalizeExtensionManifestKinds(
					extensionDescription.identifier,
					manifestBasedKinds,
				);
			if (
				!normalizedLocalCandidateKinds.includes(
					ExtensionHostKind.LocalProcess,
				)
			) {
				this._logDebug(
					`Extension '${extensionDescription.identifier.value}' is primarily remote (location: ${extensionDescription.extensionLocation.toString()}) and does not declare explicit LocalProcess compatibility. It is not suitable for execution in Cocoon.`,
				);
				return null;
			}
			this._logService?.trace(
				`Extension '${extensionDescription.identifier.value}' is remote-located but also declares LocalProcess-compatible kinds ([${normalizedLocalCandidateKinds.map((k) => ExtensionHostKind[k]).join(", ")}]). Proceeding with kind picking.`,
			);
		}

		return this.pickExtensionHostKind(
			extensionDescription.identifier,
			manifestBasedKinds,
			isInstalledLocally,
			isInstalledRemotely,
			preference,
		);
	}

	/**
	 * Disposes of resources held by this shim instance.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		// No specific resources like event emitters in this shim to dispose beyond base.
		// this._logDebug("Disposed."); // Can be verbose for a simple service.
	}
}
