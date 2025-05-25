// ORIGIN INFORMATION:
// This code block was extracted by a script.
// Source Markdown File: Backup/TSFMSC/Document/120_MODEL.md
// Source Block Index in MD (Overall): 1
// Original Fence Info String: (empty)
// Content SHA256 (of this block): 36f1f2f372ff08ae3b990b618ef4c8072069e547d21e7341a566afb0c1c2f517
// Extracted to File: Backup/TSFMSC/Code/host-kind-picker-shim.ts
// Extraction Timestamp: 2025-05-25T14:02:57.019Z
// --- END OF ORIGIN INFORMATION ---

--- START OF FILE host-kind-picker-shim.ts ---

/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Host Kind Picker Shim (host-kind-picker-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service interface. In VS Code, this service
 * determines the appropriate extension host (e.g., LocalProcess, WebWorker, Remote)
 * for running a given extension based on its manifest declarations, installation status,
 * and workspace context.
 *
 * For Cocoon, which primarily acts as a Node.js sidecar (simulating an `ExtensionHostKind.LocalProcess`
 * environment), this shim's main role is to:
 *  - Confirm if an extension, as described by its manifest, is suitable for running in Cocoon.
 *  - Normalize diverse `extensionKind` manifest declarations into `ExtensionHostKind` enum values.
 *
 * Responsibilities:
 * - Implementing `pickExtensionHostKind(...)` and `pickExtensionHostKindForDescription(...)`.
 * - Normalizing `extensionManifestKinds` (which might be strings from older manifests or
 *   direct `ExtensionHostKind` enum values) to `ExtensionHostKind[]`.
 * - Returning `ExtensionHostKind.LocalProcess` if the extension declares compatibility
 *   with a local Node.js environment (typically 'workspace' or sometimes 'ui' kinds).
 * - Returning `null` if the extension is not suitable for Cocoon (e.g., purely 'web').
 *
 * Key Interactions:
 * - Used by the real `ExtHostExtensionService` (running in Cocoon) during extension
 *   resolution to decide if an extension can run in the current (Cocoon) host.
 * - Relies on `ExtensionHostKind` enum and `IExtensionDescription` types from VS Code.
 * - Registered with Dependency Injection in `Cocoon/index.ts`.
 * - Uses `BaseCocoonShim` for logging.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

// For checking URI schemes (e.g., vscode-remote)
import { Schemas } from "vs/base/common/network";
// VS Code internal types
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtensionHostKind,
	type IExtensionHostKindPicker,
	// WorkspaceFolderSchemes, // Might be relevant if decisions depend on workspace type
} from "vs/workbench/services/extensions/common/extensionHostKind";

// Base for logging
import {
	BaseCocoonShim,
	type IRpcProtocolServiceAdapter, // Renamed from IExtHostRpcService
	type ILogServiceForShim,       // Renamed from ILogService
} from "./_baseShim";

/**
 * Placeholder type for the `preference` parameter in `pickExtensionHostKind`.
 * In a full VS Code environment, this might be an enum like `ExtensionRunningPreference`
 * or a more specific type indicating user or workspace preferences for where an extension runs.
 */
type ExtensionRunningPreference = any; // TODO: Use actual VS Code type if available and relevant.

/**
 * Cocoon's implementation of `IExtensionHostKindPicker`.
 * It determines if an extension should run in the Cocoon (LocalProcess) environment.
 */
