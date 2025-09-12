/**
 * @module Option
 * @description Implements the type converter for `vscode.TreeViewOptions`.
 */
import type { TreeViewOptions } from "vscode";
/**
 * @description Converts `vscode.TreeViewOptions` to a plain DTO for IPC.
 * @param option The `TreeViewOptions` to convert.
 * @returns The serializable DTO.
 */
export declare const FromAPI: (option: TreeViewOptions<any>) => any;
//# sourceMappingURL=Option.d.ts.map