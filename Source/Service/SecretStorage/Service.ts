/**
 * @module Service (SecretStorage)
 * @description Defines the interface and Context.Tag for the SecretStorage service factory.
 * This service is responsible for creating `SecretStorage` instances that are scoped
 * to a specific extension.
 */

import { Context } from "effect";
import type { SecretStorage } from "vscode";

/**
 * The service interface for the SecretStorage factory.
 */
export interface Interface {
	/**
	 * Creates a `SecretStorage` instance for a given extension.
	 * @param ExtensionID The ID of the extension requesting the storage.
	 * @returns A `SecretStorage` instance.
	 */
	readonly CreateStorage: (ExtensionID: string) => SecretStorage;
}

export const Tag = Context.Tag<Interface>("Service/SecretStorage");
