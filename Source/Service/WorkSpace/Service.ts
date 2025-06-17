/*
 * File: Cocoon/Source/Service/WorkSpace/Service.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: effect
 * Export: WorkSpaceService
 */

/**
 * @module Service (WorkSpace)
 * @description Defines the interface and Context.Tag for the WorkSpace service.
 * This is a simplified version of `vscode.workspace` for internal composition.
 */

import { Context, type Effect } from "effect";
import type {
	CancellationToken,
	Event,
	FileSystem,
	GlobPattern,
	TextDocument,
	TextDocumentChangeEvent,
	TextEditor,
	Uri,
	WorkspaceConfiguration,
	WorkspaceEdit,
	WorkspaceFolder,
	WorkspaceFoldersChangeEvent,
} from "vscode";

export default class WorkSpaceService extends Context.Tag("Service/WorkSpace")<
	WorkSpaceService,
	{
		readonly name: string | undefined;
		readonly workspaceFile: Uri | undefined;
		readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
		readonly isTrusted: boolean;
		readonly onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;

		readonly getWorkspaceFolder: (uri: Uri) => WorkspaceFolder | undefined;

		readonly findFiles: (
			include: GlobPattern,
			exclude?: GlobPattern | null,
			maxResults?: number,
			token?: CancellationToken,
		) => Effect.Effect<Uri[], Error>;

		readonly openTextDocument: (
			options?: any,
		) => Effect.Effect<TextDocument, Error>;

		readonly getConfiguration: (
			section?: string,
			scope?: any,
		) => Effect.Effect<WorkspaceConfiguration, Error>;

		readonly applyEdit: (edit: WorkspaceEdit) => Promise<boolean>;

		readonly fs: FileSystem;

		// Delegated from Document & Window services for convenience
		readonly textDocuments: readonly TextDocument[];
		readonly onDidOpenTextDocument: Event<TextDocument>;
		readonly onDidCloseTextDocument: Event<TextDocument>;
		readonly onDidChangeTextDocument: Event<TextDocumentChangeEvent>;
		readonly activeTextEditor: TextEditor | undefined;
		readonly visibleTextEditors: readonly TextEditor[];
		readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
		readonly onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;
		readonly findTextEditorById: (id: string) => TextEditor | undefined;
	}
>() {}
