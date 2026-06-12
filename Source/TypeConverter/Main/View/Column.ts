/**
 * @module ViewColumn
 * @description Converts the `vscode.ViewColumn` enum to its internal DTO representation.
 */

// ViewColumn enum from the real VS Code source via @codeeditorland/output.
const { ViewColumn: VSCodeViewColumn } =
	await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";

// VS Code internal constants for editor groups
const ActiveEditorGroup = -1;

const SideGroup = -2;

type EditorGroup = number;

/**
 * @description Converts a `vscode.ViewColumn` enum value into its internal numeric representation.
 * @param ViewColumn The `vscode.ViewColumn` enum value.
 * @returns The corresponding internal `EditorGroup` number.
 */
export const FromAPI = (
	ViewColumn?: VSCodeViewColumn,
): EditorGroup | undefined => {
	if (typeof ViewColumn !== "number") {
		return undefined;
	}

	switch (ViewColumn) {
		case VSCodeViewColumn.Active:
			return ActiveEditorGroup;

		case VSCodeViewColumn.Beside:
			return SideGroup;

		default:
			// ViewColumn.One, Two, etc. are 1-based, but EditorGroup is 0-based.
			if (ViewColumn >= VSCodeViewColumn.One) {
				return ViewColumn - 1;
			}
	}

	return undefined;
};
