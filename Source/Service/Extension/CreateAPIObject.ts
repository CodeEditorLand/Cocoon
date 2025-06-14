/**
 * @module CreateAPIObject (Extension)
 * @description A factory function that creates the public-facing `vscode.Extension` object.
 * This acts as an adapter between the internal extension host service and the public API.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ActivationKind, ExtensionKind, Uri, type Extension } from "vscode";

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
	ExtensionHost: ExtensionHostService,
): Extension<T> => {
	const Activate = ExtensionHost.ActivateById(Description.identifier, {
		startup: false,
		extensionId: Description.identifier,
		activationEvent: "api",
		activationKind: ActivationKind.API,
	}).pipe(
		Effect.map(
			() =>
				ExtensionHost.GetExtensionExports(Description.identifier) as T,
		),
	);

	const GetExtensionKind = () => {
		if (Description.extensionKind?.includes("web")) {
			return ExtensionKind.Web;
		}
		if (Description.extensionKind?.includes("workspace")) {
			return ExtensionKind.Workspace;
		}
		return ExtensionKind.UI;
	};

	const ExtensionAPIObject: Extension<T> = {
		id: Description.identifier.value,
		extensionUri: Uri.revive(Description.extensionLocation),
		extensionPath: Description.extensionLocation.fsPath,
		get isActive() {
			return ExtensionHost.IsActivated(Description.identifier);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			return ExtensionHost.GetExtensionExports(Description.identifier);
		},
		activate: () => Effect.runPromise(Activate),
		isFromDifferentExtensionHost: false, // Assuming it's always local
	};

	return Object.freeze(ExtensionAPIObject);
};
export default CreateAPIObject;
