/**
 * @module OpenDialogOption
 * @description Converts `vscode.OpenDialogOptions` to its DTO representation.
 */
import type { OpenDialogOptions } from "vscode";
/**
 * @description Converts `vscode.OpenDialogOptions` to a plain DTO for IPC.
 * @param Options The `OpenDialogOptions` to convert.
 * @returns The serializable DTO.
 */
export declare const ToDTO: (Options?: OpenDialogOptions) => any;
//# sourceMappingURL=OpenDialogOption.d.ts.map