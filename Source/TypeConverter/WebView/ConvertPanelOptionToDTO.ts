/**
 * @module ConvertPanelOptionToDTO
 * @description Converts `vscode.WebViewPanelOption` into a serializable DTO.
 */

import type { IWebviewPanelOptions } from "vs/workbench/contrib/webview/common/webview.js";
import type * as VSCode from "vscode";

/**
 * Converts the `vscode.WebViewPanelOption` object into a plain DTO suitable
 * for RPC transport.
 *
 * This includes options that control the behavior of the panel itself, such as
 * its persistence and UI features.
 *
 * @param Option The `vscode.WebViewPanelOption` provided by the extension.
 * @returns A serializable `IWebviewPanelOptions` DTO representing the webview panel's options.
 */
export function ConvertPanelOptionToDTO(
	Option: VSCode.WebViewPanelOption,
): IWebviewPanelOptions {
	return {
		enableFindWidget: Option.enableFindWidget,
		retainContextWhenHidden: Option.retainContextWhenHidden,
	};
}
