/**
 * @module Service (ApiDeprecation)
 * @description Defines the interface and Context.Tag for the ApiDeprecation service.
 */

import { Context, Effect } from "effect";
import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

/**
 * The service interface for API deprecation reporting.
 */
export interface Interface {
	/**
	 * Reports that a deprecated API was used. Returns an Effect that logs a warning.
	 * @param ExtensionId - The identifier of the extension that used the API.
	 * @param Usage - A string identifying the deprecated API that was used.
	 * @param Message - The deprecation message to show the user.
	 */
	readonly Report: (
		ExtensionId: ExtensionIdentifier,
		Usage: string,
		Message: string,
	) => Effect.Effect<void>;

	/**
	 * Creates a property decorator that automatically reports usage of a deprecated property.
	 * @param ExtensionId - The identifier of the extension that will use this API.
	 * @param Feature - A string identifying the deprecated feature or property name.
	 * @param Message - The deprecation message.
	 */
	readonly Deprecated: (
		ExtensionId: ExtensionIdentifier,
		Feature: string,
		Message: string,
	) => PropertyDecorator;
}

/**
 * The Context.Tag for the ApiDeprecation service.
 */
export const Tag = Context.Tag<Interface>("Service/ApiDeprecation");
