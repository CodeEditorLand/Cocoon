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
export declare const ToDTO: (Options?: OpenDialogOptions) => {
    defaultUri: any;
    filters: {
        name: string;
        extensions: readonly string[];
    }[] | undefined;
    openLabel?: string;
    canSelectFiles?: boolean;
    canSelectFolders?: boolean;
    canSelectMany?: boolean;
    title?: string;
} | undefined;
