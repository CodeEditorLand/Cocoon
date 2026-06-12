/**
 * @module TextEdit
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */

import type { IIdentifiedSingleEditOperation } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/editor/common/model.js";

import type { Range as VSCodeRange, TextEdit as VSCodeTextEdit } from "vscode";

import {
	Range as ExtHostRange,
	TextEdit as ExtHostTextEdit,
} from "../../../Platform/VSCode/Type.js";

import { FromAPI as RangeFromAPI, ToAPI as RangeToAPI } from "../Range.js";

function ToExtHostRange(range: VSCodeRange): ExtHostRange {

	return new ExtHostRange(
		range.start.line,

		range.start.character,

		range.end.line,

		range.end.character,
	;
}

/**
 * @description Converts a `vscode.TextEdit` object into a plain DTO for IPC.
 * @param TextEditInstance The `vscode.TextEdit` instance to convert.
 * @returns The `IIdentifiedSingleEditOperation` DTO.
 */
export const FromAPI = (
	TextEditInstance: VSCodeTextEdit,
): IIdentifiedSingleEditOperation => ({
	text: TextEditInstance.newText,
	range: RangeFromAPI(TextEditInstance.range),
	forceMoveMarkers: false,
};

/**
 * @description Revives a text edit DTO back into a `vscode.TextEdit` class instance.
 * @param TextEditDTO The `IIdentifiedSingleEditOperation` DTO to revive.
 * @returns A new `vscode.TextEdit` instance.
 */
export const ToAPI = (
	TextEditDTO: IIdentifiedSingleEditOperation,
): VSCodeTextEdit =>
	new ExtHostTextEdit(
		ToExtHostRange(RangeToAPI(TextEditDTO.range)),

		TextEditDTO.text ?? "",
	;
