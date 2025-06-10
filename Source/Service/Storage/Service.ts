/**
 * @module Service (Storage)
 * @description Defines the interface and Context.Tag for the Storage service factory.
 */

import { Context } from "effect";
import type { Memento } from "vscode";

/**
 * The service interface for the Storage factory.
 * Its role is to create Memento instances scoped to an extension and storage type.
 */
export interface Interface {
	/**
	 * Creates a Memento instance.
	 * @param ExtensionId - The ID of the extension requesting the storage.
	 * @param IsGlobal - If `true`, creates a global storage memento; otherwise, a workspace-scoped one.
	 */
	readonly CreateMemento: (ExtensionId: string, IsGlobal: boolean) => Memento;
}

export const Tag = Context.Tag<Interface>("Service/Storage");
