/*
 * File: Cocoon/Source/Service/WorkSpace/Service.ts
 * Role: Defines the interface and Effect.Service for the Workspace service.
 * Responsibilities:
 *   - Declare the contract for the service that provides an abstraction over
 *     `vscode.workspace` and manages the state of the active editor.
 *   - Provide the `Effect.Service` class for dependency injection.
 */

import { Effect } from "effect";
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

/**
 * The `Effect.Service` for the Workspace service.
 *
 * This is a high-level service that aggregates workspace-related information
 * (folders, name, configuration) and the state of the visible text editors.
 * It provides a unified API surface similar to `vscode.workspace`.
 */
export class Workspace extends Effect.Service<Workspace>("Service/WorkSpace")<{
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
	readonly applyEdit: (edit: WorkspaceEdit) => Effect.Effect<boolean, Error>;
	readonly fs: FileSystem;
	readonly registerTextDocumentContentProvider: (
		scheme: string,
		provider: any,
	) => any;
}>() {}
