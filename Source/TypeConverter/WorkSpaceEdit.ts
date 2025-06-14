/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type {
	IWorkspaceEdit, // Placeholder
	IWorkspaceFileEdit,
	IWorkspaceTextEdit,
} from "vs/editor/common/languages.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as TextEditConverter from "./Main/TextEdit.js";
import * as URIConverter from "./Main/URI.js";

export interface IVersionInformationProvider {
	GetTextDocumentVersion(uri: VSCode.Uri): number | undefined;
}

export namespace WorkSpaceEdit {
	export function FromAPI(
		Edit: VSCode.WorkspaceEdit,
		VersionProvider?: IVersionInformationProvider,
	): IWorkspaceEdit {
		const result: IWorkspaceEdit = { edits: [] };

		for (const [uri, edits] of Edit.entries()) {
			if (edits[0] instanceof ExtHostTypes.TextEdit) {
				// This is a list of text edits for a single file.
				// The internal DTO structure is an array of IWorkspaceTextEdit.
				const resource = URIConverter.fromAPI(uri);
				const versionId = VersionProvider?.GetTextDocumentVersion(uri);
				for (const edit of edits as VSCode.TextEdit[]) {
					result.edits.push({
						resource,
						textEdit: TextEditConverter.FromAPI(edit),
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
		const result = new ExtHostTypes.WorkSpaceEdit();
		for (const edit of DTO.edits) {
			if ("textEdits" in edit) {
				const uri = URIConverter.toAPI(edit.resource);
				const textEdits = edit.textEdits.map(TextEditConverter.ToAPI);
				result.set(uri, textEdits);
			} else {
				const fileEdit = edit as IWorkspaceFileEdit;
				if (fileEdit.oldResource && fileEdit.newResource) {
					result.renameFile(
						URIConverter.toAPI(fileEdit.oldResource),
						URIConverter.toAPI(fileEdit.newResource),
						fileEdit.options,
					);
				} else if (fileEdit.newResource) {
					result.createFile(
						URIConverter.toAPI(fileEdit.newResource),
						fileEdit.options,
					);
				} else if (fileEdit.oldResource) {
					result.deleteFile(
						URIConverter.toAPI(fileEdit.oldResource),
						fileEdit.options,
					);
				}
			}
		}
		return result;
	}
}
