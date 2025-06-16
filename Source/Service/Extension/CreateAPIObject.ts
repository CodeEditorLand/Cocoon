/*
 * File: Cocoon/Source/Service/Extension/CreateAPIObject.ts
 * Responsibility:
 * Modified: 2025-06-16 14:41:59 UTC
 * Dependency: ../../Core/ExtensionHost/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

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
		// FIX: Run the effect to get the exports value after activation.
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
			// FIX: Run the effect synchronously to get the boolean value.
			// This is safe as it's just reading from a Ref.
			return Effect.runSync(
				ExtensionHost.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports() {
			// FIX: Run the effect synchronously to get the exports value.
			return Effect.runSync(
				ExtensionHost.GetExtensionExports(Description.identifier),
			);
		},
		activate: (): Promise<T> => Effect.runPromise(ActivateEffect),
		// `isFromDifferentExtensionHost` is a proposed API field, default to false.
		isFromDifferentExtensionHost: false, // FIX: Added this required property.
	};

	return Object.freeze(ExtensionAPIObject);
};
export default CreateAPIObject;
