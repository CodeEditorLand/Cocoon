/**
 * @module TextEdit (Main/TypeConverter)
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */

import {
	SingleEditOperation,
	Range as VscRange,
} from "vs/editor/common/core/editOperation.js";
import type { ITextEdit } from "vs/editor/common/languages.js";
import { Range as VscApiRange } from "vs/workbench/api/common/extHostTypes.js";

import { Range, TextEdit as VscTextEdit } from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";

/**
 * Converts a `vscode.TextEdit` object into a plain DTO for IPC.
 * @param TextEditInstance The `vscode.TextEdit` instance to convert.
 * @returns The `ITextEdit` DTO.
 */
export function FromAPI(TextEditInstance: VscTextEdit): ITextEdit {
	return {
		text: TextEditInstance.newText,
		range: RangeConverter.FromAPI(TextEditInstance.range),
		eol: TextEditInstance.newEol,
	};
}

/**
 * Revives a text edit DTO back into a `vscode.TextEdit` class instance.
 * @param TextEditDTO The `ITextEdit` DTO to revive.
 * @returns A new `vscode.TextEdit` instance.
 */
export function ToAPI(TextEditDTO: ITextEdit): VscTextEdit {
	let range: VscApiRange;
	if (TextEditDTO.range) {
		range = RangeConverter.ToAPI(TextEditDTO.range);
	} else {
		// VS Code's internal `SingleEditOperation` can create a TextEdit without a range,
		// so we must handle this case, defaulting to an empty range.
		range = new Range(0, 0, 0, 0);
	}
	return new VscTextEdit(range, TextEditDTO.text, TextEditDTO.eol);
}
