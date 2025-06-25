/**
 * @module TextEdit
 * @description Converts between `vscode.TextEdit` and its DTO representation.
 */
import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type { TextEdit as VscTextEdit } from "vscode";
/**
 * @description Converts a `vscode.TextEdit` object into a plain DTO for IPC.
 * @param TextEditInstance The `vscode.TextEdit` instance to convert.
 * @returns The `IIdentifiedSingleEditOperation` DTO.
 */
export declare const FromAPI: (TextEditInstance: VscTextEdit) => IIdentifiedSingleEditOperation;
/**
 * @description Revives a text edit DTO back into a `vscode.TextEdit` class instance.
 * @param TextEditDTO The `IIdentifiedSingleEditOperation` DTO to revive.
 * @returns A new `vscode.TextEdit` instance.
 */
export declare const ToAPI: (TextEditDTO: IIdentifiedSingleEditOperation) => VscTextEdit;
