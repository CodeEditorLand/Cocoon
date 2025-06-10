/**
 * @module ConvertShowOptionsToDto
 * @description Converts `vscode.WebviewPanel` show options into a
 * serializable DTO.
 */

import type * as Vscode from "vscode";

import { ConvertViewColumnToDto } from "../Main/ConvertViewColumnToDto.js";

/**
 * Converts the user-provided `showOptions` for a webview panel into a
 * structured DTO suitable for sending to the `Mountain` host process.
 *
 * @param ViewColumn - The target `vscode.ViewColumn` for the panel.
 * @param PreserveFocus - A boolean indicating whether the panel should take
 *   focus when shown.
 * @returns A serializable DTO representing the showing behavior.
 */
export const ConvertShowOptionsToDto = (
	ViewColumn: Vscode.ViewColumn,
	PreserveFocus: boolean,
) => ({
	ViewColumn: ConvertViewColumnToDto(ViewColumn),
	PreserveFocus: PreserveFocus,
});
