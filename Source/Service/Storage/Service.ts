/*
 * File: Cocoon/Source/Service/Storage/Service.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:52 UTC
 * Dependency: effect, vscode
 * Export: StorageService
 */

/**
 * @module Service (Storage)
 * @description Defines the interface and Context.Tag for the Storage service factory.
 * This service is responsible for creating `Memento` instances, which provide
 * persistent key-value storage scoped to an extension.
 */

import { Context } from "effect";
import type { Memento } from "vscode";

/**
 * The `Context.Tag` for the Storage service factory.
 */
export default class StorageService extends Context.Tag("Service/Storage")<
	StorageService,
	{
		/**
		 * Creates a Memento instance.
		 * @param ExtensionID The ID of the extension requesting the storage.
		 * @param IsGlobal If `true`, creates a global storage memento (shared across workspaces);
		 *   otherwise, a workspace-scoped one.
		 * @returns A `Memento` instance.
		 */
		readonly CreateMemento: (
			ExtensionID: string,
			IsGlobal: boolean,
		) => Memento;
	}
>() {}
