/*
 * File: Cocoon/Source/Service/APIDeprecation/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: effect, vs/platform/extensions/common/extensions.js
 * Export: APIDeprecationService
 */

/**
 * @module Service (APIDeprecation)
 * @description Defines the interface and Context.Tag for the APIDeprecation service.
 * This service is used by the APIFactory to report and handle the usage of
 * deprecated APIs by extensions.
 */

import { Context, type Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

export default class APIDeprecationService extends Context.Tag(
	"Service/APIDeprecation",
)<
	APIDeprecationService,
	{
		/**
		 * Creates an Effect that, when run, logs a warning that a deprecated API was used.
		 * @param ExtensionID The identifier of the extension that used the API.
		 * @param Usage A string identifying the deprecated API that was used (e.g., 'workspace.rootPath').
		 * @param Message The deprecation message to show the user.
		 * @returns An `Effect` that resolves when the warning has been logged.
		 */
		readonly Report: (
			ExtensionID: ExtensionIdentifier,
			Usage: string,
			Message: string,
		) => Effect.Effect<void, never>;

		/**
		 * Creates a property decorator that automatically reports usage of a deprecated property
		 * whenever it is accessed or set.
		 * @param ExtensionID The identifier of the extension that will use this API.
		 * @param Feature A string identifying the deprecated feature or property name.
		 * @param Message The deprecation message.
		 */
		readonly Deprecated: (
			ExtensionID: ExtensionIdentifier,
			Feature: string,
			Message: string,
		) => PropertyDecorator;
	}
>() {}
