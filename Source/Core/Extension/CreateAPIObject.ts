/*
 * File: Cocoon/Source/Core/Extension/CreateAPIObject.ts
 * Responsibility: Implements the vscode.Extension API factory for Cocoon's extension host.
 * Modified: 2025-06-17 10:52:54 UTC
 */

/**
 * @module CreateAPIObject (Extension)
 * @description A factory function that creates the public-facing `vscode.Extension` object.
 * This acts as an adapter between the internal extension host service and the public API.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionKind, type Extension } from "vscode";

import type ExtensionHostService from "../ExtensionHost/Service.js";

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
	const ActivateEffect = Effect.gen(function* (G) {
		yield* G(
			ExtensionHost.ActivateById(Description.identifier, {
				startup: false,
				extensionId: Description.identifier,
				activationEvent: "api",
			}),
		);
		// After activation, get the exports.
		const Exports = yield* G(
			ExtensionHost.GetExtensionExports(Description.identifier),
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
			// FIXME: This is an anti-pattern. The `vscode.Extension` interface forces a
			// synchronous property, but our underlying service is effect-ful. `runSync`
			// is used here as a pragmatic escape hatch. A better long-term solution
			// would involve a reactive state management system.
			return Effect.runSync(
				ExtensionHost.IsActivated(Description.identifier),
			);
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: GetExtensionKind(),
		get exports(): T {
			// FIXME: This is an anti-pattern for the same reason as `isActive`.
			return Effect.runSync(
				ExtensionHost.GetExtensionExports(Description.identifier),
			);
		},
		// The `activate` function now correctly returns an Effect. The caller
		// (the extension host runtime) is responsible for running it and handling
		// the `Thenable` contract of the `vscode` API.
		activate: () => ActivateEffect as any,
		isFromDifferentExtensionHost: false,
	};

	return Object.freeze(ExtensionAPIObject);
};

export default CreateAPIObject;
