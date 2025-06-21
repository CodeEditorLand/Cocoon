/**
 * @module WorkspaceFolder (Main/TypeConverter)
 * @description Converts `vscode.WorkspaceFolder` to its DTO representation.
 */

import type { IWorkspaceFolderData } from "vs/platform/workspace/common/workspace.js";
import type { WorkspaceFolder } from "vscode";

import URIConverter from "./URI.js";

const FromDTO = (DTO: IWorkspaceFolderData): WorkspaceFolder => {
	return {
		uri: URIConverter.ToAPI(DTO.uri),
		name: DTO.name,
		index: DTO.index,
	};
};

export default {
	FromDTO,
};
