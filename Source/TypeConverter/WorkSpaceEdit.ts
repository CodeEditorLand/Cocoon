/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as TextEditConverter from "./Main/TextEdit.js";
import * as URIConverter from "./Main/URI.js";

// Placeholders for internal VS Code DTOs
interface IWorkspaceTextEdit {
	resource: VSCode.Uri;
	textEdit: VSCode.TextEdit;
	versionId?: number;
	metadata?: any;
}
interface IWorkspaceFileEdit {
	oldResource?: VSCode.Uri;
	newResource?: VSCode.Uri;
	options?: any;
	metadata?: any;
}
type IWorkspaceEdit = {
	edits: Array<IWorkspaceTextEdit | IWorkspaceFileEdit>;
	metadata?: any;
};

export interface IVersionInformationProvider {
	GetTextDocumentVersion(uri: VSCode.Uri): number | undefined;
}

export const FromAPI = (
	Edit: VSCode.WorkspaceEdit,
	VersionProvider?: IVersionInformationProvider,
): IWorkspaceEdit => {
	const Result: IWorkspaceEdit = { edits: [] };

	for (const [URI, URIEditArray] of Edit.entries()) {
		if (URIEditArray[0] instanceof ExtHostTypes.TextEdit) {
			const Resource = URIConverter.FromAPI(URI);
			const VersionId = VersionProvider?.GetTextDocumentVersion(URI);
			for (const SingleEdit of URIEditArray as VSCode.TextEdit[]) {
				Result.edits.push({
					resource: Resource,
					textEdit: TextEditConverter.FromAPI(SingleEdit),
					versionId: VersionId,
				} as any);
			}
		} else {
			for (const FileEdit of URIEditArray as any[]) {
				Result.edits.push({
					oldResource: FileEdit.oldUri
						? URIConverter.FromAPI(FileEdit.oldUri)
						: undefined,
					newResource: FileEdit.newUri
						? URIConverter.FromAPI(FileEdit.newUri)
						: undefined,
					options: FileEdit.options,
					metadata: FileEdit.metadata,
				} as any);
			}
		}
	}
	return Result;
};

export const ToAPI = (DTO: IWorkspaceEdit): VSCode.WorkspaceEdit => {
	const Result = new ExtHostTypes.WorkspaceEdit();
	for (const Edit of DTO.edits) {
		if ("textEdit" in Edit) {
			const WorkspaceTextEdit = Edit as IWorkspaceTextEdit;
			const URI = URIConverter.ToAPI(WorkspaceTextEdit.resource as any);
			const TextEditArray = [
				TextEditConverter.ToAPI(WorkspaceTextEdit.textEdit as any),
			];
			Result.set(URI, TextEditArray);
		} else {
			const FileEdit = Edit as IWorkspaceFileEdit;
			if (FileEdit.oldResource && FileEdit.newResource) {
				Result.renameFile(
					URIConverter.ToAPI(FileEdit.oldResource as any),
					URIConverter.ToAPI(FileEdit.newResource as any),
					FileEdit.options,
				);
			} else if (FileEdit.newResource) {
				Result.createFile(
					URIConverter.ToAPI(FileEdit.newResource as any),
					FileEdit.options,
				);
			} else if (FileEdit.oldResource) {
				Result.deleteFile(
					URIConverter.ToAPI(FileEdit.oldResource as any),
					FileEdit.options,
				);
			}
		}
	}
	return Result;
};

export default {
	FromAPI,
	ToAPI,
};
