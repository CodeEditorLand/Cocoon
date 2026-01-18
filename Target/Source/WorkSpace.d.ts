/**
 * @module WorkSpace
 * @description Defines the service that implements the `vscode.workspace` API.
 * It manages and exposes workspace-level state (e.g., folders, name) and editor state,
 * orchestrating complex operations like finding files and applying edits.
 */
import { Effect } from "effect";
import type { CancellationToken, ConfigurationScope, Disposable, Event, GlobPattern, TextDocument, TextDocumentContentProvider, TextEditor, TextEditorOptionsChangeEvent, TextEditorSelectionChangeEvent, TextEditorViewColumnChangeEvent, TextEditorVisibleRangesChangeEvent, Uri, FileSystem as VSCodeFileSystem, WorkspaceConfiguration, WorkspaceEdit, WorkspaceFolder, WorkspaceFoldersChangeEvent } from "vscode";
/**
 * @interface WorkSpace
 * @description The contract for the WorkSpace service, mirroring `vscode.workspace`.
 */
export interface WorkSpace {
    readonly name: string | undefined;
    readonly workspaceFile: Uri | undefined;
    readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
    readonly isTrusted: boolean;
    readonly fs: VSCodeFileSystem;
    readonly activeTextEditor: TextEditor | undefined;
    readonly visibleTextEditors: readonly TextEditor[];
    readonly onDidChangeWorkspaceFolders: Event<WorkspaceFoldersChangeEvent>;
    readonly onDidChangeActiveTextEditor: Event<TextEditor | undefined>;
    readonly onDidChangeVisibleTextEditors: Event<readonly TextEditor[]>;
    readonly getWorkspaceFolder: (uri: Uri) => WorkspaceFolder | undefined;
    readonly findFiles: (include: GlobPattern, exclude?: GlobPattern | null, maxResults?: number, token?: CancellationToken) => Effect.Effect<Uri[], Error>;
    readonly openTextDocument: (uriOrOptions?: Uri | {
        language?: string;
        content?: string;
    }) => Effect.Effect<TextDocument, Error>;
    readonly getConfiguration: (section?: string, scope?: ConfigurationScope | null) => Effect.Effect<WorkspaceConfiguration, Error>;
    readonly applyEdit: (edit: WorkspaceEdit) => Effect.Effect<boolean, Error>;
    readonly registerTextDocumentContentProvider: (scheme: string, provider: TextDocumentContentProvider) => Disposable;
    readonly onDidChangeTextEditorSelection: Event<TextEditorSelectionChangeEvent>;
    readonly onDidChangeTextEditorVisibleRanges: Event<TextEditorVisibleRangesChangeEvent>;
    readonly onDidChangeTextEditorOptions: Event<TextEditorOptionsChangeEvent>;
    readonly onDidChangeTextEditorViewColumn: Event<TextEditorViewColumnChangeEvent>;
}
declare const WorkSpaceService_base: Effect.Service.Class<WorkSpaceService, "Service/WorkSpace", {
    readonly effect: Effect.Effect<WorkSpace, never, any>;
}>;
/**
 * @class WorkSpaceService
 * @description The `Effect.Service` for the `vscode.workspace` API.
 */
export declare class WorkSpaceService extends WorkSpaceService_base {
}
export {};
//# sourceMappingURL=WorkSpace.d.ts.map