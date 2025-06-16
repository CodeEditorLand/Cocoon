/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type { URI as VscUri } from "vs/base/common/uri.js";
import type * as VSCode from "vscode";

import {
	TextEdit,
	WorkspaceEdit as VscWorkspaceEdit,
} from "../Type/ExtHostTypes.js";
import { TextEdit as TextEditConverter, URI as URIConverter } from "./Main.js";

// Placeholders for internal VS Code DTOs
interface IWorkspaceTextEdit {
	resource: VscUri;
	textEdit: VSCode.TextEdit;
	versionId?: number;
	metadata?: any;
}
interface IWorkspaceFileEdit {
	oldResource?: VscUri;
	newResource?: VscUri;
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
		if (URIEditArray.length > 0 && URIEditArray[0] instanceof TextEdit) {
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

const ToAPI = (DTO: IWorkspaceEdit): VSCode.WorkspaceEdit => {
	const Result = new VscWorkspaceEdit();
	for (const Edit of DTO.edits) {
		if ("textEdit" in Edit) {
			const WorkspaceTextEdit = Edit as IWorkspaceTextEdit;
			const URI = URIConverter.ToAPI(WorkspaceTextEdit.resource);
			const TextEditArray = [
				TextEditConverter.ToAPI(WorkspaceTextEdit.textEdit as any),
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
