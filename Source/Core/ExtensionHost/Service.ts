/*
 * File: Cocoon/Source/Core/ExtensionHost/Service.ts
 * Role: Defines the interface and Effect.Service for the ExtensionHost service.
 * Responsibilities:
 *   - Declare the contract for the core engine that manages the lifecycle of all
 *     extensions: loading, activating, and deactivating them.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
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

/**
 * The `Effect.Service` for the ExtensionHost.
 * This is the central service responsible for running extension code.
 */
export class ExtensionHost extends Effect.Service<ExtensionHost>(
	"Core/ExtensionHost",
)<{
	/**
	 * Activates an extension by its identifier. This is a fire-and-forget operation
	 * from the caller's perspective. Any activation errors are handled internally.
	 * @param ID - The identifier of the extension to activate.
	 * @param Reason - The reason for activation (e.g., startup, event).
	 * @returns An `Effect` that completes when activation has been attempted.
	 */
	readonly ActivateById: (
		ID: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	) => Effect.Effect<void, never>;

	/**
	 * Gets the full description for a loaded extension.
	 * @param ID - The identifier of the extension.
	 * @returns An `Effect` that resolves with the description or `undefined`.
	 */
	readonly GetExtensionDescription: (
		ID: string | ExtensionIdentifier,
	) => Effect.Effect<
		Readonly<IRelaxedExtensionDescription> | undefined,
		never
	>;

	/**
	 * Gets the exports of an activated extension.
	 * @param ID - The identifier of the extension.
	 * @returns An `Effect` that resolves to the `exports` object, or `undefined`.
	 *          The effect can fail if the extension's activation failed.
	 */
	readonly GetExtensionExports: (
		ID: ExtensionIdentifier,
	) => Effect.Effect<any, Error>;

	/**
	 * Checks if an extension is currently activated.
	 * @param ID - The identifier of the extension.
	 * @returns An `Effect` that resolves to `true` if the extension is active.
	 */
	readonly IsActivated: (ID: ExtensionIdentifier) => Effect.Effect<boolean>;

	/**
	 * Deactivates all currently activated extensions. This is typically called
	 * during graceful shutdown.
	 * @returns An `Effect` that completes when all deactivation logic has run.
	 */
	readonly DeactivateAll: () => Effect.Effect<void, never>;
}>() {}
