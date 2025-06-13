/**
 * @module ConvertShowOptionToDTO
 * @description Converts `vscode.WebViewPanel` show options into a
 * serializable DTO.
 */

import type { IEditorOptions } from "vs/platform/editor/common/editor.js";
import type * as VSCode from "vscode";

import * as ViewColumnConverter from "../Main/ViewColumn.js";

/**
 * Converts the user-provided `showOption` for a webview panel into a
 * structured DTO suitable for sending to the `Mountain` host process.
 *
 * @param ViewColumn The target `vscode.ViewColumn` for the panel.
 * @param PreserveFocus A boolean indicating whether the panel should take
 *   focus when shown.
 * @returns A serializable DTO representing the showing behavior.
 */
export function ConvertShowOptionToDTO(
	ViewColumn: VSCode.ViewColumn,
	PreserveFocus: boolean,
): { viewColumn?: number; preserveFocus: boolean } & IEditorOptions {
	return {
		viewColumn: ViewColumnConverter.FromAPI(ViewColumn),
		preserveFocus: PreserveFocus,
	};
}