export class ShimExtensionHostKindPicker
	extends BaseCocoonShim
	implements IExtensionHostKindPicker
{
	public readonly _serviceBrand: undefined; // Required by VS Code's service types

	/**
	 * Creates an instance of ShimExtensionHostKindPicker.
	 * @param rpcService The RPC service adapter. Not directly used by this shim's core logic.
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtensionHostKindPicker", rpcService, logService);
		this._log(`Initialized.`);
	}

    /**
     * This shim does not require RPC for its core decision logic.
     */
    protected override _requiresRpc(): boolean {
        return false;
    }

	/**
	 * Normalizes the `extensionKind` property from an extension's manifest into an array
	 * of `ExtensionHostKind` enum values. Manifests can specify a string (e.g., "ui",
	 * "workspace", "web") or an array of these.
	 *
	 * @param extensionId The identifier of the extension, for logging purposes.
	 * @param manifestKinds The `extensionKind` value(s) from the manifest.
	 * @returns An array of `ExtensionHostKind` enum values.
	 */
	private _normalizeExtensionManifestKinds(
		extensionId: ExtensionIdentifier,
		manifestKinds: string | string[] | ExtensionHostKind[] | undefined,
	): ExtensionHostKind[] {
		if (!manifestKinds) {
			// VS Code Default Behavior: If an extension has a `main` (Node.js) entry point,
			// it often defaults to `workspace` kind. If it only has `browser`, it defaults to `web`.
			// This defaulting logic is usually handled by `ExtensionDescription.constructor` or similar.
			// If this picker receives empty/undefined `manifestKinds`, it implies either the manifest
			// didn't specify, or a higher-level resolver should have already defaulted it.
			this._logWarn(
				`No extension kinds declared in manifest for ${extensionId.value}. Assuming potential LocalProcess compatibility for shim evaluation. This relies on higher-level defaulting.`,
			);
			// Default assumption for Cocoon: if no kind is specified, it might be an older Node extension.
			return [ExtensionHostKind.LocalProcess];
		}

		const kindsArray = Array.isArray(manifestKinds)
			? manifestKinds
			: [manifestKinds];

		const normalizedKinds: ExtensionHostKind[] = [];
		for (const kind of kindsArray) {
			if (typeof kind === "string") {
				switch (kind.toLowerCase()) {
					case "ui":
						// Mapping 'ui': In a traditional setup, UI extensions often run in the same host as
						// workspace extensions (LocalProcess) or a dedicated UI host.
						// For Cocoon (as a Node.js sidecar acting as LocalProcess), 'ui' extensions
						// that are Node-compatible might target it.
						// TODO: Confirm the precise desired mapping for "ui" in Cocoon's architecture.
						// If Cocoon is *not* intended for UI-specific extensions that require renderer access,
						// this mapping might need adjustment or filtering based on other extension properties.
						normalizedKinds.push(ExtensionHostKind.LocalProcess);
						break;
					case "workspace":
						normalizedKinds.push(ExtensionHostKind.LocalProcess);
						break;
					case "web":
						normalizedKinds.push(ExtensionHostKind.Web);
						break;
					default:
						this._logWarn(
							`Unknown string value '${kind}' in extensionKind for ${extensionId.value}. Ignoring.`,
						);
						break;
				}
			} else if (
				typeof kind === "number" && // Check if it's already an ExtensionHostKind enum value
				Object.values(ExtensionHostKind).includes(kind as ExtensionHostKind)
			) {
				normalizedKinds.push(kind as ExtensionHostKind);
			} else {
				this._logWarn(
					`Invalid value '${String(kind)}' in extensionKind for ${extensionId.value}. Ignoring.`,
				);
			}
		}
		// Deduplicate and return
		return [...new Set(normalizedKinds)];
	}

	/**
	 * Picks the host kind for an extension based on its declared kinds and the Cocoon environment.
	 * This implementation prioritizes `ExtensionHostKind.LocalProcess`.
	 *
	 * @param extensionId The identifier of the extension.
	 * @param extensionManifestKinds The kinds declared in the extension's manifest. This can be
	 *        `ExtensionHostKind[]` or (for older manifests) `string[]`.
	 * @param _isInstalledLocally Whether the extension is installed locally (currently unused by this shim).
	 * @param _isInstalledRemotely Whether the extension is installed remotely (currently unused by this shim).
	 * @param _preference User or workspace preference for running the extension (currently unused by this shim).
	 * @returns The chosen `ExtensionHostKind` (typically `LocalProcess` for Cocoon) or `null` if
	 *          the extension is not suitable for this host.
	 */
	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,
		extensionManifestKinds: (string | ExtensionHostKind)[], // From IExtensionDescription.extensionKinds or older string[]
		_isInstalledLocally: boolean,
		_isInstalledRemotely: boolean,
		_preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		const declaredHostKinds = this._normalizeExtensionManifestKinds(
			extensionId,
			extensionManifestKinds,
		);

		// Can be verbose, enable if debugging kind resolution:
		// this._log(`pickExtensionHostKind for ${extensionId.value}: Declared/Normalized Kinds = [${declaredHostKinds.map(k => ExtensionHostKind[k]).join(', ')}]`);

		if (declaredHostKinds.length === 0) {
			this._log(
				`No valid host kinds resolved for ${extensionId.value} after normalization. Cannot determine host.`,
			);
			return null;
		}

		// Cocoon's Role: To run Node.js based extensions, primarily those suitable for `ExtensionHostKind.LocalProcess`.
		// The decision to send an extension to Cocoon is usually made by the "Mountain" host based on factors
		// like `IExtensionDescription.extensionLocation` (not 'vscode-remote') and the presence of a `main`
		// (Node.js) entry point in the manifest. This picker in Cocoon then *confirms* if the declared kinds
		// are compatible with a LocalProcess environment.

		// If the extension can run in a LocalProcess environment (typical for 'workspace' extensions,
		// or 'ui' extensions if Cocoon is the main non-web Node host).
		if (declaredHostKinds.includes(ExtensionHostKind.LocalProcess)) {
			this._log(
				` -> Extension ${extensionId.value} declares or implies LocalProcess compatibility. Selecting LocalProcess for Cocoon.`,
			);
			return ExtensionHostKind.LocalProcess;
		}

		// If an extension is purely for the web, and Cocoon is a Node.js host.
		if (
			declaredHostKinds.length === 1 &&
			declaredHostKinds[0] === ExtensionHostKind.Web
		) {
			this._log(
				` -> Extension ${extensionId.value} is Web-only. Cocoon (LocalProcess) is not suitable. Returning null.`,
			);
			return null;
		}

		// TODO: Handle LocalWebWorker (ExtensionHostKind.LocalWebWorker) if Cocoon were ever to support that (unlikely for MVP).
		// if (declaredHostKinds.includes(ExtensionHostKind.LocalWebWorker)) { ... }

		this._logError(
			` -> Extension ${extensionId.value} declares kinds [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}] which are not suitable for Cocoon (primarily LocalProcess). Returning null.`,
		);
		return null;
	}

	/**
	 * A convenience method that takes a full `IExtensionDescription` and calls `pickExtensionHostKind`.
	 * It considers the `extensionLocation` scheme to potentially influence kind decisions,
	 * though the primary logic relies on `extensionKinds`.
	 *
	 * @param extensionDescription The full description of the extension.
	 * @param isInstalledLocally Whether the extension is installed locally.
	 * @param isInstalledRemotely Whether the extension is installed remotely.
	 * @param preference User or workspace preference for running the extension.
	 * @returns The chosen `ExtensionHostKind` or `null`.
	 */
	public pickExtensionHostKindForDescription(
		extensionDescription: IExtensionDescription,
		isInstalledLocally: boolean,
		isInstalledRemotely: boolean,
		preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		// `extensionDescription.extensionKinds` should ideally be `ExtensionHostKind[]` if processed
		// by VS Code's manifest parsing. If it can still be strings, normalization handles it.
		const manifestBasedKinds = extensionDescription.extensionKinds || [];

		// If an extension is explicitly located on a remote, it's primarily a candidate for a Remote extension host.
		// However, it might also declare `ui` or `workspace` kinds if it has parts that can run in those contexts.
		if (extensionDescription.extensionLocation.scheme === Schemas.vscodeRemote) {
			// If it's from a remote location, it's generally not for Cocoon (a local sidecar)
			// UNLESS it *also* explicitly declares a LocalProcess compatible kind (e.g., 'ui' or 'workspace')
			// AND Cocoon is configured to handle such parts of remote extensions.
			// For a simpler Cocoon setup, remote-located extensions are typically not run in Cocoon.
			const normalizedLocalCandidateKinds = this._normalizeExtensionManifestKinds(extensionDescription.identifier, manifestBasedKinds);
			if (!normalizedLocalCandidateKinds.includes(ExtensionHostKind.LocalProcess)) {
				this._log(
					`Extension ${extensionDescription.identifier.value} is primarily remote (location: ${extensionDescription.extensionLocation.toString()}) and does not declare LocalProcess compatibility. Not for Cocoon.`,
				);
				return null;
			}
			// If it's remote BUT also declares LocalProcess, proceed to standard picking.
		}

		return this.pickExtensionHostKind(
			extensionDescription.identifier,
			manifestBasedKinds, // Pass the kinds from the description
			isInstalledLocally,
			isInstalledRemotely,
			preference,
		);
	}
}
--- END OF FILE host-kind-picker-shim.ts ---