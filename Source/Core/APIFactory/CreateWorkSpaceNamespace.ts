/*
 * File: Cocoon/Source/Core/APIFactory/CreateWorkSpaceNamespace.ts
 * Responsibility: 
 * Modified: 2025-06-16 14:56:06 UTC
 * Dependency: ../../Service/APIDeprecation/Service.js, ../../Service/WorkSpace/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

/**
 * @module CreateWorkSpaceNamespace
 * @description Constructs the `vscode.workspace` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import { Disposable } from "vscode";

import type APIDeprecationService from "../../Service/APIDeprecation/Service.js";
import type WorkSpaceService from "../../Service/WorkSpace/Service.js";

/**
 * Creates the `vscode.workspace` namespace object.
 *
 * This factory function takes the central `WorkSpaceService` and `APIDeprecationService`
 * to construct the object exposed to extensions. It handles delegation of properties,
 * methods, and events, including the special handling of deprecated properties like `rootPath`.
 *
 * @param WorkSpace The central service for workspace management.
 * @param Deprecation The service for reporting deprecated API usage.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.workspace` API.
 */
const CreateWorkSpaceNamespace = (
	WorkSpace: WorkSpaceService["Type"],
	Deprecation: APIDeprecationService["Type"],
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.workspace => {
	const Workspace: typeof VSCode.workspace = {
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
		get textDocuments() {
			return WorkSpace.textDocuments;
		},

		// --- Deprecated rootPath ---
		get rootPath() {
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
		onDidOpenTextDocument: AsEvent(WorkSpace.onDidOpenTextDocument),
		onDidCloseTextDocument: AsEvent(WorkSpace.onDidCloseTextDocument),
		onDidChangeTextDocument: AsEvent(WorkSpace.onDidChangeTextDocument),
		// onDidSaveTextDocument, onWillSaveTextDocument, etc. would follow the same pattern

		// --- Methods ---
		getWorkspaceFolder: (Uri: VSCode.Uri) => {
			return WorkSpace.getWorkspaceFolder(Uri);
		},
		openTextDocument: (UriOrOptions: any) => {
			return Effect.runPromise(WorkSpace.openTextDocument(UriOrOptions));
		},
		findFiles: (Include, Exclude, MaxResults, Token) => {
			return Effect.runPromise(
				WorkSpace.findFiles(Include, Exclude, MaxResults, Token),
			);
		},
		getConfiguration: (Section, Scope) => {
			return Effect.runSync(WorkSpace.getConfiguration(Section, Scope));
		},
		applyEdit: (Edit: VSCode.WorkspaceEdit) => {
			return WorkSpace.applyEdit(Edit);
		},
		registerTextDocumentContentProvider: (_Scheme, _Provider) => {
			// This would be delegated to the document content provider service
			return new Disposable(() => {});
		},
	} as unknown as typeof VSCode.workspace;

	return Workspace;
};

export default CreateWorkSpaceNamespace;
