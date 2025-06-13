/**
 * @module ViewColumn (Main/TypeConverter)
 * @description Converts the `vscode.ViewColumn` enum to its internal DTO representation.
 */

import {
	ActiveEditorGroup,
	EditorGroup,
	SIDE_GROUP,
} from "vs/workbench/services/editor/common/editorService.js";

import { ViewColumn as VscViewColumn } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.ViewColumn` enum value into its internal numeric representation
 * used by the VS Code workbench services.
 * @param ViewColumn The `vscode.ViewColumn` enum value.
 * @returns The corresponding internal `EditorGroup` number.
 */
export function FromAPI(ViewColumn?: VscViewColumn): EditorGroup | undefined {
	if (typeof ViewColumn !== "number") {
		return undefined;
	}

	switch (ViewColumn) {
		case VscViewColumn.Active:
			return ActiveEditorGroup;
		case VscViewColumn.Beside:
			return SIDE_GROUP;
		default:
			// ViewColumn.One, Two, etc. are 1-based, but EditorGroup is 0-based.
			if (ViewColumn >= VscViewColumn.One) {
				return ViewColumn - 1;
			}
	}
	return undefined;
}
