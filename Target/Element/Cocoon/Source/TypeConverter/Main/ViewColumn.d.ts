/**
 * @module ViewColumn
 * @description Converts the `vscode.ViewColumn` enum to its internal DTO representation.
 */
import { ViewColumn as VSCodeViewColumn } from "vscode";
type EditorGroup = number;
/**
 * @description Converts a `vscode.ViewColumn` enum value into its internal numeric representation.
 * @param ViewColumn The `vscode.ViewColumn` enum value.
 * @returns The corresponding internal `EditorGroup` number.
 */
export declare const FromAPI: (ViewColumn?: VSCodeViewColumn) => EditorGroup | undefined;
export {};
