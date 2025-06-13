/**
 * @module CreateApiObject (Extension)
 * @description A factory function that creates the public-facing `vscode.Extension` object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ActivationKind } from "vs/workbench/api/common/extHostExtensionActivator.js";
import { ExtensionKind, Uri, type Extension } from "vscode";

import type { ExtensionHost } from "../../Core/ExtensionHost.js";

/**
 * Creates the public `vscode.Extension` API object from an internal `IExtensionDescription`.
 * This acts as an adapter between the internal extension host service and the public API.
 *
 * @param Description - The internal description of the extension.
 * @param ExtensionHostService - The core service that manages extension state.
 * @returns A frozen `vscode.Extension` object.
 */
export const CreateApiObject = <T>(
	Description: IExtensionDescription,
	ExtensionHostService: ExtensionHost.Interface,
): Extension<T> => {
	const ActivateEffect = ExtensionHostService.ActivateById(
		Description.identifier,
		{
			startup: false,
			extensionId: Description.identifier,
			activationEvent: "api",
			activationKind: ActivationKind.Api,
		},
	).pipe(
		Effect.map(
			() =>
				ExtensionHostService.GetExtensionExports(
					Description.identifier,
				) as T,
		),
	);

	const getExtensionKind = () => {
		if (Description.extensionKind?.includes("web"))
			return ExtensionKind.Web;
		if (Description.extensionKind?.includes("workspace"))
			return ExtensionKind.Workspace;
		return ExtensionKind.UI;
	};

	const ExtensionApiObject: Extension<T> = {
		id: Description.identifier.value,
		extensionUri: Uri.from(Description.extensionLocation),
		extensionPath: Description.extensionLocation.fsPath,
		get isActive() {
			return ExtensionHostService.IsActivated(Description.identifier);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: getExtensionKind(),
		get exports() {
			return ExtensionHostService.GetExtensionExports(
				Description.identifier,
			);
		},
		activate: () => Effect.runPromise(ActivateEffect),
	};

	return Object.freeze(ExtensionApiObject);
};
