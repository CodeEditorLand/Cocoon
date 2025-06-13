/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type {
	IWorkspaceFileEdit,
	IWorkspaceTextEdit,
} from "vs/editor/common/languages.js";
import type { IWorkspaceEdit } from "vs/platform/workspace/common/workspace.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as TextEditConverter from "./Main/TextEdit.js";
import * as URIConverter from "./Main/URI.js";

/**
 * An interface for a service that can provide the version of a text document.
 * This is required to ensure workspace edits are applied to the correct document state.
 */
export interface IVersionInformationProvider {
	GetTextDocumentVersion(uri: VSCode.Uri): number | undefined;
}

export namespace WorkSpaceEdit {
	/**
	 * Converts a rich `vscode.WorkSpaceEdit` object into a plain DTO for IPC.
	 * @param Edit The `vscode.WorkSpaceEdit` instance to convert.
	 * @param VersionProvider An optional provider to get document versions.
	 * @returns The `IWorkspaceEdit` DTO.
	 */
	export function FromAPI(
		Edit: VSCode.WorkSpaceEdit,
		VersionProvider?: IVersionInformationProvider,
	): IWorkspaceEdit {
		const result: IWorkspaceEdit = { edits: [] };

		for (const [uri, edits] of Edit.entries()) {
			if (edits[0] instanceof ExtHostTypes.TextEdit) {
				// This is a text edit for a single file
				result.edits.push({
					resource: URIConverter.FromAPI(uri),
					textEdits: (edits as VSCode.TextEdit[]).map(
						TextEditConverter.FromAPI,
					),
					versionId: VersionProvider?.GetTextDocumentVersion(uri),
				} as IWorkspaceTextEdit);
			} else {
				// This entry contains file operations (create, rename, delete)
				for (const edit of edits as any[]) {
					// VSCode's internal representation for file edits is a bit different.
					// We construct the DTO based on the presence of old/new URIs.
					result.edits.push({
						oldResource: edit.oldUri
							? URIConverter.FromAPI(edit.oldUri)
							: undefined,
						newResource: edit.newUri
							? URIConverter.FromAPI(edit.newUri)
							: undefined,
						options: edit.options,
						metadata: edit.metadata,
					} as IWorkspaceFileEdit);
				}
			}
		}
		return result;
	}

	/**
	 * Revives a WorkSpaceEdit DTO back into a `vscode.WorkSpaceEdit` class instance.
	 * @param DTO The `IWorkspaceEdit` DTO to revive.
	 * @returns A new `vscode.WorkSpaceEdit` instance.
	 */
	export function ToAPI(DTO: IWorkspaceEdit): VSCode.WorkSpaceEdit {
		const result = new ExtHostTypes.WorkSpaceEdit();
		for (const edit of DTO.edits) {
			if ("textEdits" in edit) {
				// Text Edit
				const uri = URIConverter.ToAPI(edit.resource);
				const textEdits = edit.textEdits.map(TextEditConverter.ToAPI);
				result.set(uri, textEdits);
			} else {
				// File Edit
				const fileEdit = edit as IWorkspaceFileEdit;
				if (fileEdit.oldResource && fileEdit.newResource) {
					result.renameFile(
						URIConverter.ToAPI(fileEdit.oldResource),
						URIConverter.ToAPI(fileEdit.newResource),
						fileEdit.options,
					);
				} else if (fileEdit.newResource) {
					result.createFile(
						URIConverter.ToAPI(fileEdit.newResource),
						fileEdit.options,
					);
				} else if (fileEdit.oldResource) {
					result.deleteFile(
						URIConverter.ToAPI(fileEdit.oldResource),
						fileEdit.options,
					);
				}
			}
		}
		return result;
	}
}
