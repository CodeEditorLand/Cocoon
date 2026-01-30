/**
 * @module Workspace
 * @description
 * Implements the VS Code API surface for workspace-level operations.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/api/common/extHostWorkspace.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/WorkSpace.ts (borrowed working patterns)
 * - Mountain Integration: Delegates workspace operations via gRPC to backend
 *
 * Dependencies:
 * - IPCService: For communicating with Mountain (main thread equivalent)
 * - ConfigurationService: For workspace configuration management
 * - DocumentService: For text document operations
 * - LoggerService: For operation logging
 *
 * TODOs:
 * - PRIORITY-1: Implement workspace configuration synchronization with Mountain
 * - PRIORITY-1: Add workspace state persistence and recovery
 * - PRIORITY-2: Implement file system operations (findFiles, findTextInFiles)
 * - PRIORITY-2: Complete workspace edit application with delta calculation
 * - PRIORITY-2: Implement text document content provider registration
 * - PRIORITY-3: Collaborative editing support with multiple cursors
 * - ARCHITECTURE-PATTERN: src/vs/workbench/api/browser/mainThreadWorkspace.ts (Mountain side needed)
 * - VSCODE-LIFT: src/vs/workbench/api/common/extHostWorkspace.ts (complete workspace API)
 */
import { Effect } from "effect";
import type * as VSCode from "vscode";
/**
 * @interface Workspace
 * @description
 * The contract for the Workspace service, mirroring `vscode.workspace` API surface
 * with Effect-TS integration.
 *
 * Specification: src/vs/workbench/api/common/extHostWorkspace.ts (ExtHostWorkspaceShape)
 */
export interface Workspace {
    readonly name: string | undefined;
    readonly workspaceFile: VSCode.Uri | undefined;
    readonly workspaceFolders: readonly VSCode.WorkspaceFolder[] | undefined;
    readonly isTrusted: boolean;
    readonly activeTextEditor: VSCode.TextEditor | undefined;
    readonly visibleTextEditors: readonly VSCode.TextEditor[];
    readonly GetWorkspaceFolder: (uri: VSCode.Uri) => VSCode.WorkspaceFolder | undefined;
    readonly FindFiles: (include: VSCode.GlobPattern, exclude?: VSCode.GlobPattern | null, maxResults?: number) => Effect.Effect<VSCode.Uri[], Error>;
    readonly FindTextInFiles: (query: VSCode.TextSearchQuery, options?: VSCode.FindTextInFilesOptions) => Effect.Effect<VSCode.Uri[] | null, Error>;
    readonly OpenTextDocument: (uriOrOptions?: VSCode.Uri | {
        language?: string;
        content?: string;
    }) => Effect.Effect<VSCode.TextDocument, Error>;
    readonly SaveAll: (includeUntitled?: boolean) => Effect.Effect<boolean, Error>;
    readonly ApplyEdit: (edit: VSCode.WorkspaceEdit) => Effect.Effect<boolean, Error>;
    readonly GetConfiguration: (section?: string, scope?: VSCode.ConfigurationScope | null) => VSCode.WorkspaceConfiguration;
    readonly OnDidChangeWorkspaceFolders: VSCode.Event<VSCode.WorkspaceFoldersChangeEvent>;
    readonly OnDidChangeActiveTextEditor: VSCode.Event<VSCode.TextEditor | undefined>;
    readonly OnDidChangeVisibleTextEditors: VSCode.Event<readonly VSCode.TextEditor[]>;
    readonly OnDidChangeTextDocument: VSCode.Event<VSCode.TextDocumentChangeEvent>;
    readonly OnDidChangeConfiguration: VSCode.Event<VSCode.ConfigurationChangeEvent>;
}
declare const WorkspaceService_base: Effect.Service.Class<WorkspaceService, "Service/Workspace", {
    readonly effect: Effect.Effect<Workspace, unknown, unknown>;
}>;
/**
 * @class WorkspaceService
 * @description
 * The Effect-TS service for the Workspace service. Manages workspace state,
 * folder structure, configuration, and file operations by delegating to
 * Mountain's backend implementation.
 *
 * Architecture Pattern: src/vs/workbench/api/common/extHostWorkspace.ts (ExtHostWorkspace)
 * Implementation: Effect-TS service with Ref-based state management
 *
 * TODOs:
 * - PERFORMANCE: Track workspace operations latency
 * - PERSISTENCE: Save and restore workspace state
 * - DELTA-CALCULATION: Optimize workspace folder change detection
 * - TELEMETRY: Track workspace usage patterns
 * - SYNC: Implement bidirectional configuration sync with Mountain
 */
export declare class WorkspaceService extends WorkspaceService_base {
}
/**
 * Workspace interface compatible with public VSCode API
 * This is what extensions see when they access vscode.workspace
 *
 * TODO: Implement this as a namespace factory in APIFactoryService
 */
export interface VSCodeWorkspaceAPI {
    readonly name: string;
    readonly workspaceFile: VSCode.Uri | undefined;
    readonly workspaceFolders: readonly VSCode.WorkspaceFolder[] | undefined;
    readonly rootPath: string | undefined;
    readonly isTrusted: boolean;
    readonly onDidChangeWorkspaceFolders: VSCode.Event<VSCode.WorkspaceFoldersChangeEvent>;
    readonly onDidChangeActiveTextEditor: VSCode.Event<VSCode.TextEditor | undefined>;
    readonly onDidChangeVisibleTextEditors: VSCode.Event<readonly VSCode.TextEditor[]>;
    readonly onDidChangeTextDocument: VSCode.Event<VSCode.TextDocumentChangeEvent>;
    readonly onDidChangeConfiguration: VSCode.Event<VSCode.ConfigurationChangeEvent>;
    getWorkspaceFolder(uri: VSCode.Uri): VSCode.WorkspaceFolder | undefined;
    findFiles(include: VSCode.GlobPattern, exclude?: VSCode.GlobPattern | null, maxResults?: number): Thenable<VSCode.Uri[]>;
    findTextInFiles(query: VSCode.TextSearchQuery, options?: VSCode.FindTextInFilesOptions): Thenable<VSCode.Uri[]>;
    openTextDocument(uriOrOptions?: VSCode.Uri | {
        language?: string;
        content?: string;
    }): Thenable<VSCode.TextDocument>;
    saveAll(includeUntitled?: boolean): Thenable<boolean>;
    applyEdit(edit: VSCode.WorkspaceEdit): Thenable<boolean>;
    getConfiguration(section?: string, scope?: VSCode.ConfigurationScope | null): VSCode.WorkspaceConfiguration;
}
export {};
//# sourceMappingURL=Workspace.d.ts.map