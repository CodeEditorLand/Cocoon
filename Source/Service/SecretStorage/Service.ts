/**
 * @module Service (SecretStorage)
 * @description Defines the interface and Context.Tag for the SecretStorage service factory.
 */

import { Context } from "effect";
import type { SecretStorage } from "vscode";

/**
 * The service interface for the SecretStorage factory.
 * Its primary role is to create `SecretStorage` instances scoped to a specific extension.
 */
export interface Interface {
	readonly CreateStorage: (ExtensionId: string) => SecretStorage;
}

export const Tag = Context.Tag<Interface>("Service/SecretStorage");
