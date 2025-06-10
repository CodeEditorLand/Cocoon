/**
 * @module Service (Localization)
 * @description Defines the interface and Context.Tag for the Localization service.
 */

import { Context, Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Uri } from "vscode";

export interface Interface {
	/**
	 * Gets the cached NLS bundle for a given extension.
	 * @returns An Effect resolving to the bundle object or `undefined`.
	 */
	readonly GetBundle: (
		ExtensionId: string,
	) => Effect.Effect<Record<string, string> | undefined, never>;

	/**
	 * Gets the URI for an extension's localization bundle.
	 * @returns An Effect resolving to the bundle URI or `undefined`.
	 */
	readonly GetBundleUri: (
		ExtensionId: string,
	) => Effect.Effect<Uri | undefined, never>;

	/**
	 * Fetches, merges, and caches the NLS bundles for a given extension.
	 */
	readonly InitializeLocalizedMessages: (
		Extension: IExtensionDescription,
	) => Effect.Effect<void, Error>;

	/**
	 * An event stream that fires once localization has been initialized for the host.
	 */
	readonly OnDidInitializeLocalization: Stream.Stream<void, never>;

	/**
	 * Signals that the host is ready for localization to begin. This opens the
	 * barrier that `InitializeLocalizedMessages` waits for.
	 */
	readonly SignalLocalizationInitialized: () => Effect.Effect<void, never>;
}

export const Tag = Context.Tag<Interface>("Service/Localization");
