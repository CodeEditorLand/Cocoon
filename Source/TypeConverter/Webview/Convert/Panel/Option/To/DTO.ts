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

	// FIX: Create a mutable intermediate object and then return it.
	// This is necessary because `WebviewPanelOptions` has readonly properties,
	// so we cannot declare an empty object of that type and then assign to it.
	const dto: {
		enableFindWidget?: boolean;

		retainContextWhenHidden?: boolean;
	} = {};

	if (Options.enableFindWidget !== undefined) {
		dto.enableFindWidget = Options.enableFindWidget;
	}

	if (Options.retainContextWhenHidden !== undefined) {
		dto.retainContextWhenHidden = Options.retainContextWhenHidden;
	}

	return dto;
};
