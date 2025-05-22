/*---------------------------------------------------------------------------------------------
 * Cocoon Extension Host Kind Picker Shim (host-kind-picker-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service. Its role is to determine
 * which extension host an extension should run in. For Cocoon, which acts as a
 * Node.js sidecar (primarily for `ExtensionHostKind.LocalProcess`), this shim
 * confirms if an extension, designated by Mountain, is compatible with this host type.
 *
 * Responsibilities:
 * - Implementing `pickExtensionHostKind(...)`.
 * - Normalizing `extensionManifestKinds` (which might be strings from older manifests or
 *   direct `ExtensionHostKind` enum values) to `ExtensionHostKind[]`.
 * - Returning `ExtensionHostKind.LocalProcess` if the extension is compatible with
 *   Cocoon's capabilities, otherwise `null`.
 *
 * Key Interactions:
 * - Used by the real `ExtHostExtensionService` (running in Cocoon) during extension
 *   resolution to decide if an extension can run in the current (Cocoon) host.
 * - Relies on `ExtensionHostKind` enum and `IExtensionDescription` types.
 * - Registered with DI in `index.ts`.
 *--------------------------------------------------------------------------------------------*/

// For checking URI schemes (e.g., vscode-remote)
import { Schemas } from "vs/base/common/network";
// VS Code internal type
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtensionHostKind,
	IExtensionHostKindPicker,
	// Might be relevant if decisions depend on workspace type
	// WorkspaceFolderSchemes,
} from "vs/workbench/services/extensions/common/extensionHostKind";

// Base for logging
import { BaseCocoonShim, IExtHostRpcService, ILogService } from "./_baseShim";

// Type for the preference parameter in pickExtensionHostKind.
// In VS Code, this might be an enum (ExtensionRunningPreference) or a more specific type.
// TODO: If the actual `ExtensionRunningPreference` type from VS Code is available, use it.
// Placeholder
type ExtensionRunningPreference = any;

