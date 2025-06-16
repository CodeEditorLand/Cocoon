
/**
 * @module Service (ExtensionHost)
 * @description Defines the interface and Context.Tag for the ExtensionHost service.
 * This service is the core engine responsible for managing the lifecycle of all
 * extensions: loading, activating, and deactivating them.
 */

import { Context, type Effect } from "effect";
import type {
	ExtensionIdentifier,
	IRelaxedExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";

/**
 * Describes the reason an extension is being activated.
 */
export interface ExtensionActivationReason {
	readonly startup: boolean;
	readonly extensionId: ExtensionIdentifier;
	readonly activationEvent: string;
}

export default class ExtensionHostService extends Context.Tag(
	"Core/ExtensionHost",
)<
	ExtensionHostService,
	{
		/**
		 * Activates an extension by its identifier.
		 * @param ID The identifier of the extension to activate.
		 * @param Reason The reason for activation (e.g., startup, event).
		 * @returns An `Effect` that completes when activation is attempted. It may fail with an Error.
		 */
		readonly ActivateById: (
			ID: ExtensionIdentifier,
			Reason: ExtensionActivationReason,
		) => Effect.Effect<void, Error>; // FIX: R should be `never` in the public interface.

		/**
		 * Gets the full description for a loaded extension.
		 * @param ID The identifier of the extension.
		 * @returns An `Effect` that resolves with an `Option` of the description.
		 */
		readonly GetExtensionDescription: (
			ID: string | ExtensionIdentifier,
		) => Effect.Effect<
			Readonly<IRelaxedExtensionDescription> | undefined,
			never,
			never
		>;

		/**
		 * Gets the exports of an activated extension.
		 * @param ID The identifier of the extension.
		 * @returns An `Effect` that resolves to the `exports` object, or `undefined`.
		 */
		readonly GetExtensionExports: (
			ID: ExtensionIdentifier,
		) => Effect.Effect<any>;

		/**
		 * Checks if an extension is currently activated.
		 * @param ID The identifier of the extension.
		 * @returns An `Effect` that resolves to `true` if the extension is active, `false` otherwise.
		 */
		readonly IsActivated: (
			ID: ExtensionIdentifier,
		) => Effect.Effect<boolean>;

		/**
		 * Deactivates all currently activated extensions.
		 * @returns An `Effect` that completes when all deactivation logic has run.
		 */
		readonly DeactivateAll: () => Effect.Effect<void, never, never>; // FIX: Corrected signature
	}
>() {}
