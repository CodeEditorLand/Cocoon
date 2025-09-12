/**
 * @module WorkSpaceFolder
 * @description Converts `vscode.WorkspaceFolder` to its DTO representation.
 */
import type { IWorkspaceFolderData } from "@codeeditorland/output/vs/platform/workspace/common/workspace.js";
import type { WorkspaceFolder } from "vscode";
export declare const FromDTO: (DTO: IWorkspaceFolderData) => WorkspaceFolder;
//# sourceMappingURL=WorkspaceFolder.d.ts.map