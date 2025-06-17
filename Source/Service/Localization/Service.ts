/*
 * File: Cocoon/Source/Service/Localization/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: effect, vs/platform/extensions/common/extensions.js, vscode
 * Export: LocalizationService
 */

/**
 * @module Service (Localization)
 * @description Defines the interface and Context.Tag for the Localization service.
 * This service manages loading and caching NLS (National Language Support)
 * string bundles for extensions.
 */

import { Context, Option, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Event, Uri } from "vscode";

export default class LocalizationService extends Context.Tag(
	"Service/Localization",
)<
	LocalizationService,
	{
		/**
		 * Gets the cached NLS bundle for a given extension.
		 * @param ExtensionID The identifier of the extension.
		 * @returns An `Effect` resolving to the bundle object (a string-to-string map) or `undefined`.
		 */
		readonly GetBundle: (
			ExtensionID: string,
		) => Effect.Effect<Option.Option<Record<string, string>>, never>;

		/**
		 * Gets the URI for an extension's effective localization bundle.
		 * @param ExtensionID The identifier of the extension.
		 * @returns An `Effect` resolving to the bundle URI or `undefined`.
		 */
		readonly GetBundleURI: (
			ExtensionID: string,
		) => Effect.Effect<Uri | undefined, never>;

		/**
		 * Fetches, merges, and caches the NLS bundles for a given extension.
		 * This process waits until the host signals it's ready.
		 * @param Extension The description of the extension to initialize.
		 */
		readonly InitializeLocalizedMessages: (
			Extension: IExtensionDescription,
		) => Effect.Effect<void, Error>;

		/**
		 * An event that fires once localization has been initialized for the host,
		 * indicating that it is safe to start loading extension bundles.
		 */
		readonly onDidInitializeLocalization: Event<void>;

		/**
		 * Signals that the host is ready for localization to begin. This opens the
		 * barrier that `InitializeLocalizedMessages` waits for.
		 */
		readonly SignalLocalizationInitialized: () => Effect.Effect<
			void,
			never
		>;
	}
>() {}
