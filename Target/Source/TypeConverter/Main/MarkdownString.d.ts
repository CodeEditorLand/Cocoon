/**
 * @module MarkdownString
 * @description Converts between `vscode.MarkdownString` and its DTO representation.
 */
import type { IMarkdownString } from "@codeeditorland/output/vs/base/common/htmlContent.js";
import type { MarkdownString as VSCodeMarkdownString } from "vscode";
/**
 * @description Converts a `vscode.MarkdownString` object into a plain DTO for IPC.
 * @param MarkdownStringInstance The `vscode.MarkdownString` instance to convert.
 * @returns The `IMarkdownString` DTO.
 */
export declare const FromAPI: (MarkdownStringInstance: VSCodeMarkdownString) => IMarkdownString;
/**
 * @description Revives a markdown string DTO back into a `vscode.MarkdownString` class instance.
 * @param MarkdownStringDTO The `IMarkdownString` DTO to revive.
 * @returns A new `vscode.MarkdownString` instance.
 */
export declare const ToAPI: (MarkdownStringDTO: IMarkdownString) => VSCodeMarkdownString;
//# sourceMappingURL=MarkdownString.d.ts.map