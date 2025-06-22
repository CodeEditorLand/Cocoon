/**
 * @module ConvertShowOptionToDTO
 * @description Converts `vscode.WebviewPanel` show options into a
 * serializable DTO.
 */

import type * as VSCode from "vscode";

import ViewColumnConverter from "../Main/ViewColumn.js";

// Placeholder for internal VS Code DTO
interface IEditorOptions {
	preserveFocus?: boolean;

	// Should be IRange
	selection?: any;

	pinned?: boolean;

	sticky?: boolean;
}

/**
 * Converts the user-provided `showOption` for a webview panel into a
 * structured DTO suitable for sending to the `Mountain` host process.
 *
 * @param ViewColumn The target `vscode.ViewColumn` for the panel.
 * @param PreserveFocus A boolean indicating whether the panel should take
 *   focus when shown.
 * @returns A serializable DTO representing the showing behavior.
 */
export default (
	ViewColumn: VSCode.ViewColumn | undefined,

	PreserveFocus: boolean,
): { viewColumn?: number; preserveFocus: boolean } & IEditorOptions => {
	return {
		viewColumn: ViewColumnConverter.FromAPI(ViewColumn),

		preserveFocus: PreserveFocus,
	};
};
