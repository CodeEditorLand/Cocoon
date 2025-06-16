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
	const ActivateEffect = ExtensionHost.ActivateById(Description.identifier, {
		startup: false,
		extensionId: Description.identifier,
		activationEvent: "api",
	} ).pipe(
		Effect.andThen(
			ExtensionHost.GetExtensionExports(Description.identifier),
		),
	);

	// The public-facing properties must be synchronous.
	// The internal state management must support this.
	// This is now impossible since the service methods return Effects.
	// We will change the implementation to return Promises from an async getter
	// to make progress, acknowledging this deviates from the strict vscode.d.ts.
	// A final implementation may require a more complex state synchronization proxy.
	const ExtensionAPIObject = {
		id: Description.identifier.value,
		extensionUri: Description.extensionLocation,
		extensionPath: Description.extensionLocation.fsPath,
		get isActive(): boolean {
			// This is not strictly correct but is a placeholder.
			// A full solution would require a synchronous state cache.
			console.warn(
				"Synchronous access to `isActive` is not fully supported in this async environment.",
			);
			return false;
		},
		get packageJSON() {
			return Description;
		},
		extensionKind: ExtensionKind.Workspace,
		get exports() {
			// This is not strictly correct.
			console.warn(
				"Synchronous access to `exports` is not fully supported in this async environment.",
			);
			return undefined;
		},
		activate: (): Promise<T> => Effect.runPromise(ActivateEffect),
	};

	return Object.freeze(ExtensionAPIObject as Extension<T>);
};
export default CreateAPIObject;
