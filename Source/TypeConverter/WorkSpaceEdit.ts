/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type * as VSCode from "vscode";

import { WorkspaceEdit as VscWorkspaceEdit } from "../Type/ExtHostTypes.js";
import TextEditConverter from "./Main/TextEdit.js";
import URIConverter from "./Main/URI.js";

// Placeholders for internal VS Code DTOs
interface IWorkspaceTextEdit {
	resource: UriComponents;
	textEdit: IIdentifiedSingleEditOperation;
	versionId?: number;
	metadata?: any;
}
interface IWorkspaceFileEdit {
	oldResource?: UriComponents;
	newResource?: UriComponents;
	options?: any;
	metadata?: any;
}
type IWorkspaceEdit = {
	edits: Array<IWorkspaceTextEdit | IWorkspaceFileEdit>;
	metadata?: any;
};

export interface IVersionInformationProvider {
	GetTextDocumentVersion(Uri: VSCode.Uri): number | undefined;
}

const FromAPI = (
	Edit: VSCode.WorkspaceEdit,
	VersionProvider?: IVersionInformationProvider,
): IWorkspaceEdit => {
	const Result: IWorkspaceEdit = { edits: [] };
	for (const [URI, URIEditArray] of Edit.entries()) {
		// The provided WorkspaceEdit shim only supports text edits.
		// The logic for file operations is removed as it's based on an incorrect assumption
		// about the shim's implementation of `entries()`.
		const Resource = URIConverter.FromAPI(URI);
		const VersionId = VersionProvider?.GetTextDocumentVersion(URI);
		for (const SingleEdit of URIEditArray) {
			Result.edits.push({
				resource: Resource,
				textEdit: TextEditConverter.FromAPI(SingleEdit),
				versionId: VersionId,
			});
		}
	}
	return Result;
};

const ToAPI = (DTO: IWorkspaceEdit): VSCode.WorkspaceEdit => {
	const Result = new VscWorkspaceEdit();
	for (const Edit of DTO.edits) {
		if ("textEdit" in Edit) {
			const WorkspaceTextEdit = Edit as IWorkspaceTextEdit;
			const URI = URIConverter.ToAPI(WorkspaceTextEdit.resource);
			const TextEditArray = [
				TextEditConverter.ToAPI(WorkspaceTextEdit.textEdit),
			];
			Result.set(URI, TextEditArray);
		} else {
			const FileEdit = Edit as IWorkspaceFileEdit;
			if (FileEdit.oldResource && FileEdit.newResource) {
				Result.renameFile(
					URIConverter.ToAPI(FileEdit.oldResource),
					URIConverter.ToAPI(FileEdit.newResource),
					FileEdit.options,
				);
			} else if (FileEdit.newResource) {
				Result.createFile(
					URIConverter.ToAPI(FileEdit.newResource),
					FileEdit.options,
				);
			} else if (FileEdit.oldResource) {
				Result.deleteFile(
					URIConverter.ToAPI(FileEdit.oldResource),
					FileEdit.options,
				);
			}
		}
	}
	return Result;
};

export default { FromAPI, ToAPI };
