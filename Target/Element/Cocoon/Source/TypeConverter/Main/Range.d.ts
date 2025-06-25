/**
 * @module Range
 * @description Converts between `vscode.Range` and its DTO representation.
 */
import type { IRange } from "vs/editor/common/core/range.js";
import type { Range as VscRange } from "vscode";
/**
 * @description Converts a `vscode.Range` object into a plain DTO by delegating to the
 * `Position` converter for its start and end points.
 * @param RangeInstance The `vscode.Range` instance to convert.
 * @returns The `IRange` DTO.
 */
export declare const FromAPI: (RangeInstance: VscRange) => IRange;
/**
 * @description Revives a range DTO back into a `vscode.Range` class instance.
 * @param RangeDTO The `IRange` DTO to revive.
 * @returns A new `vscode.Range` instance.
 */
export declare const ToAPI: (RangeDTO: IRange) => VscRange;
