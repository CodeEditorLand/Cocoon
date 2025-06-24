/*
 * File: Cocoon/Source/Service/Localization/Service.ts
 * Role: Defines the interface and Effect.Service for the Localization service.
 * Responsibilities:
 *   - Declare the contract for the service that manages loading and caching
 *     NLS (National Language Support) string bundles for extensions.
 *   - Provide the `Effect.Service` for dependency injection.
 */

import { Effect, Option } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Event, Uri } from "vscode";

/**
 * The `Effect.Service` for the Localization service.
 */
export class Localization extends Effect.Service<Localization>(
	"Service/Localization",
)<{
	/**
	 * Gets the cached NLS bundle for a given extension.
	 * @param ExtensionID - The identifier of the extension.
	 * @returns An `Effect` resolving to an `Option` of the bundle object.
	 */
	readonly GetBundle: (
		ExtensionID: string,
	) => Effect.Effect<Option.Option<Record<string, string>>, never>;

	/**
	 * Gets the URI for an extension's effective localization bundle.
	 * @param ExtensionID - The identifier of the extension.
	 * @returns An `Effect` resolving to the bundle `Uri` or `undefined`.
	 */
	readonly GetBundleURI: (
		ExtensionID: string,
	) => Effect.Effect<Uri | undefined, never>;

	/**
	 * Fetches, merges, and caches the NLS bundles for a given extension.
	 * This process waits until the host signals it's ready.
	 * @param Extension - The description of the extension to initialize.
	 * @returns An `Effect` that can fail with an `Error`.
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
	readonly SignalLocalizationInitialized: () => Effect.Effect<void, never>;
}>() {}
