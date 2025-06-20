

/**
 * @module Service (TreeView)
 * @description Defines the interface and Context.Tag for the TreeView service.
 * This service implements the `vscode.window.createTreeView` API.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { TreeView, TreeViewOptions } from "vscode";

export default class TreeViewService extends Context.Tag("Service/TreeView")<
	TreeViewService,
	{
		/**
		 * Creates a new tree view.
		 * @param ViewID The ID of the view, which must match a view contribution in `package.json`.
		 * @param Options Options for the tree view, including the data provider.
		 * @param Extension The extension creating the view.
		 * @returns An `Effect` that resolves to the created `TreeView` instance.
		 */
		readonly CreateTreeView: <T>(
			ViewID: string,
			Options: TreeViewOptions<T>,
			Extension: IExtensionDescription,
		) => Effect.Effect<TreeView<T>, Error>;
	}
>() {}
