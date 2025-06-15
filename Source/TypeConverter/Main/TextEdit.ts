/**
 * @module TextEdit (Main/TypeConverter)
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */

import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type { TextEdit as VscTextEdit } from "vscode";

import { Range, TextEdit } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.TextEdit` object into a plain DTO for IPC.
 * @param TextEditInstance The `vscode.TextEdit` instance to convert.
 * @returns The `IIdentifiedSingleEditOperation` DTO.
 */
const FromAPI = (
	TextEditInstance: VscTextEdit,
): IIdentifiedSingleEditOperation => ({
	text: TextEditInstance.newText,
	range: TextEditInstance.range as Range,
	forceMoveMarkers: false,
});

/**
 * Revives a text edit DTO back into a `vscode.TextEdit` class instance.
 * @param TextEditDTO The `IIdentifiedSingleEditOperation` DTO to revive.
 * @returns A new `vscode.TextEdit` instance.
 */
const ToAPI = (TextEditDTO: IIdentifiedSingleEditOperation): VscTextEdit =>
	new TextEdit(TextEditDTO.range as Range, TextEditDTO.text ?? "");

export default { FromAPI, ToAPI };
