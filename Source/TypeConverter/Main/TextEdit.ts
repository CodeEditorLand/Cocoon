/**
 * @module TextEdit (Main/TypeConverter)
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */

import type { IRange } from "vs/editor/common/core/range.js";
import type {
	ISingleEditOperation,
	ITextEdit,
} from "vs/editor/common/languages.js";

import {
	Position,
	Range,
	TextEdit as VscTextEdit,
} from "../../Type/ExtHostTypes.js";
import * as RangeConverter from "./Range.js";

// Placeholder for internal type
interface SingleEditOperation {
	range: IRange;
	text: string | null;
	forceMoveMarkers?: boolean;
}

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
	let range: Range;
	if (TextEditDTO.range) {
		range = RangeConverter.toAPI(TextEditDTO.range);
	} else {
		range = new Range(new Position(0, 0), new Position(0, 0));
	}
	return new VscTextEdit(range, TextEditDTO.text, TextEditDTO.eol);
}
