/*---------------------------------------------------------------------------------------------
 // Header: Added basic header 
* Cocoon Extension Host Kind Picker Shim (host-kind-picker-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Implements the `IExtensionHostKindPicker` service. Its role is to determine
 * which extension host (e.g., LocalProcess, WebWorker, Remote) an extension should run in.
 * In Cocoon's context, this shim typically confirms if an extension designated by Mountain
 * can indeed run in the current Cocoon (LocalProcess) environment.
 *
 * Responsibilities:
 * - Implementing `pickExtensionHostKind(extensionId, extensionKinds, ...)`
 * - Deciding if the given `extensionKinds` are compatible with Cocoon's hosting capabilities.
 *
 * Key Interactions:
 * - Used by `ExtHostExtensionService` (or similar) during extension scanning/resolution.
 * - Relies on `ExtensionHostKind` enum and `IExtensionDescription` types.
 * - Registered with DI in `index.ts`.
 *--------------------------------------------------------------------------------------------*/

// Assuming bundled
import type {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
import {
	ExtensionHostKind,
	type IExtensionHostKindPicker,
	// Not a type itself, but used as parameter type
	// ExtensionHostKind[],
} from "vs/workbench/services/extensions/common/extensionHostKind";

// For logging
import type { ILogService } from "./_baseShim";

// --- Type Definitions ---

// Type for the preference parameter in pickExtensionHostKind.
// In VS Code, this might be an enum or a more specific type.
// For the shim, `any` is used if the exact type is unknown or not critical for shim logic.
// TODO: If the actual `ExtensionHostKindPreference` type is known, use it.
type ExtensionHostKindPreference = any;

export class ShimExtensionHostKindPicker implements IExtensionHostKindPicker {
	public readonly _serviceBrand: undefined;

	private readonly _log: (message: string, ...args: any[]) => void;

	constructor(logService: ILogService) {
		// Bind `this` for the logger function, ensuring correct context and prepending service name.
		this._log = logService.trace.bind(logService, "[Cocoon KindPicker]");

		this._log(`Initialized.`);
	}

	/**
	 * Determines the most appropriate extension host kind for a given extension.
	 *
	 * @param extensionId The identifier of the extension.
	 * @param extensionKinds The kinds of hosts the extension declares it can run in (e.g., 'workspace', 'ui', 'web').
	 *                       In modern VS Code, this is `ExtensionHostKind[]`.
	 * @param isInstalledLocally Whether the extension is installed locally.
	 * @param isInstalledRemotely Whether the extension is installed remotely.
	 * @param preference A preference for a specific host kind.
	 * @returns The chosen `ExtensionHostKind` or `null` if no suitable host can be determined.
	 */
	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,

		// Manifest might have strings; map to enum
		extensionManifestKinds: (string | ExtensionHostKind)[],

		// TODO: These booleans might be used for more complex logic
		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		preference: ExtensionHostKindPreference,
	): ExtensionHostKind | null {
		this._log(
			`pickExtensionHostKind for ${extensionId.value} with manifest kinds [${extensionManifestKinds.join(", ")}], local: ${isInstalledLocally}, remote: ${isInstalledRemotely}, pref: ${JSON.stringify(preference)}`,
		);

		// Normalize extensionKinds from manifest (potentially strings) to ExtensionHostKind enum values
		const declaredHostKinds: ExtensionHostKind[] = extensionManifestKinds
			.map((kind) => {
				if (typeof kind === "string") {
					switch (kind.toLowerCase()) {
						case "ui":
							// How 'ui' maps depends on VS Code version and setup.
							// It might mean LocalProcess if UI extensions run in the main ext host,

							// or it could imply a different host type if UI extensions are truly separate.
							// For Cocoon as a Node sidecar, 'ui' extensions are usually not its target unless
							// it's a very specific setup where Cocoon *is* the UI extension host.
							// Let's assume 'ui' primarily targets a host that can interact with UI.
							// If Cocoon is *the only* extension host, then 'ui' might map to LocalProcess.
							// This mapping is CRITICAL.
							// TODO: Clarify how 'ui' manifest kind maps to ExtensionHostKind for Cocoon.
							// For now, let's assume 'ui' might map to LocalProcess if no other host is available.
							// Tentative: assume UI can run if no dedicated UI host.
							return ExtensionHostKind.LocalProcess;

						case "workspace":
							return ExtensionHostKind.LocalProcess;

						case "web":
							return ExtensionHostKind.Web;

						default:
							this._logWarn(
								`Unknown string kind '${kind}' for ${extensionId.value}. Treating as incompatible.`,
							);

							// Or a specific "unknown" enum member if it exists
							return null;
					}
				}

				// Already ExtensionHostKind enum
				return kind;
			})
			.filter((k) => k !== null) as ExtensionHostKind[];

		if (
			declaredHostKinds.length === 0 &&
			extensionManifestKinds.length > 0
		) {
			this._log(
				`No valid ExtensionHostKind resolved for ${extensionId.value} from manifest: [${extensionManifestKinds.join(", ")}]. Returning null.`,
			);

			return null;
		}

		// If no kinds declared, VS Code often defaults to LocalProcess for workspace, but this picker expects explicit kinds.
		if (declaredHostKinds.length === 0) {
			this._log(
				`No extension kinds declared for ${extensionId.value}. Assuming incompatible or default needed. Returning null.`,
			);

			return null;
		}

		// Cocoon's primary role is as a LocalProcess extension host (for 'workspace' extensions).
		// The decision to send an extension to this Cocoon instance is largely made by Mountain.
		// This picker's role here is more to confirm compatibility based on the declared kinds.

		if (declaredHostKinds.includes(ExtensionHostKind.LocalProcess)) {
			// If the extension explicitly states it can run in a LocalProcess (typical for 'workspace' extensions),

			// then Cocoon is a suitable host.
			this._log(
				` -> Extension ${extensionId.value} declares LocalProcess. Returning LocalProcess.`,
			);

			return ExtensionHostKind.LocalProcess;
		}

		// Scenario: Extension is 'web' only. Cocoon is not a web worker host.
		if (declaredHostKinds.every((k) => k === ExtensionHostKind.Web)) {
			this._log(
				` -> Extension ${extensionId.value} is Web-only. Cocoon (LocalProcess) is not suitable. Returning null.`,
			);

			return null;
		}

		// TODO: More sophisticated logic might be needed based on `preference`, `isInstalledLocally`, `isInstalledRemotely`,

		// and how VS Code's own picker resolves these, especially in mixed or remote environments.
		// For Cocoon's typical role as a sidecar for Node-based extensions, prioritizing LocalProcess is key.

		this._log(
			` -> Extension ${extensionId.value} does not explicitly declare LocalProcess compatibility or other suitable kinds for Cocoon from [${declaredHostKinds.join(", ")}]. Returning null.`,
		);

		return null;
	}

	// The IExtensionHostKindPicker interface in VS Code might have more methods,

	// e.g., one that takes a full IExtensionDescription.
	public pickExtensionHostKindFor(
		extensionDescription: IExtensionDescription,

		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		preference: ExtensionHostKindPreference,
	): ExtensionHostKind | null {
		// This would use extensionDescription.extensionKinds, which should already be ExtensionHostKind[]
		const kindsToConsider = extensionDescription.extensionKinds || [];

		// Also, extensionDescription.extensionLocation.scheme === 'vscode-remote' might indicate it's a remote extension.
		// For this shim, we can delegate to the primary method.
		// The `extensionKinds` from `IExtensionDescription` should ideally be `ExtensionHostKind[]` already.
		return this.pickExtensionHostKind(
			extensionDescription.identifier,

			// Pass the already processed kinds
			kindsToConsider,

			isInstalledLocally,

			isInstalledRemotely,

			preference,
		);
	}
}
