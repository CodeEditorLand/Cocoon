/**
 * @module Service (HostKindPicker)
 * @description Defines the interface and Context.Tag for the HostKindPicker service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ExtensionHostKind } from "vs/workbench/services/extensions/common/extensionHostKind.js";

/**
 * The service interface for picking an extension host kind.
 */
export interface Interface {
	/**
	 * Determines the appropriate extension host kind for a given extension based
	 * on its manifest properties.
	 *
	 * @param Extension - The description of the extension to analyze.
	 * @returns An `Effect` that resolves to an `ExtensionHostKind` or `null` if no
	 *   suitable host is found for the Cocoon environment.
	 */
	readonly PickHostKind: (
		Extension: IExtensionDescription,
	) => Effect.Effect<ExtensionHostKind | null, never>;
}

/**
 * The Context.Tag for the HostKindPicker service.
 */
export const Tag = Context.Tag<Interface>("Core/HostKindPicker");
