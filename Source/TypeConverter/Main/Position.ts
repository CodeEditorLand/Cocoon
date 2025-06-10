/**
 * @module Position (Main/TypeConverter)
 * @description Converts between `vscode.Position` and its DTO representation.
 */

import type { IPosition } from "vs/editor/common/core/selection.js";

import { Position as VscodePosition } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.Position` object into a plain DTO for IPC.
 * Note the conversion from 0-based (API) to 1-based (internal protocol) indexing.
 */
export const fromApi = (pos: VscodePosition): IPosition => ({
	lineNumber: pos.line + 1,
	column: pos.character + 1,
});

/**
 * Revives a position DTO back into a `vscode.Position` class instance.
 * Note the conversion from 1-based (internal protocol) to 0-based (API) indexing.
 */
export const toApi = (dto: IPosition): VscodePosition =>
	new VscodePosition(dto.lineNumber - 1, dto.column - 1);
