/**
 * @module Item
 * @description Implements the type converter for `vscode.TreeItem`.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import type { Command } from "../Command.js";
/**
 * @description Converts a `vscode.TreeItem` object into a plain DTO for IPC.
 * @param _extension The description of the extension owning the item.
 * @param item The `vscode.TreeItem` instance to convert.
 * @param handle A unique handle for this item instance.
 * @param parentHandle The handle of the parent item, if any.
 * @param commandConverter An instance of the command converter.
 * @returns The serializable DTO.
 */
export declare const FromAPI: (_extension: IExtensionDescription, item: VSCode.TreeItem, handle: string, parentHandle: string | undefined, commandConverter: Command) => any;
/**
 * @description Revives a tree item DTO back into a `vscode.TreeItem` instance.
 * @param dto The raw DTO from IPC.
 * @returns A new `vscode.TreeItem` instance.
 */
export declare const ToAPI: (dto: any) => VSCode.TreeItem;
//# sourceMappingURL=Item.d.ts.map