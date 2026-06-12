/**
 * @module ConvertShowOptionToDTO
 * @description Converts `vscode.WebviewPanel` show options into a
 * serializable DTO.
 */

import type * as VSCode from "vscode";

import { FromAPI as ViewColumnFromAPI } from "../../../../../Main/View/Column.js";

interface IEditorOptions {
	preserveFocus?: boolean;

	selection?: any;

	pinned?: boolean;

	sticky?: boolean;
}

/**
 * @description Converts the user-provided `showOption` for a webview panel into a
 * structured DTO suitable for sending to the `Mountain` host process.
 * @param ViewColumn The target `vscode.ViewColumn` for the panel.
 * @param PreserveFocus A boolean indicating whether the panel should take focus.
 * @returns A serializable DTO representing the showing behavior.
 */
export const ConvertShowOptionToDTO = (
	ViewColumn: VSCode.ViewColumn | undefined,

	PreserveFocus: boolean,
): { viewColumn?: number; preserveFocus: boolean } & IEditorOptions => {
	const DTO: {
		viewColumn?: number;

		preserveFocus: boolean;
	} & IEditorOptions = {
		preserveFocus: PreserveFocus,
	};

	const ViewColumnValue = ViewColumnFromAPI(ViewColumn;

	if (ViewColumnValue !== undefined) {
		DTO.viewColumn = ViewColumnValue;
	}

	return DTO;
};
