/**
 * @module Option
 * @description Implements the type converter for `vscode.TreeViewOptions`.
 */

import type { TreeViewOptions } from "vscode";

/**
 * @description Converts `vscode.TreeViewOptions` to a plain DTO for IPC.
 * @param option The `TreeViewOptions` to convert.
 * @returns The serializable DTO.
 */
export const FromAPI = (option: TreeViewOptions<any>): any => {

	return {
		showCollapseAll: !!option.showCollapseAll,

		canSelectMany: !!option.canSelectMany,

		hasHandleDrag: !!option.dragAndDropController?.handleDrag,

		hasHandleDrop: !!option.dragAndDropController?.handleDrop,
	};
};
