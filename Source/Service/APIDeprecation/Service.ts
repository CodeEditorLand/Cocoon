/*
 * File: Cocoon/Source/Service/APIDeprecation/Service.ts
 * Role: Defines the interface and Effect.Service for the APIDeprecation service.
 * Responsibilities:
 *   - Declare the contract for the service used to report and handle the usage
 *     of deprecated APIs by extensions.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

/**
 * The `Effect.Service` for the `APIDeprecation` service.
 */
export class APIDeprecation extends Effect.Service<APIDeprecation>(
	"Service/APIDeprecation",
)<{
	/**
	 * Creates an `Effect` that, when run, logs a warning that a deprecated API was used.
	 * @param ExtensionID - The identifier of the extension that used the API.
	 * @param Usage - A string identifying the deprecated API (e.g., 'workspace.rootPath').
	 * @param Message - The deprecation message to show the user.
	 * @returns An `Effect` that resolves when the warning has been logged.
	 */
	readonly Report: (
		ExtensionID: ExtensionIdentifier,
		Usage: string,
		Message: string,
	) => Effect.Effect<void, never>;

	/**
	 * Creates a property decorator that automatically reports usage of a deprecated
	 * property whenever it is accessed or set.
	 * @param ExtensionID - The identifier of the extension that will use this API.
	 * @param Feature - A string identifying the deprecated feature or property name.
	 * @param Message - The deprecation message.
	 */
	readonly Deprecated: (
		ExtensionID: ExtensionIdentifier,
		Feature: string,
		Message: string,
	) => PropertyDecorator;
}>() {}
