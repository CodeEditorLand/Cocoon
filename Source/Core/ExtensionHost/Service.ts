/**
 * @module Service (ExtensionHost)
 * @description Defines the interface and Context.Tag for the ExtensionHost service.
 * This service is the core engine responsible for managing the lifecycle of all
 * extensions: loading, activating, and deactivating them.
 */

import { Context, Effect } from "effect";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import type { ExtensionActivationReason } from "vs/workbench/api/common/extHostExtensionActivator.js";

export interface Interface {
	/**
	 * Activates an extension by its identifier.
	 * @param ID The identifier of the extension to activate.
	 * @param Reason The reason for activation (e.g., startup, event).
	 * @returns An `Effect` that completes when activation is attempted.
	 */
	readonly ActivateById: (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	) => Effect.Effect<void, Error>;

	/**
	 * Gets the full description for a loaded extension.
	 * @param ID The identifier of the extension.
	 * @returns An `Effect` that resolves with the description or `undefined`.
	 */
	readonly GetExtensionDescription: (
		ID: string | ExtensionIdentifier,
	) => Effect.Effect<IExtensionDescription | undefined, never>;

	/**
	 * Gets the exports of an activated extension.
	 * @param ID The identifier of the extension.
	 * @returns The `exports` object from the extension's module, or `undefined`.
	 */
	readonly GetExtensionExports: (ID: ExtensionIdentifier) => any;

	/**
	 * Checks if an extension is currently activated.
	 * @param ID The identifier of the extension.
	 * @returns `true` if the extension is active, `false` otherwise.
	 */
	readonly IsActivated: (ID: ExtensionIdentifier) => boolean;

	/**
	 * Deactivates all currently activated extensions.
	 * @returns An `Effect` that completes when all deactivation logic has run.
	 */
	readonly DeactivateAll: () => Effect.Effect<void, never>;
}

export const Tag = Context.Tag<Interface>("Core/ExtensionHost");
