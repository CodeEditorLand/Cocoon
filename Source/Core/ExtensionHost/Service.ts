/**
 * @module Service (ExtensionHost)
 * @description Defines the interface and Context.Tag for the ExtensionHost service.
 * This service is the core engine responsible for managing the lifecycle of all
 * extensions: loading, activating, and deactivating them.
 */

import { Context, type Effect } from "effect";
import type {
	ExtensionIdentifier,
	IExtensionDescription,
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
		readonly ActivateById: (
			ID: ExtensionIdentifier,
			Reason: ExtensionActivationReason,
		) => Effect.Effect<void, Error>;
		readonly GetExtensionDescription: (
			ID: string | ExtensionIdentifier,
		) => IExtensionDescription | undefined;
		readonly GetExtensionExports: (ID: ExtensionIdentifier) => any;
		readonly IsActivated: (ID: ExtensionIdentifier) => boolean;
		readonly DeactivateAll: () => Effect.Effect<void, never>;
	}
>() {}
