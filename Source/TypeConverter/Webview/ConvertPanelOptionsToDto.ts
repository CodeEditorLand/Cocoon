/**
 * @module ConvertPanelOptionToDTO
 * @description Converts `vscode.WebViewPanelOption` into a serializable DTO.
 */

import type * as VSCode from "vscode";

/**
 * Converts the `vscode.WebViewPanelOption` object into a plain DTO suitable
 * for RPC transport.
 *
 * This includes options that control the behavior of the panel itself, such as
 * its persistence and UI features.
 *
 * @param Option - The `vscode.WebViewPanelOption` provided by the extension.
 * @returns A serializable DTO representing the webview panel's options.
 */
export const ConvertPanelOptionToDTO = (Option: VSCode.WebViewPanelOption) => ({
	EnableFindWidget: Option.enableFindWidget,
	RetainContextWhenHidden: Option.retainContextWhenHidden,
});
