/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type { IResourceUndoRedoElement } from "vs/platform/undoRedo/common/undoRedo.js";
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

export namespace WorkSpaceEdit {
	export function fromAPI(
		Edit: VSCode.WorkspaceEdit,
		VersionProvider?: IVersionInformationProvider,
	): IWorkspaceEdit {
		const result: IWorkspaceEdit = { edits: [] };

		for (const [uri, edits] of Edit.entries()) {
			if (edits[0] instanceof ExtHostTypes.TextEdit) {
				const resource = URIConverter.fromAPI(uri);
				const versionId = VersionProvider?.GetTextDocumentVersion(uri);
				for (const edit of edits as VSCode.TextEdit[]) {
					result.edits.push({
						resource,
						textEdit: TextEditConverter.fromAPI(edit),
						versionId,
					} as IWorkspaceTextEdit);
				}
			} else {
				for (const edit of edits as any[]) {
					result.edits.push({
						oldResource: edit.oldUri
							? URIConverter.fromAPI(edit.oldUri)
							: undefined,
						newResource: edit.newUri
							? URIConverter.fromAPI(edit.newUri)
							: undefined,
						options: edit.options,
						metadata: edit.metadata,
					} as IWorkspaceFileEdit);
				}
			}
		}
		return result;
	}

	export function ToAPI(DTO: IWorkspaceEdit): VSCode.WorkspaceEdit {
		const result = new ExtHostTypes.WorkspaceEdit();
		for (const edit of DTO.edits) {
			if ("textEdit" in edit) {
				const workspaceTextEdit = edit as IWorkspaceTextEdit;
				const uri = URIConverter.ToAPI(
					workspaceTextEdit.resource as any,
				);
				const textEdits = [
					TextEditConverter.ToAPI(workspaceTextEdit.textEdit as any),
				];
				result.set(uri, textEdits);
			} else {
				const fileEdit = edit as IWorkspaceFileEdit;
				if (fileEdit.oldResource && fileEdit.newResource) {
					result.renameFile(
						URIConverter.ToAPI(fileEdit.oldResource as any),
						URIConverter.ToAPI(fileEdit.newResource as any),
						fileEdit.options,
					);
				} else if (fileEdit.newResource) {
					result.createFile(
						URIConverter.ToAPI(fileEdit.newResource as any),
						fileEdit.options,
					);
				} else if (fileEdit.oldResource) {
					result.deleteFile(
						URIConverter.ToAPI(fileEdit.oldResource as any),
						fileEdit.options,
					);
				}
			}
		}
		return result;
	}
}
