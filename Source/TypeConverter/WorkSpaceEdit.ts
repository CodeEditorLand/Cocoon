/**
 * @module WorkSpaceEdit
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type { UriComponents } from "vs/base/common/uri.js";
import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
import type * as VSCode from "vscode";
import { WorkSpaceEdit as VSCodeWorkspaceEdit } from "../Platform/VSCode/Type.js";
import { FromAPI as UriFromAPI, ToAPI as UriToAPI } from "./Main/URI.js";

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

export const FromAPI = (
	Edit: VSCode.WorkspaceEdit,
	VersionProvider?: IVersionInformationProvider,
): IWorkspaceEdit => {
	const Result: IWorkspaceEdit = { edits: [] };
	for (const [URI, URIEditArray] of Edit.entries()) {
		const Resource = UriFromAPI(URI);
		const VersionId = VersionProvider?.GetTextDocumentVersion(URI);
		for (const SingleEdit of URIEditArray) {
			Result.edits.push({
				resource: Resource,
				textEdit: TextEditFromAPI(SingleEdit),
				versionId: VersionId,
			});
		}
	}
	return Result;
};

export const ToAPI = (DTO: IWorkspaceEdit): VSCode.WorkspaceEdit => {
	const Result = new VSCodeWorkspaceEdit();
	for (const Edit of DTO.edits) {
		if ("textEdit" in Edit) {
			const WorkspaceTextEdit = Edit as IWorkspaceTextEdit;
			const URI = UriToAPI(WorkspaceTextEdit.resource);
			const TextEditArray = [TextEditToAPI(WorkspaceTextEdit.textEdit)];
			Result.set(URI, TextEditArray);
		} else {
			const FileEdit = Edit as IWorkspaceFileEdit;
			if (FileEdit.oldResource && FileEdit.newResource) {
				Result.renameFile(
					UriToAPI(FileEdit.oldResource),
					UriToAPI(FileEdit.newResource),
					FileEdit.options,
				);
			} else if (FileEdit.newResource) {
				Result.createFile(
					UriToAPI(FileEdit.newResource),
					FileEdit.options,
				);
			} else if (FileEdit.oldResource) {
				Result.deleteFile(
					UriToAPI(FileEdit.oldResource),
					FileEdit.options,
				);
			}
		}
	}
	return Result;
};
