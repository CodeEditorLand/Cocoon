/**
 * @module ConvertPanelOptionToDTO
 * @description Converts `vscode.WebviewPanelOptions` into a serializable DTO.
 */
import type { WebviewPanelOptions as IWebviewPanelOptions } from "vscode";
import type * as VSCode from "vscode";
/**
 * @description Converts the `vscode.WebviewPanelOptions` object into a plain DTO suitable
 * for RPC transport.
 * @param Options The `vscode.WebviewPanelOptions` provided by the extension.
 * @returns A serializable `IWebviewPanelOptions` DTO.
 */
export declare const ConvertPanelOptionToDTO: (Options: VSCode.WebviewPanelOptions) => IWebviewPanelOptions;
