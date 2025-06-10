/**
 * @module Range (Main/TypeConverter)
 * @description Converts between `vscode.Range` and its DTO representation.
 */

import type { IRange } from "vs/editor/common/core/selection.js";

import { Range as VscodeRange } from "../../Type/ExtHostTypes.js";
import * as PositionConverter from "./Position.js";

/**
 * Converts a `vscode.Range` object into a plain DTO by delegating to the
 * `Position` converter for its start and end points.
 */
export const fromApi = (range: VscodeRange): IRange => ({
	startLineNumber: range.start.line + 1,
	startColumn: range.start.character + 1,
	endLineNumber: range.end.line + 1,
	endColumn: range.end.character + 1,
});

/**
 * Revives a range DTO back into a `vscode.Range` class instance.
 */
export const toApi = (dto: IRange): VscodeRange =>
	new VscodeRange(
		new Position(dto.startLineNumber - 1, dto.startColumn - 1),
		new Position(dto.endLineNumber - 1, dto.endColumn - 1),
	);
