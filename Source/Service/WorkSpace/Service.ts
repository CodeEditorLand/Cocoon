/*
 * File: Cocoon/Source/Service/WorkSpace/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:08 UTC
 * Dependency: effect
 * Export: WorkSpaceService
 */

/**
 * @module Service (WorkSpace)
 * @description Defines the interface and `Context.Tag` for the WorkSpace service.
 * This service provides an abstraction over `vscode.workspace` and now also includes
 * editor state management, ensuring a clean and decoupled architecture.
 */

import { Context, type Effect } from "effect";
import type {
	CancellationToken,
	Event,
	FileSystem,
	GlobPattern,
	TextDocument,
	TextEditor,
	TextEditorOptionsChangeEvent,
	TextEditorSelectionChangeEvent,
	TextEditorViewColumnChangeEvent,
	TextEditorVisibleRangesChangeEvent,
	Uri,
	WorkspaceConfiguration,
	WorkspaceEdit,
	WorkspaceFolder,
	WorkspaceFoldersChangeEvent,
} from "vscode";

export default class WorkSpaceService extends Context.Tag("Service/WorkSpace")<
	WorkSpaceService,
	{
		// --- Workspace Properties ---
		readonly name: string | undefined;
		readonly workspaceFile: Uri | undefined;
		readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
		readonly isTrusted: boolean;
		readonly onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;

		// --- Editor State Properties ---
		readonly activeTextEditor: TextEditor | undefined;
		readonly visibleTextEditors: readonly TextEditor[];
		readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
		readonly onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;
		readonly onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>;
		readonly onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent>;
		readonly onDidChangeTextEditorOptions: Event<TextEditorOptionsChangeEvent>;
		readonly onDidChangeTextEditorViewColumn: Event<TextEditorViewColumnChangeEvent>;

		// --- Methods ---
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
		readonly applyEdit: (
			edit: WorkspaceEdit,
		) => Effect.Effect<boolean, Error>;
		readonly fs: FileSystem;
		readonly registerTextDocumentContentProvider: (
			scheme: string,
			provider: any,
		) => any;
	}
>() {}
