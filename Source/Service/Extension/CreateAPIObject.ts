/**
 * @module CreateAPIObject (Extension)
 * @description A factory function that creates the public-facing `vscode.Extension` object.
 * This acts as an adapter between the internal extension host service and the public API.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionKind, type Extension } from "vscode";

import type ExtensionHostService from "../../Core/ExtensionHost/Service.js";

/**
 * Creates the public `vscode.Extension` API object from an internal `IExtensionDescription`.
 *
 * @param Description The internal description of the extension.
 * @param ExtensionHost The core service that manages extension state and activation.
 * @returns A frozen `vscode.Extension<T>` object.
 */
const CreateAPIObject = <T>(
	Description: IExtensionDescription,
	ExtensionHost: ExtensionHostService["Type"],
): Extension<T> => {
	const ActivateEffect = Effect.gen(function* () {
		// Step 1: Call the activation method on the host service.
		yield* ExtensionHost.ActivateById(Description.identifier, {
			startup: false,
			extensionId: Description.identifier,
			activationEvent: "api",
		} as any);

		// Step 2: Retrieve the exports after activation.
		const Exports = yield* ExtensionHost.GetExtensionExports(
			Description.identifier,
		);
		return Exports as T;
	});

	/**
	 * Determines the vscode.ExtensionKind based on the manifest's `extensionKind` property.
	 */
	const GetExtensionKind = (): ExtensionKind => {
		const Kinds = Array.isArray(Description.extensionKind)
			? Description.extensionKind
			: [Description.extensionKind];

		if (Kinds.includes("workspace")) {
			return ExtensionKind.Workspace;
		}
		// Default to UI kind if not 'workspace'. The 'web' kind is not applicable here.
		return ExtensionKind.UI;
	};

	const ExtensionAPIObject: Extension<T> = {
		id: Description.identifier.value,
		extensionUri: Description.extensionLocation,
		extensionPath: Description.extensionLocation.fsPath,
		get isActive() {
			// This now synchronously calls the corrected IsActivated method.
			return ExtensionHost.IsActivated(Description.identifier);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			// This synchronously retrieves the cached exports.
			return ExtensionHost.GetExtensionExports(Description.identifier);
		},
		// activate() is the only async method, returning a promise.
		activate: () => Effect.runPromise(ActivateEffect),
	};

	return Object.freeze(ExtensionAPIObject);
};
export default CreateAPIObject;
