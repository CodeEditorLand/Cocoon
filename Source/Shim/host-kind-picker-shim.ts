/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Host Kind Picker Shim (host-kind-picker-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service interface from VS Code. This service
 * is pivotal in determining the most appropriate type of extension host environment
 * (e.g., `ExtensionHostKind.LocalProcess` for Node.js extensions, `ExtensionHostKind.Web`
 * for Web Worker based extensions, or a Remote Extension Host) for running a given
 * VS Code extension. The decision process considers the extension's manifest declarations
 * (specifically its `extensionKind` property), its installation location (local vs. remote), *
 * the current workspace context, and potentially user or workspace preferences.
 *
 * In the context of Cocoon, which primarily functions as a Node.js sidecar that simulates
 * a standard `ExtensionHostKind.LocalProcess` environment, this shim's main role is to:
 *  1. Validate if an extension, based on its manifest, is designed to run in a Node.js
 *     environment compatible with what Cocoon provides.
 *  2. Normalize the diverse `extensionKind` declarations that can be found in extension
 *     manifests (e.g., simple strings like "ui", "workspace", "web"; arrays of these)
 *     into a canonical array of `ExtensionHostKind` enum values for consistent evaluation.
 *
 * Responsibilities:
 * - Faithfully implementing the `pickExtensionHostKind(...)` and its convenience wrapper
 *   `pickExtensionHostKindForDescription(...)` methods as defined by the
 *   `IExtensionHostKindPicker` interface.
 * - Parsing and normalizing various forms of `extensionKind` manifest declarations into a
 *   standardized `ExtensionHostKind[]` array through the `_normalizeExtensionManifestKinds` method.
 * - Returning `ExtensionHostKind.LocalProcess` if an extension declares or implies
 *   compatibility with a local Node.js runtime environment. This typically includes
 *   extensions with an `extensionKind` of 'workspace' or Node-compatible 'ui'.
 * - Returning `null` if the extension is deemed unsuitable for execution within Cocoon, *
 *   for example, if it's an extension designed exclusively for a Web Worker environment
 *   (`ExtensionHostKind.Web`) or `LocalWebWorker` and Cocoon (as a Node.js host) cannot run it.
 *
 * Key Interactions:
 * - An instance of `ShimExtensionHostKindPicker` is registered with Dependency Injection (DI)
 *   in `Cocoon/index.ts`.
 * - This service is critically consumed by the real `ExtHostExtensionService` (which runs
 *   within the Cocoon environment) during its extension resolution and activation phase.
 * - It relies on the `ExtensionHostKind` enum and `IExtensionDescription` type definitions.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 *--------------------------------------------------------------------------------------------*/

import { Schemas } from "vs/base/common/network"; // For checking URI schemes
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtensionHostKind, // The enum defining different types of extension hosts
	type IExtensionHostKindPicker,
} from "vs/workbench/services/extensions/common/extensionHostKind";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

// Placeholder type for `preference` (unused in this shim's MVP logic)
type ExtensionRunningPreference = any;

