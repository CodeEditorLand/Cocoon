

/**
 * @module CreateWorkSpaceNamespace
 * @description Constructs the `vscode.workspace` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import { Disposable } from "vscode";

import type APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import type DocumentService from "../../Service/Document/Service.js"; // Import DocumentService
import type WorkSpaceService from "../../Service/WorkSpace/Service.js";

/**
 * Creates the `vscode.workspace` namespace object.
 *
 * This factory function takes the central `WorkSpaceService` and constructs
 * the object exposed to extensions. Its methods now return `Effect`s.
 *
 * @param WorkSpace The central service for workspace management.
 * @param Document The central service for document management.
 * @param Deprecation The service for reporting deprecated API usage.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.workspace` API.
 */
const CreateWorkSpaceNamespace = (
	WorkSpace: WorkSpaceService["Type"],
	Document: DocumentService["Type"],
	Deprecation: APIDeprecationService["Type"],
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.workspace => {
	const WorkspaceNamespace: typeof VSCode.workspace = {
		// --- Properties ---
		get workspaceFolders() {
			return WorkSpace.workspaceFolders;
		},
		get name() {
			return WorkSpace.name;
		},
		get workspaceFile() {
			return WorkSpace.workspaceFile;
		},
		get isTrusted() {
			return WorkSpace.isTrusted;
		},
		get fs() {
			return WorkSpace.fs;
		},
		// The `textDocuments` property correctly belongs to the Document service.
		get textDocuments() {
			return Document.TextDocuments;
		},

		// --- Deprecated rootPath ---
		get rootPath() {
			// This side-effecting log is a necessary evil for a synchronous getter.
			Effect.runFork(
				Deprecation.Report(
					Extension.identifier,
					"workspace.rootPath",
					"Use `workspace.workspaceFolders` instead.",
				),
			);
			const Folders = WorkSpace.workspaceFolders;
			return Folders && Folders.length > 0
				? Folders[0].uri.fsPath
				: undefined;
		},

		// --- Events ---
		onDidChangeWorkspaceFolders: AsEvent(
			WorkSpace.onDidChangeWorkspaceFolders,
		),
		// Document events correctly come from the Document service.
		onDidOpenTextDocument: AsEvent(Document.onDidOpenTextDocument),
		onDidCloseTextDocument: AsEvent(Document.onDidCloseTextDocument),
		onDidChangeTextDocument: AsEvent(Document.onDidChangeTextDocument),

		// --- Methods (now return Effects) ---
		getWorkspaceFolder: (Uri: VSCode.Uri) => {
			return WorkSpace.getWorkspaceFolder(Uri);
		},
		openTextDocument: (UriOrOptions: any) =>
			WorkSpace.openTextDocument(UriOrOptions) as any,
		findFiles: (Include, Exclude, MaxResults, Token) =>
			WorkSpace.findFiles(Include, Exclude, MaxResults, Token) as any,
		getConfiguration: (Section, Scope) =>
			WorkSpace.getConfiguration(Section, Scope) as any,
		applyEdit: (Edit: VSCode.WorkspaceEdit) =>
			WorkSpace.applyEdit(Edit) as any,
		registerTextDocumentContentProvider: (_Scheme, _Provider) => {
			return new Disposable(() => {}); // Stub
		},
	} as unknown as typeof VSCode.workspace;

	return WorkspaceNamespace;
};

export default CreateWorkSpaceNamespace;
