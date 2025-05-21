// Assuming bundled
import {
	ExtensionIdentifier,
	IExtensionDescription,
} from "vs/platform/extensions/common/extensions";
// For Extension type
import {
	ExtensionHostKind,
	// Assuming this interface exists in VS Code's services
	IExtensionHostKindPicker,
} from "vs/workbench/services/extensions/common/extensionHostKind";

// For logging
import { ILogService } from "./_baseShim";

// Type for the preference parameter, based on typical VS Code usage
// It's often an enum or a specific string set. For the shim, `any` is used if unknown.
type ExtensionHostKindPreference = any;

export class ShimExtensionHostKindPicker implements IExtensionHostKindPicker {
	public readonly _serviceBrand: undefined;

	private readonly _log: (message: string, ...args: any[]) => void;

	constructor(logService: ILogService) {
		// Bind the log function to preserve `this` context if logService methods expect it,

		// or just assign if they are plain functions.
		// Using a specific method like `trace` ensures correct log level.
		this._log = logService.trace.bind(
			logService,

			"[Cocoon Shim KindPicker]",
		);

		this._log(`Initialized.`);
	}

	public pickExtensionHostKind(
		extensionId: ExtensionIdentifier,

		// This should be ExtensionHostKind[]
		extensionKinds: ExtensionHostKind[],

		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		preference: ExtensionHostKindPreference,
	): ExtensionHostKind | null {
		this._log(
			`pickExtensionHostKind for ${extensionId.value} with kinds [${extensionKinds.join(", ")}]`,
		);

		// Cocoon *is* the local process host replacement. It shouldn't host remote/web worker extensions itself.
		// The decision was already made by Mountain which extensions to send here.
		// This shim just needs to confirm if the extension *can* run here.

		// The original JS shim checked for 'ui' or 'workspace' strings.
		// With ExtensionHostKind enum, we check for the enum values.
		if (
			// Typically for 'workspace' extensions
			extensionKinds.includes(ExtensionHostKind.LocalProcess) ||
			// If Cocoon were to support local web workers
			extensionKinds.includes(ExtensionHostKind.LocalWebWorker) ||
			// If Cocoon is acting as a pseudo-remote host for UI extensions
			extensionKinds.includes(ExtensionHostKind.Remote)
		) {
			// The logic here needs to be precise based on Cocoon's role.
			// If Cocoon *only* runs 'workspace' type extensions that are designated for LocalProcess:
			if (extensionKinds.includes(ExtensionHostKind.LocalProcess)) {
				this._log(
					` -> Returning LocalProcess for ${extensionId.value}`,
				);

				return ExtensionHostKind.LocalProcess;
			}

			// If Cocoon can run UI extensions locally (rare, but if it's a full host replacement):
			// This part of the logic depends on how `extensionKinds` are populated and what Cocoon is meant to host.
			// The original JS 'ui' might map to LocalProcess if the UI extension runs in the same host as workspace extensions.
			// Or it might map to something else if UI extensions are truly separate.
			// Given Cocoon's context as a sidecar, LocalProcess for workspace is most likely.
		}

		// If the extension kind is purely 'web' and Cocoon is not a web host:
		if (
			extensionKinds.includes(ExtensionHostKind.Web) &&
			!extensionKinds.includes(ExtensionHostKind.LocalProcess)
		) {
			this._log(
				` -> Extension ${extensionId.value} is Web-only, cannot run in LocalProcess Cocoon. Returning null.`,
			);

			return null;
		}

		// Default fallback or if logic is more complex:
		// This indicates the extension's declared kinds are not suitable for this Cocoon instance.
		this._log(
			` -> Could not determine a suitable host kind for ${extensionId.value} from [${extensionKinds.join(", ")}]. Returning null (cannot run).`,
		);

		return null;
	}

	// The IExtensionHostKindPicker interface might have more methods, e.g., for specific extension descriptions
	public pickExtensionHostKind2?(
		// Optional method from a more complete interface
		extensionDescription: IExtensionDescription,

		isInstalledLocally: boolean,

		isInstalledRemotely: boolean,

		preference: ExtensionHostKindPreference,
	): ExtensionHostKind | null {
		return this.pickExtensionHostKind(
			extensionDescription.identifier,

			extensionDescription.extensionLocation.scheme === "vscode-remote"
				? [ExtensionHostKind.Remote]
				: extensionDescription.extensionKinds || [
						ExtensionHostKind.LocalProcess,

						// Simplified logic
					],

			isInstalledLocally,

			isInstalledRemotely,

			preference,
		);
	}
}

// Original JS export
// module.exports = { ShimExtensionHostKindPicker };

// `export class ...` handles this in TS.