/** Cocoon's implementation of `IExtensionHostKindPicker`. */
export class ShimExtensionHostKindPicker
	extends BaseCocoonShim
	implements IExtensionHostKindPicker
{
	public readonly _serviceBrand: undefined; // Required by VS Code's DI.

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtensionHostKindPicker", rpcService, logService);
		this._logInfo("Initialized.");
	}

	protected override _requiresRpc(): boolean {
		return false;
	} // Logic is local

	private _normalizeExtensionManifestKinds(
		extensionId: ExtensionIdentifier,
		manifestKinds: string | string[] | ExtensionHostKind[] | undefined,
	): ExtensionHostKind[] {
		if (
			!manifestKinds ||
			(Array.isArray(manifestKinds) && manifestKinds.length === 0)
		) {
			this._logWarnOnce(
				`No extension kinds declared for '${extensionId.value}' or list empty. Defaulting to assume LocalProcess compatibility for Cocoon evaluation. Relies on VS Code's manifest processing for more sophisticated defaults if applicable.`,
			);
			return [ExtensionHostKind.LocalProcess]; // Default assumption for Cocoon
		}

		const kindsInputArray = Array.isArray(manifestKinds)
			? manifestKinds
			: [manifestKinds];
		const normalizedKindsSet = new Set<ExtensionHostKind>();

		for (const kind of kindsInputArray) {
			if (typeof kind === "string") {
				switch (kind.toLowerCase()) {
					case "ui":
						// "ui" extensions in a Node host often run as LocalProcess.
						normalizedKindsSet.add(ExtensionHostKind.LocalProcess);
						break;
					case "workspace":
						normalizedKindsSet.add(ExtensionHostKind.LocalProcess);
						break;
					case "web":
						normalizedKindsSet.add(ExtensionHostKind.Web);
						break;
					// "localWebWorker" is not typically a string in package.json; it's an enum value.
					// If it were, it would be handled here or as an unknown string.
					default:
						this._logWarn(
							`Unknown string value '${kind}' in 'extensionKind' for '${extensionId.value}'. Ignoring.`,
						);
						break;
				}
			} else if (
				typeof kind === "number" &&
				Object.values(ExtensionHostKind).includes(
					kind as ExtensionHostKind,
				)
			) {
				normalizedKindsSet.add(kind as ExtensionHostKind); // Already a valid enum member
			} else {
				this._logWarn(
					`Invalid value '${String(kind)}' in 'extensionKind' for '${extensionId.value}'. Ignoring.`,
				);
			}
		}
		return [...normalizedKindsSet];
	}

	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,
		extensionManifestKinds: (string | ExtensionHostKind)[], // From IExtensionDescription.extensionKinds
		_isInstalledLocally: boolean, // Unused by this shim's MVP logic
		_isInstalledRemotely: boolean, // Unused by this shim's MVP logic
		_preference: ExtensionRunningPreference, // Unused by this shim's MVP logic
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
				`No valid host kinds resolved for '${extensionId.value}'. Cannot determine host.`,
			);
			return null;
		}

		// Priority 1: If it can run in LocalProcess, Cocoon (as a LocalProcess host) can run it.
		if (declaredHostKinds.includes(ExtensionHostKind.LocalProcess)) {
			this._logDebug(
				` -> Ext '${extensionId.value}' declares LocalProcess. Selecting LocalProcess for Cocoon.`,
			);
			return ExtensionHostKind.LocalProcess;
		}

		// Priority 2: If it's exclusively for Web or LocalWebWorker, Cocoon (Node.js host) cannot run it.
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

		// If it's some other combination not involving LocalProcess (e.g., only an unknown future kind),
		// or if no kinds were resolved (already handled), it's not suitable for this Cocoon.
		this._logWarn(
			` -> Ext '${extensionId.value}' declares kinds [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}] not directly suitable for Cocoon (LocalProcess host). No suitable host kind found. Returning null.`,
		);
		return null;
	}

	public pickExtensionHostKindForDescription(
		extensionDescription: IExtensionDescription,
		isInstalledLocally: boolean,
		isInstalledRemotely: boolean,
		preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		// `extensionDescription.extensionKinds` should be `ExtensionHostKind[]` after VS Code's manifest parsing.
		// If it can still contain strings, `_normalizeExtensionManifestKinds` (called by `pickExtensionHostKind`) handles it.
		const manifestBasedKinds = extensionDescription.extensionKinds || [];

		// If an extension is primarily located on a remote system.
		if (
			extensionDescription.extensionLocation.scheme ===
			Schemas.vscodeRemote
		) {
			// Check if it *also* explicitly declares LocalProcess compatibility.
			// Normalizing here helps determine if LocalProcess is among its *intended* runtimes.
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
					`Extension '${extensionDescription.identifier.value}' is remote (location: ${extensionDescription.extensionLocation.toString()}) and does not declare LocalProcess compatibility. Not suitable for Cocoon.`,
				);
				return null; // Not suitable if remote and not explicitly for LocalProcess
			}
			// If remote-located but also declares LocalProcess, let `pickExtensionHostKind` decide based on that.
			this._logService?.trace(
				// Use trace as this is a more nuanced internal decision point
				`Extension '${extensionDescription.identifier.value}' is remote-located but has LocalProcess-compatible kinds. Proceeding with kind picking.`,
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

	public override dispose(): void {
		super.dispose();
		// this._logDebug("Disposed."); // Can be verbose for a simple service
	}
}
