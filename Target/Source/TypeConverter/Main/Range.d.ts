/**
 * @module Range
 * @description Converts between `vscode.Range` and its DTO representation.
 */
import type { IRange } from "@codeeditorland/output/vs/editor/common/core/range.js";
import type { Range as VSCodeRange } from "vscode";
/**
 * @description Converts a `vscode.Range` object into a plain DTO by delegating to the
 * `Position` converter for its start and end points.
 * @param RangeInstance The `vscode.Range` instance to convert.
 * @returns The `IRange` DTO.
 */
export declare const FromAPI: (RangeInstance: VSCodeRange) => IRange;
/**
 * @description Revives a range DTO back into a `vscode.Range` class instance.
 * @param RangeDTO The `IRange` DTO to revive.
 * @returns A new `vscode.Range` instance.
 */
export declare const ToAPI: (RangeDTO: IRange) => VSCodeRange;
//# sourceMappingURL=Range.d.ts.map