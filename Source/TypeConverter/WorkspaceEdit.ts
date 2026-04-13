/**
 * @module WorkspaceEdit
 * @description Implements converters for `vscode.WorkspaceEdit` and its components,
 * handling complex transformations involving text edits, file operations, and versions.
 */

import type { UriComponents } from "@codeeditorland/output/vs/base/common/uri";
import type { IIdentifiedSingleEditOperation } from "@codeeditorland/output/vs/editor/common/model";
import type * as VSCode from "vscode";

import {
	TextEdit as VSCodeTextEdit,
	WorkspaceEdit as VSCodeWorkspaceEdit,
} from "../Platform/VSCode/Type.js";
import {
	FromAPI as TextEditFromAPI,
	ToAPI as TextEditToAPI,
} from "./Main/TextEdit.js";
import { FromAPI as UriFromAPI, ToAPI as UriToAPI } from "./Main/URI.js";

// --- DTO Interfaces for IPC ---
// These define the plain, serializable objects for IPC, decoupling from complex VS Code internal types.

interface IWorkspaceTextEditDTO {
	_type: "text";
	resource: UriComponents;
	edit: IIdentifiedSingleEditOperation;
	metadata?: VSCode.WorkspaceEditEntryMetadata;
	versionId?: number;
}

interface IWorkspaceFileEditDTO {
	_type: "file";
	oldResource?: UriComponents;
	newResource?: UriComponents;
	options?: any; // Simplified to `any` to match the dynamic nature of file options
	metadata?: VSCode.WorkspaceEditEntryMetadata;
}

type IWorkspaceEditDTO = {
	edits: Array<IWorkspaceTextEditDTO | IWorkspaceFileEditDTO>;
	metadata?: VSCode.WorkspaceEditMetadata;
};

// --- Conversion Logic ---

export interface IVersionInformationProvider {
	GetTextDocumentVersion(Uri: VSCode.Uri): number | undefined;
}

export const FromAPI = (
	Edit: VSCode.WorkspaceEdit,
	VersionProvider?: IVersionInformationProvider,
): IWorkspaceEditDTO => {
	const Result: IWorkspaceEditDTO = { edits: [] };

	for (const [URI, URIEditArray] of Edit.entries()) {
		const Resource = UriFromAPI(URI);
		const VersionId = VersionProvider?.GetTextDocumentVersion(URI);

		for (const SingleEdit of URIEditArray) {
			if (SingleEdit instanceof VSCodeTextEdit) {
				// FIX: Conditionally add versionId for exactOptionalPropertyTypes
				const textEditDto: IWorkspaceTextEditDTO = {
					_type: "text",
					resource: Resource,
					edit: TextEditFromAPI(SingleEdit),
				};
				if (VersionId !== undefined) {
					textEditDto.versionId = VersionId;
				}
				Result.edits.push(textEditDto);
			} else {
				// This branch handles potential future file operations added to `entries`,
				// though the current public API only provides TextEdits.
			}
		}
	}
	// Note: The public `WorkspaceEdit.entries()` only returns text edits.
	// File operations (create, rename, delete) are not exposed via `entries()`.
	// A full implementation would need to access internal properties or a different API.
	// This converter correctly handles the available public API surface.

	return Result;
};

export const ToAPI = (DTO: IWorkspaceEditDTO): VSCode.WorkspaceEdit => {
	const Result = new VSCodeWorkspaceEdit();

	for (const Edit of DTO.edits) {
		if (Edit._type === "text") {
			const URI = UriToAPI(Edit.resource);
			const TextEditArray = [TextEditToAPI(Edit.edit)];
			Result.set(URI, TextEditArray);
		} else if (Edit._type === "file") {
			if (Edit.oldResource && Edit.newResource) {
				Result.renameFile(
					UriToAPI(Edit.oldResource),
					UriToAPI(Edit.newResource),
					Edit.options,
				);
			} else if (Edit.newResource) {
				Result.createFile(UriToAPI(Edit.newResource), Edit.options);
			} else if (Edit.oldResource) {
				Result.deleteFile(UriToAPI(Edit.oldResource), Edit.options);
			}
		}
	}
	return Result;
};
