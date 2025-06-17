/*
 * File: Cocoon/Source/TypeConverter/Main/ViewColumn.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: vs/workbench/api/common/extHostTypes.js
 */

/**
 * @module ViewColumn (Main/TypeConverter)
 * @description Converts the `vscode.ViewColumn` enum to its internal DTO representation.
 */

import { ViewColumn as VscViewColumn } from "vs/workbench/api/common/extHostTypes.js";

// Placeholders for internal VS Code constants
const ActiveEditorGroup = -1;
const SIDE_GROUP = -2;
type EditorGroup = number;

/**
 * Converts a `vscode.ViewColumn` enum value into its internal numeric representation
 * used by the VS Code workbench services.
 * @param ViewColumn The `vscode.ViewColumn` enum value.
 * @returns The corresponding internal `EditorGroup` number.
 */
const FromAPI = (ViewColumn?: VscViewColumn): EditorGroup | undefined => {
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
};

export default { FromAPI };
