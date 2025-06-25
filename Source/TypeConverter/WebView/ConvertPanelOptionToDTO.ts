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
	// FIX: Create a new DTO object instead of mutating the original `Options`.
	const dto: WebviewPanelOptions = {};
	if (Options.enableFindWidget) {
		dto.enableFindWidget = Options.enableFindWidget;
	}
	if (Options.retainContextWhenHidden) {
		dto.retainContextWhenHidden = Options.retainContextWhenHidden;
	}
	return dto;
};
