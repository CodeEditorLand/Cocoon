/**
 * @module Range (Main/TypeConverter)
 * @description Converts between `vscode.Range` and its DTO representation.
 */

import type { IRange } from "vs/editor/common/core/range.js";

import { Position, Range } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.Range` object into a plain DTO by delegating to the
 * `Position` converter for its start and end points.
 * @param RangeInstance The `vscode.Range` instance to convert.
 * @returns The `IRange` DTO.
 */
export const FromAPI = (RangeInstance: Range): IRange => ({
	startLineNumber: RangeInstance.start.line + 1,
	startColumn: RangeInstance.start.character + 1,
	endLineNumber: RangeInstance.end.line + 1,
	endColumn: RangeInstance.end.character + 1,
});

/**
 * Revives a range DTO back into a `vscode.Range` class instance.
 * @param RangeDTO The `IRange` DTO to revive.
 * @returns A new `vscode.Range` instance.
 */
export const ToAPI = (RangeDTO: IRange): Range =>
	new Range(
		new Position(RangeDTO.startLineNumber - 1, RangeDTO.startColumn - 1),
		new Position(RangeDTO.endLineNumber - 1, RangeDTO.endColumn - 1),
	);

export default {
	FromAPI,
	ToAPI,
};
