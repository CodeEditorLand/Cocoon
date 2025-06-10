/**
 * @module WorkspaceEdit (TypeConverter)
 * @description Implements converters for `vscode.WorkspaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { IURITransformer } from "vs/base/common/uriIpc.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as Vscode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Commands as CommandsConverter } from "./Commands/mod.js";
import { TextEdit as TextEditConverter, Uri as UriConverter } from "./Main.js";

/**
 * An interface for a service that can provide the version of a text document.
 * This is required to ensure workspace edits are applied to the correct document state.
 */
export interface IVersionInformationProvider {
	GetTextDocumentVersion(uri: Vscode.Uri): number | undefined;
}

export namespace WorkspaceEdit {
	/**
	 * Converts a rich `vscode.WorkspaceEdit` object into a plain DTO for IPC.
	 */
	export const fromApi = (
		edit: Vscode.WorkspaceEdit,
		versionProvider?: IVersionInformationProvider,
	): ExtHostProtocol.IWorkspaceEditDto => {
		const result: ExtHostProtocol.IWorkspaceEditDto = { edits: [] };

		for (const [uri, edits] of edit.entries()) {
			if (edits.every((edit) => edit instanceof ExtHostTypes.TextEdit)) {
				// This is a text edit for a single file
				result.edits.push({
					_type: 1, // Type 'Text'
					resource: UriConverter.fromApi(uri),
					edit: edits.map(TextEditConverter.fromApi),
					versionId: versionProvider?.GetTextDocumentVersion(uri),
				});
			} else {
				// This entry contains file operations (create, rename, delete)
				for (const edit of edits as Vscode.WorkspaceFileEdit[]) {
					result.edits.push({
						_type: 2, // Type 'File'
						oldUri: edit.oldUri
							? UriConverter.fromApi(edit.oldUri)
							: undefined,
						newUri: edit.newUri
							? UriConverter.fromApi(edit.newUri)
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
	 * Revives a WorkspaceEdit DTO back into a `vscode.WorkspaceEdit` class instance.
	 */
	export const toApi = (
		dto: ExtHostProtocol.IWorkspaceEditDto,
	): Vscode.WorkspaceEdit => {
		const result = new ExtHostTypes.WorkspaceEdit();
		for (const edit of dto.edits) {
			switch (edit._type) {
				case 1: // Text Edit
					const uri = UriConverter.toApi(edit.resource);
					const textEdits = (
						edit as ExtHostProtocol.IWorkspaceTextEditDto
					).edit.map(TextEditConverter.toApi);
					result.set(uri, textEdits);
					break;
				case 2: // File Edit
					const fileEdit =
						edit as ExtHostProtocol.IWorkspaceFileEditDto;
					if (fileEdit.oldUri && fileEdit.newUri) {
						result.renameFile(
							UriConverter.toApi(fileEdit.oldUri),
							UriConverter.toApi(fileEdit.newUri),
							fileEdit.options,
						);
					} else if (fileEdit.newUri) {
						result.createFile(
							UriConverter.toApi(fileEdit.newUri),
							fileEdit.options,
						);
					} else if (fileEdit.oldUri) {
						result.deleteFile(
							UriConverter.toApi(fileEdit.oldUri),
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
