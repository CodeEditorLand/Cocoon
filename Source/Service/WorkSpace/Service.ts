/*
 * File: Cocoon/Source/Service/WorkSpace/Service.ts
 * Responsibility: Defines the contract for the WorkSpace service.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: effect, vscode
 * Export: WorkSpaceService
 */

/**
 * @module Service (WorkSpace)
 * @description Defines the interface and `Context.Tag` for the WorkSpace service.
 * This service provides an abstraction over `vscode.workspace` to be used
 * within the application's dependency injection system. It focuses purely on
 * workspace-related functionalities, ensuring a clean and decoupled architecture.
 *
 * Consumers that require access to text documents or editors should depend on
 * the respective services for those concerns.
 */

import { Context, type Effect } from "effect";
import type {
	CancellationToken,
	Event,
	FileSystem,
	GlobPattern,
	TextDocument,
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

		readonly applyEdit: (
			edit: WorkspaceEdit,
		) => Effect.Effect<boolean, Error>;

		readonly fs: FileSystem;
	}
>() {}
