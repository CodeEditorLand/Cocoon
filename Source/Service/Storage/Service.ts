/*
 * File: Cocoon/Source/Service/Storage/Service.ts
 * Role: Defines the interface and Context.Tag for the Storage service factory.
 * Responsibilities:
 *   1. Declare the contract for the Storage service, which is responsible for creating
 *      `Memento` instances for persistent key-value storage.
 *   2. This is the public API surface consumed by other services or the API factory.
 */

import { Context } from "effect";
import type { Memento } from "vscode";

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
