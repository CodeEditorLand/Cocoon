/**
 * @module CreateAPIObject (Extension)
 * @description A factory function that creates the public-facing `vscode.Extension` object.
 * This acts as an adapter between the internal extension host service and the public API.
 */

import { Effect } from "effect";
import { URI as VscURI } from "vs/base/common/uri.js";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionKind, type Extension, type Uri } from "vscode";

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
	const Activate = Effect.gen(function* () {
		yield* ExtensionHost.ActivateById(Description.identifier, {
			startup: false,
			extensionId: Description.identifier,
			activationEvent: "api",
		} as any);
		const exports = yield* ExtensionHost.GetExtensionExports(
			Description.identifier,
		);
		return exports as T;
	});

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
		extensionUri: VscURI.revive(Description.extensionLocation),
		extensionPath: Description.extensionLocation.fsPath,
		get isActive() {
			return Effect.runSync(
				ExtensionHost.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			const exportsEffect = ExtensionHost.GetExtensionExports(
				Description.identifier,
			);
			return Effect.runSync(exportsEffect) as T;
		},
		activate: () => Effect.runPromise(Activate),
		isFromDifferentExtensionHost: false, // Assuming same host
	};

	return Object.freeze(ExtensionAPIObject);
};
export default CreateAPIObject;
