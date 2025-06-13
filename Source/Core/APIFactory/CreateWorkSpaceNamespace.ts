/**
 * @module CreateWorkSpaceNamespace
 * @description Constructs the `vscode.workspace` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type * as Service from "../../Service.js";

/**
 * Creates the `vscode.workspace` namespace object.
 *
 * This factory function takes the central `WorkSpaceService` and `APIDeprecationService`
 * to construct the object exposed to extensions. It handles delegation of properties,
 * methods, and events, including the special handling of deprecated properties like `rootPath`.
 *
 * @param WorkSpaceService The central service for workspace management.
 * @param DeprecationService The service for reporting deprecated API usage.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.workspace` API.
 */
export function CreateWorkSpaceNamespace(
	WorkSpaceService: Service.WorkSpace.Interface,
	DeprecationService: Service.APIDeprecation.Interface,
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.workspace {
	const workspace: any = {
		// --- Properties ---
		get workspaceFolders() {
			return WorkSpaceService.workspaceFolders;
		},
		get name() {
			return WorkSpaceService.name;
		},
		get workspaceFile() {
			return WorkSpaceService.workspaceFile;
		},
		get isTrusted() {
			return WorkSpaceService.isTrusted;
		},
		get fs() {
			return WorkSpaceService.fs;
		},
		get textDocuments() {
			return WorkSpaceService.textDocuments;
		},

		// --- Deprecated rootPath ---
		get rootPath() {
			Effect.runFork(
				DeprecationService.Report(
					Extension.identifier,
					"workspace.rootPath",
					"Use `workspace.workspaceFolders` instead.",
				),
			);
			const folders = WorkSpaceService.workspaceFolders;
			return folders && folders.length > 0
				? folders[0].uri.fsPath
				: undefined;
		},

		// --- Events ---
		onDidChangeWorkspaceFolders: AsEvent(
			WorkSpaceService.onDidChangeWorkspaceFolders,
		),
		onDidOpenTextDocument: AsEvent(WorkSpaceService.onDidOpenTextDocument),
		onDidCloseTextDocument: AsEvent(
			WorkSpaceService.onDidCloseTextDocument,
		),
		onDidChangeTextDocument: AsEvent(
			WorkSpaceService.onDidChangeTextDocument,
		),
		// onDidSaveTextDocument, onWillSaveTextDocument, etc. would follow the same pattern

		// --- Methods ---
		getWorkspaceFolder: (uri: VSCode.Uri) => {
			return WorkSpaceService.getWorkspaceFolder(uri);
		},
		openTextDocument: (uriOrOptions: any) => {
			return Effect.runPromise(
				WorkSpaceService.openTextDocument(uriOrOptions),
			);
		},
		findFiles: (include, exclude, maxResults, token) => {
			return Effect.runPromise(
				WorkSpaceService.findFiles(include, exclude, maxResults, token),
			);
		},
		getConfiguration: (section, scope) => {
			return WorkSpaceService.getConfiguration(section, scope);
		},
		applyEdit: (edit: VSCode.WorkspaceEdit) => {
			// This would be delegated to a workspace edit service
			return Promise.resolve(false);
		},
		registerTextDocumentContentProvider: (scheme, provider) => {
			// This would be delegated to the document content provider service
			return new ExtHostTypes.Disposable(() => {});
		},
	};

	return workspace;
}
