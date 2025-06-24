/*
 * File: Cocoon/Source/Service/Storage/Service.ts
 * Role: Defines the interface and Effect.Service for the Storage service factory.
 * Responsibilities:
 *   - Declare the contract for the service responsible for creating `Memento`
 *     instances for persistent, scoped key-value storage.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { Memento } from "vscode";

/**
 * The `Effect.Service` for the Storage service factory.
 *
 * This service doesn't provide a Memento instance directly, but rather a factory
 * function (`CreateMemento`) that constructs Memento instances scoped to a
 * specific extension and storage type (Global or Workspace).
 */
export class Storage extends Effect.Service<Storage>("Service/Storage")<{
	/**
	 * Creates a `Memento` instance for persistent key-value storage.
	 * @param ExtensionID - The ID of the extension requesting the storage.
	 * @param IsGlobal - If `true`, creates a global storage memento (shared
	 *   across workspaces); otherwise, a workspace-scoped one.
	 * @returns A `Memento` instance providing synchronous `get` and `update` methods.
	 */
	readonly CreateMemento: (ExtensionID: string, IsGlobal: boolean) => Memento;
}>() {}
