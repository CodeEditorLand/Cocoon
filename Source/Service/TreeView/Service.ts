/*
 * File: Cocoon/Source/Service/TreeView/Service.ts
 * Role: Defines the service interface and Effect.Service for the TreeView service.
 * Responsibilities:
 *   - Declare the contract for creating and managing tree views, which are custom
 *     views populated by an extension's `TreeDataProvider`.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { TreeView, TreeViewOptions } from "vscode";

/**
 * The `Effect.Service` for the TreeView service.
 * This service implements the `vscode.window.createTreeView` API.
 */
export class TreeView extends Effect.Service<TreeView>("Service/TreeView")<{
	/**
	 * Creates a new tree view and registers its data provider.
	 * @param ViewID - The ID of the view, which must match a view contribution in `package.json`.
	 * @param Options - Options for the tree view, including the data provider.
	 * @param Extension - The extension creating the view.
	 * @returns An `Effect` that resolves to the created `TreeView` instance or fails with an `Error`.
	 */
	readonly CreateTreeView: <T>(
		ViewID: string,
		Options: TreeViewOptions<T>,
		Extension: IExtensionDescription,
	) => Effect.Effect<TreeView<T>, Error>;
}>() {}
