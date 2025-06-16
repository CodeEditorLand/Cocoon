/*
 * File: Cocoon/Source/Core/Extension/CreateAPIObject.ts
 * Responsibility: Implements the factory function that creates the vscode.Extension API object for the Cocoon sidecar, adapting between the internal ExtensionHostService and the public extension API to enable VS Code extension compatibility in Land's Node.js environment.
 * Modified: 2025-06-16 14:41:55 UTC
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
		// FIX: After activation, get the exports. This should be an effect itself.
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
				: ["workspace"]; // Default to 'workspace'

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
			// FIX: `IsActivated` returns an Effect. Since it's a sync read from a Ref,
			// we can use `runSync` to get the raw boolean value.
			return Effect.runSync(
				ExtensionHost.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports(): T {
			// FIX: `GetExtensionExports` returns an Effect. Run it synchronously.
			return Effect.runSync(
				ExtensionHost.GetExtensionExports(Description.identifier),
			);
		},
		activate: () => Effect.runPromise(ActivateEffect),
		// FIX: Add the missing property required by the vscode.Extension<T> interface.
		isFromDifferentExtensionHost: false,
	};

	return Object.freeze(ExtensionAPIObject);
};
export default CreateAPIObject;
