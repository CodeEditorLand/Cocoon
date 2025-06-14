/**
 * @module TextEdit (Main/TypeConverter)
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */

import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";

import { TextEdit as VscTextEdit } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";

/**
 * Converts a `vscode.TextEdit` object into a plain DTO for IPC.
 * @param TextEditInstance The `vscode.TextEdit` instance to convert.
 * @returns The `IIdentifiedSingleEditOperation` DTO.
 */
export const FromAPI = (
	TextEditInstance: VscTextEdit,
): IIdentifiedSingleEditOperation => ({
	text: TextEditInstance.newText,
	range: RangeConverter.FromAPI(TextEditInstance.range),
	forceMoveMarkers: false,
});

/**
 * Revives a text edit DTO back into a `vscode.TextEdit` class instance.
 * @param TextEditDTO The `IIdentifiedSingleEditOperation` DTO to revive.
 * @returns A new `vscode.TextEdit` instance.
 */
export const ToAPI = (
	TextEditDTO: IIdentifiedSingleEditOperation,
): VscTextEdit =>
	new VscTextEdit(
		RangeConverter.ToAPI(TextEditDTO.range),
		TextEditDTO.text ?? "",
	);

export default {
	FromAPI,
	ToAPI,
};
