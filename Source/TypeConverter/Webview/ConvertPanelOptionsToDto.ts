/**
 * @module ConvertPanelOptionsToDto
 * @description Converts `vscode.WebviewPanelOptions` into a serializable DTO.
 */

import type * as Vscode from "vscode";

/**
 * Converts the `vscode.WebviewPanelOptions` object into a plain DTO suitable
 * for RPC transport.
 *
 * This includes options that control the behavior of the panel itself, such as
 * its persistence and UI features.
 *
 * @param Option - The `vscode.WebviewPanelOptions` provided by the extension.
 * @returns A serializable DTO representing the webview panel's options.
 */
export const ConvertPanelOptionsToDto = (
	Option: Vscode.WebviewPanelOptions,
) => ({
	EnableFindWidget: Option.enableFindWidget,
	RetainContextWhenHidden: Option.retainContextWhenHidden,
});
