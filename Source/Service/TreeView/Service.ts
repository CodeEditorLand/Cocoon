/**
 * @module Service (TreeView)
 * @description Defines the interface and Context.Tag for the TreeView service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { TreeDataProvider, TreeView, TreeViewOption } from "vscode";

export interface Interface {
	/**
	 * Creates a new tree view.
	 * @param ViewId - The ID of the view.
	 * @param Option - Option for the tree view, including the data provider.
	 * @param Extension - The extension creating the view.
	 */
	readonly CreateTreeView: <T>(
		ViewId: string,
		Option: TreeViewOption<T>,
		Extension: IExtensionDescription,
	) => Effect.Effect<TreeView<T>, Error>;
}

export const Tag = Context.Tag<Interface>("Service/TreeView");
