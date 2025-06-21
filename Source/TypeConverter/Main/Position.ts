/**
 * @module Position (Main/TypeConverter)
 * @description Converts between `vscode.Position` and its DTO representation.
 */

import type { IPosition } from "vs/editor/common/core/position.js";
import type { Position as VscPosition } from "vscode";

import { Position } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.Position` object into a plain DTO for IPC.
 * Note the conversion from 0-based (API) to 1-based (internal protocol) indexing.
 * @param PositionInstance The `vscode.Position` instance to convert.
 * @returns The `IPosition` DTO.
 */
const FromAPI = (PositionInstance: VscPosition): IPosition => ({
	lineNumber: PositionInstance.line + 1,
	column: PositionInstance.character + 1,
});

/**
 * Revives a position DTO back into a `vscode.Position` class instance.
 * Note the conversion from 1-based (internal protocol) to 0-based (API) indexing.
 * @param PositionDTO The `IPosition` DTO to revive.
 * @returns A new `vscode.Position` instance.
 */
const ToAPI = (PositionDTO: IPosition): VscPosition =>
	new Position(PositionDTO.lineNumber - 1, PositionDTO.column - 1);

export default { FromAPI, ToAPI };
