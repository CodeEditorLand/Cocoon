/**
 * @module ConvertPanelOptionToDTO
 * @description Converts `vscode.WebviewPanelOptions` into a serializable DTO.
 */

import type { WebviewPanelOptions } from "vscode";
import type * as VSCode from "vscode";

/**
 * @description Converts the `vscode.WebviewPanelOptions` object into a plain DTO suitable
 * for RPC transport.
 * @param Options The `vscode.WebviewPanelOptions` provided by the extension.
 * @returns A serializable `IWebviewPanelOptions` DTO.
 */
export const ConvertPanelOptionToDTO = (
	Options: VSCode.WebviewPanelOptions,
): WebviewPanelOptions => {
	// FIX: Return a new object literal. This initializes the readonly properties
	// which is allowed, as opposed to assigning to them after creation.
	return {
		enableFindWidget: Options.enableFindWidget,
		retainContextWhenHidden: Options.retainContextWhenHidden,
	};
};
