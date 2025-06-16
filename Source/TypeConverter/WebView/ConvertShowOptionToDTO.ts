/*
 * File: Cocoon/Source/TypeConverter/WebView/ConvertShowOptionToDTO.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:39 UTC
 * Dependency: ../Main/ViewColumn.js, vscode
 */

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
	selection?: any; // Should be IRange
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
const ConvertShowOptionToDTO = (
	ViewColumn: VSCode.ViewColumn | undefined,
	PreserveFocus: boolean,
): { viewColumn?: number; preserveFocus: boolean } & IEditorOptions => {
	return {
		viewColumn: ViewColumnConverter.FromAPI(ViewColumn),
		preserveFocus: PreserveFocus,
	};
};

export default ConvertShowOptionToDTO;
