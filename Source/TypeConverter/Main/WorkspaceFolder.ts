/*
 * File: Cocoon/Source/TypeConverter/Main/WorkspaceFolder.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:11 UTC
 * Dependency: ./URI.js, vs/platform/workspace/common/workspace.js, vscode
 */

/**
 * @module WorkspaceFolder (Main/TypeConverter)
 * @description Converts `vscode.WorkspaceFolder` to its DTO representation.
 */

import type { IWorkspaceFolderData } from "vs/platform/workspace/common/workspace.js";
import type { WorkspaceFolder } from "vscode";

import URIConverter from "./URI.js";

const fromDTO = (DTO: IWorkspaceFolderData): WorkspaceFolder => {
	return {
		uri: URIConverter.ToAPI(DTO.uri),
		name: DTO.name,
		index: DTO.index,
	};
};

export default {
	fromDTO,
};
