/**
 * @module WorkSpaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkSpaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { TextEdit as TextEditConverter, Uri as UriConverter } from "./Main.js";

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
	 */
	export const fromAPI = (
		edit: VSCode.WorkSpaceEdit,
		versionProvider?: IVersionInformationProvider,
	): ExtHostProtocol.IWorkspaceEditDTO => {
		const result: ExtHostProtocol.IWorkspaceEditDTO = { edits: [] };

		for (const [uri, edits] of edit.entries()) {
			if (edits.every((edit) => edit instanceof ExtHostTypes.TextEdit)) {
				// This is a text edit for a single file
				result.edits.push({
					_type: 1, // Type 'Text'
					resource: UriConverter.fromAPI(uri),
					edit: edits.map(TextEditConverter.fromAPI),
					versionId: versionProvider?.GetTextDocumentVersion(uri),
				});
			} else {
				// This entry contains file operations (create, rename, delete)
				for (const edit of edits as VSCode.WorkSpaceFileEdit[]) {
					result.edits.push({
						_type: 2, // Type 'File'
						oldUri: edit.oldUri
							? UriConverter.fromAPI(edit.oldUri)
							: undefined,
						newUri: edit.newUri
							? UriConverter.fromAPI(edit.newUri)
							: undefined,
						options: edit.options,
						metadata: edit.metadata,
					});
				}
			}
		}
		return result;
	};

	/**
	 * Revives a WorkSpaceEdit DTO back into a `vscode.WorkSpaceEdit` class instance.
	 */
	export const toAPI = (
		dto: ExtHostProtocol.IWorkspaceEditDTO,
	): VSCode.WorkSpaceEdit => {
		const result = new ExtHostTypes.WorkSpaceEdit();
		for (const edit of dto.edits) {
			switch (edit._type) {
				case 1: // Text Edit
					const uri = UriConverter.toAPI(edit.resource);
					const textEdits = (
						edit as ExtHostProtocol.IWorkspaceTextEditDTO
					).edit.map(TextEditConverter.toAPI);
					result.set(uri, textEdits);
					break;
				case 2: // File Edit
					const fileEdit =
						edit as ExtHostProtocol.IWorkspaceFileEditDTO;
					if (fileEdit.oldUri && fileEdit.newUri) {
						result.renameFile(
							UriConverter.toAPI(fileEdit.oldUri),
							UriConverter.toAPI(fileEdit.newUri),
							fileEdit.options,
						);
					} else if (fileEdit.newUri) {
						result.createFile(
							UriConverter.toAPI(fileEdit.newUri),
							fileEdit.options,
						);
					} else if (fileEdit.oldUri) {
						result.deleteFile(
							UriConverter.toAPI(fileEdit.oldUri),
							fileEdit.options,
						);
					}
					break;
				// Add cases for notebook edits, etc.
			}
		}
		return result;
	};
}
