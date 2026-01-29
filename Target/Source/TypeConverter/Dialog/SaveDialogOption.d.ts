/**
 * @module SaveDialogOption
 * @description Converts `vscode.SaveDialogOptions` to its DTO representation.
 */
import type { SaveDialogOptions } from "vscode";
/**
 * @description Converts `vscode.SaveDialogOptions` to a plain DTO for IPC.
 * @param Options The `SaveDialogOptions` to convert.
 * @returns The serializable DTO.
 */
export declare const ToDTO: (Options?: SaveDialogOptions) => {
    defaultUri: any;
    filters: {
        name: string;
        extensions: readonly string[];
    }[];
    saveLabel?: string;
    title?: string;
};
//# sourceMappingURL=SaveDialogOption.d.ts.map