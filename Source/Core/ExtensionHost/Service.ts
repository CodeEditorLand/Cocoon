/**
 * @module Service (ExtensionHost)
 * @description Defines the interface and Context.Tag for the ExtensionHost service.
 */

import { Context, Effect } from "effect";
import {
	ExtensionIdentifier,
	type IExtensionDescription,
} from "vs/platform/extensions/common/extensions.js";
import type { ExtensionActivationReason } from "vs/workbench/api/common/extHostExtensionActivator.js";

export interface Interface {
	readonly ActivateById: (
		Id: ExtensionIdentifier,
		Reason: ExtensionActivationReason,
	) => Effect.Effect<void, Error>;

	readonly GetExtensionDescription: (
		Id: string | ExtensionIdentifier,
	) => Effect.Effect<IExtensionDescription | undefined>;

	readonly GetExtensionExports: (Id: ExtensionIdentifier) => any;

	readonly IsActivated: (Id: ExtensionIdentifier) => boolean;

	readonly DeactivateAll: () => Effect.Effect<void>;
}

export const Tag = Context.Tag<Interface>("Core/ExtensionHost");
