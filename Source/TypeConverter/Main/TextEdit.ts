/*
 * File: Cocoon/Source/TypeConverter/Main/TextEdit.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:41 UTC
 * Dependency: ../../Type/ExtHostTypes.js, ./Range.js, vs/editor/common/model.js, vscode
 */

/**
 * @module TextEdit (Main/TypeConverter)
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */

import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type { Range as VscRange, TextEdit as VscTextEdit } from "vscode";

import {
	Range as ExtHostRange,
	TextEdit as ExtHostTextEdit,
} from "../../Type/ExtHostTypes.js";
import RangeConverter from "./Range.js";

function toExtHostRange(range: VscRange): ExtHostRange {
	return new ExtHostRange(
		range.start.line,
		range.start.character,
		range.end.line,
		range.end.character,
	);
}

/**
 * Converts a `vscode.TextEdit` object into a plain DTO for IPC.
 * @param TextEditInstance The `vscode.TextEdit` instance to convert.
 * @returns The `IIdentifiedSingleEditOperation` DTO.
 */
const FromAPI = (
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
const ToAPI = (TextEditDTO: IIdentifiedSingleEditOperation): VscTextEdit =>
	new ExtHostTextEdit(
		toExtHostRange(RangeConverter.ToAPI(TextEditDTO.range)),
		TextEditDTO.text ?? "",
	);

export default { FromAPI, ToAPI };
