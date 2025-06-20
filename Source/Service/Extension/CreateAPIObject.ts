

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
		yield* ExtensionHost.ActivateById(Description.identifier, {
			startup: false,
			extensionId: Description.identifier,
			activationEvent: "api",
		});
		// Run the effect to get the exports value after activation.
		const Exports = yield* ExtensionHost.GetExtensionExports(
			Description.identifier,
		);
		return Exports as T;
	});

	const GetExtensionKind = (): ExtensionKind => {
		const Kinds = Array.isArray(Description.extensionKind)
			? Description.extensionKind
			: Description.extensionKind
				? [Description.extensionKind]
				: ["workspace"]; // Default to workspace if not specified

		if (Kinds.includes("workspace")) {
			return ExtensionKind.Workspace;
		}
		return ExtensionKind.UI;
	};

	const ExtensionAPIObject: Extension<T> = {
		id: Description.identifier.value,
		extensionUri: Description.extensionLocation,
		extensionPath: Description.extensionLocation.fsPath,
		get isActive(): boolean {
			// This must be synchronous to match the VS Code API.
			// It is safe because IsActivated reads from a Ref, which is a sync operation.
			return Effect.runSync(
				ExtensionHost.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			// This must be synchronous. It can fail if the extension activation failed.
			// We squash the error into `undefined` to match the API behavior.
			return Effect.runSync(
				Effect.catchAll(
					ExtensionHost.GetExtensionExports(Description.identifier),
					() => Effect.succeed(undefined),
				),
			);
		},
		activate: (): Promise<T> => Effect.runPromise(ActivateEffect),
		// `isFromDifferentExtensionHost` is a proposed API field, default to false.
		isFromDifferentExtensionHost: false,
	};

	return Object.freeze(ExtensionAPIObject);
};
export default CreateAPIObject;
