/**
 * @module WorkSpaceFolder
 * @description Converts `vscode.WorkspaceFolder` to its DTO representation.
 */

import type { IWorkspaceFolderData } from "@codeeditorland/output/vs/platform/workspace/common/workspace.js";
import type { WorkspaceFolder } from "vscode";

import { ToAPI as UriToAPI } from "./URI.js";

export const FromDTO = (DTO: IWorkspaceFolderData): WorkspaceFolder => {
	return {
		uri: UriToAPI(DTO.uri),
		name: DTO.name,
		index: DTO.index,
	};
};