export class ShimExtensionHostKindPicker
	extends BaseCocoonShim
	implements IExtensionHostKindPicker
{
	// For IExtensionHostKindPicker DI
	public readonly _serviceBrand: undefined;

	constructor(
		// Not directly used by this shim's logic
		rpcService: IExtHostRpcService | undefined,

		logService: ILogService | undefined,
	) {
		super("ExtensionHostKindPicker", rpcService, logService);

		this._log(`Initialized.`);
	}

	/**
	 * Normalizes the `extensionKind` property from an extension's manifest.
	 * Manifests can specify a string (e.g., "ui", "workspace", "web") or an array of these.
	 * This maps them to `ExtensionHostKind` enum values.
	 */
	private _normalizeExtensionManifestKinds(
		extensionId: ExtensionIdentifier,

		manifestKinds: string | string[] | ExtensionHostKind[] | undefined,
	): ExtensionHostKind[] {
		if (!manifestKinds) {
			// VS Code Default: If an extension has a `main` (Node.js) entry point, it defaults to `workspace` kind.
			// If it only has `browser`, it defaults to `web`. This logic is usually in ExtensionDescription. বটে().
			// For this picker, if `manifestKinds` is empty/undefined, it implies the manifest didn't specify,

			// and a higher-level resolver should have defaulted it.
			// If we must pick here with no info, it's tricky.
			// Let's assume for now that if it reaches here, it implies a default that might be LocalProcess compatible.
			this._logWarn(
				`No extension kinds declared in manifest for ${extensionId.value}. Assuming potential LocalProcess compatibility for shim evaluation.`,
			);

			// A default assumption, might need refinement.
			return [ExtensionHostKind.LocalProcess];
		}

		const kindsArray = Array.isArray(manifestKinds)
			? manifestKinds
			: [manifestKinds];

		const normalized: ExtensionHostKind[] = [];

		for (const kind of kindsArray) {
			if (typeof kind === "string") {
				switch (kind.toLowerCase()) {
					case "ui":
						// Mapping 'ui': In a traditional setup, UI extensions run in the same host as workspace extensions (LocalProcess)
						// or a dedicated UI host if one exists. For Cocoon as a Node.js sidecar, if it's the *only* non-web host,

						// 'ui' extensions might target it.
						// TODO: Confirm the desired mapping for "ui" in Cocoon's context. If Cocoon is *not* for UI extensions,

						// this should map to something incompatible or be filtered out.
						// For now, assuming 'ui' could potentially run in LocalProcess if it's the primary non-web host.
						normalized.push(ExtensionHostKind.LocalProcess);

						// Or, more strictly: if (isRemote) normalized.push(ExtensionHostKind.Remote); else normalized.push(ExtensionHostKind.LocalProcess);

						break;

					case "workspace":
						normalized.push(ExtensionHostKind.LocalProcess);

						break;

					case "web":
						normalized.push(ExtensionHostKind.Web);

						break;

					default:
						this._logWarn(
							`Unknown string value '${kind}' in extensionKind for ${extensionId.value}.`,
						);

						break;
				}
			} else if (
				typeof kind === "number" &&
				Object.values(ExtensionHostKind).includes(kind)
			) {
				// It's already an enum value
				normalized.push(kind as ExtensionHostKind);
			} else {
				this._logWarn(
					`Invalid value '${String(kind)}' in extensionKind for ${extensionId.value}.`,
				);
			}
		}

		// Deduplicate
		return [...new Set(normalized)];
	}

	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,

		// `extensionManifestKinds` from `IExtensionDescription.extensionKinds` which should be `ExtensionHostKind[]`
		// or from `IExtensionDescription.extensionLocation.scheme === 'vscode-remote'` which implies `ExtensionHostKind.Remote`.
		// The parameter in `IExtensionHostKindPicker` is often just `extensionKinds: ExtensionHostKind[]`.
		// The original JS shim took `extensionKinds` which could be strings. Let's assume it might still get that for older manifests.
		extensionManifestKinds: /* from IExtensionDescription.extensionKinds */ (
			| string
			| ExtensionHostKind
		)[],

		// TODO: Use these for more nuanced decisions if needed
		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		// TODO: Use this if preferences influence Cocoon's decision
		preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		// this._log(`pickExtensionHostKind for ${extensionId.value} with manifest kinds [${extensionManifestKinds.join(', ')}]`);

		const declaredHostKinds = this._normalizeExtensionManifestKinds(
			extensionId,

			extensionManifestKinds,
		);

		if (declaredHostKinds.length === 0) {
			this._log(
				`No valid host kinds resolved for ${extensionId.value}. Cannot determine host.`,
			);

			return null;
		}

		// Cocoon's Role: To run Node.js based extensions, primarily those designated for `ExtensionHostKind.LocalProcess`.
		// The decision to send an extension to Cocoon is primarily made by Mountain based on `IExtensionDescription.extensionLocation` (not 'vscode-remote'),

		// and the manifest's `main` field (Node.js entry point).
		// This picker in Cocoon then *confirms* if the declared kinds are compatible.

		// If the extension can run in a LocalProcess environment (typical for 'workspace' extensions or 'ui' extensions
		// if Cocoon is the main non-web host).
		if (declaredHostKinds.includes(ExtensionHostKind.LocalProcess)) {
			this._log(
				` -> Extension ${extensionId.value} declares or implies LocalProcess. Selecting LocalProcess for Cocoon.`,
			);

			return ExtensionHostKind.LocalProcess;
		}

		// If an extension is purely for the web and Cocoon is a Node.js host.
		if (
			declaredHostKinds.length === 1 &&
			declaredHostKinds[0] === ExtensionHostKind.Web
		) {
			this._log(
				` -> Extension ${extensionId.value} is Web-only. Cocoon (LocalProcess) is not suitable. Returning null.`,
			);

			return null;
		}

		// TODO: Handle LocalWebWorker if Cocoon were to support that (unlikely for MVP).
		// if (declaredHostKinds.includes(ExtensionHostKind.LocalWebWorker)) { ... }

		this._logError(
			` -> Extension ${extensionId.value} declares kinds [${declaredHostKinds.map((k) => ExtensionHostKind[k]).join(", ")}] which are not suitable for Cocoon (primarily LocalProcess). Returning null.`,
		);

		return null;
	}

	// This method signature is more aligned with what `IExtensionHostKindPicker` in VS Code might look like,

	// taking the full description.
	public pickExtensionHostKindForDescription(
		extensionDescription: IExtensionDescription,

		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		preference: ExtensionRunningPreference,
	): ExtensionHostKind | null {
		let manifestBasedKinds = extensionDescription.extensionKinds || [];

		// If the extension is located on a remote, it's primarily a Remote extension host kind.
		// However, it might also declare `ui` or `workspace` if it has parts that can run there.
		if (
			extensionDescription.extensionLocation.scheme ===
			Schemas.vscodeRemote
		) {
			// If it's from a remote location, it could potentially run UI parts locally if also declared as 'ui'.
			// This logic gets complex depending on how "UI extensions" are handled (local vs. remote UI host).
			// For Cocoon, if it's remote, it's not for Cocoon unless it *also* has a LocalProcess compatible kind.
			// If `manifestBasedKinds` includes LocalProcess, the logic below will handle it.
			// If it's *only* remote, then it's not for Cocoon.
			if (
				!manifestBasedKinds.includes(ExtensionHostKind.LocalProcess) &&
				!manifestBasedKinds.includes("workspace") &&
				!manifestBasedKinds.includes("ui")
			) {
				this._log(
					`Extension ${extensionDescription.identifier.value} is remote-only based on location and no local kinds. Not for Cocoon.`,
				);

				return null;
			}
		}

		return this.pickExtensionHostKind(
			extensionDescription.identifier,

			// Pass the kinds from the description
			manifestBasedKinds,

			isInstalledLocally,

			isInstalledRemotely,

			preference,
		);
	}
}
