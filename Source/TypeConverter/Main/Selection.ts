/*
 * File: Cocoon/Source/TypeConverter/Main/Selection.ts
 * Responsibility:
 * Modified: 2025-06-15 19:16:42 UTC
 * Dependency: ../../Type/ExtHostTypes.js, vs/editor/common/core/selection.js, vscode
 */

/**
 * @module Selection (Main/TypeConverter)
 * @description Converts between `vscode.Selection` and its DTO representation.
 */

import type { ISelection } from "vs/editor/common/core/selection.js";
import type { Selection as VscSelection } from "vscode";

import { Position, Selection } from "../../Type/ExtHostTypes.js";

/**
 * Converts a `vscode.Selection` object into a plain DTO for IPC.
 * @param SelectionInstance The `vscode.Selection` instance to convert.
 * @returns The `ISelection` DTO.
 */
const FromAPI = (SelectionInstance: VscSelection): ISelection => {
	return {
		selectionStartLineNumber: SelectionInstance.start.line + 1,
		selectionStartColumn: SelectionInstance.start.character + 1,
		positionLineNumber: SelectionInstance.end.line + 1,
		positionColumn: SelectionInstance.end.character + 1,
	};
};

/**
 * Revives a selection DTO back into a `vscode.Selection` class instance.
 * @param SelectionDTO The `ISelection` DTO to revive.
 * @returns A new `vscode.Selection` instance.
 */
const ToAPI = (SelectionDTO: ISelection): VscSelection => {
	const Anchor = new Position(
		SelectionDTO.selectionStartLineNumber - 1,
		SelectionDTO.selectionStartColumn - 1,
	);
	const Active = new Position(
		SelectionDTO.positionLineNumber - 1,
		SelectionDTO.positionColumn - 1,
	);
	return new Selection(Anchor, Active);
};

export default { FromAPI, ToAPI };
