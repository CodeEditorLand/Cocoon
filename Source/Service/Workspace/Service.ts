/**
 * @module Service (Workspace)
 * @description Defines the interface and Context.Tag for the Workspace service.
 * This is a simplified version of `vscode.workspace` for internal composition.
 */

import { Context, Effect, Stream } from "effect";
import type {
	FileSystem,
	TextDocument,
	TextDocumentChangeEvent,
	Uri,
	WorkspaceConfiguration,
	WorkspaceFolder,
	WorkspaceFoldersChangeEvent,
} from "vscode";

export interface Interface {
	readonly name: string | undefined;
	readonly workspaceFile: Uri | undefined;
	readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
	readonly isTrusted: boolean;
	readonly onDidChangeWorkspaceFolders: Stream.Stream<
		WorkspaceFoldersChangeEvent,
		never
	>;

	readonly getWorkspaceFolder: (
		uri: Uri,
	) => Effect.Effect<WorkspaceFolder | undefined, never>;
	readonly findFiles: (
		include: any,
		exclude?: any,
		maxResults?: any,
		token?: any,
	) => Effect.Effect<Uri[], Error>;
	readonly openTextDocument: (
		options?: any,
	) => Effect.Effect<TextDocument, Error>;
	readonly getConfiguration: (
		section?: string,
		scope?: any,
	) => Effect.Effect<WorkspaceConfiguration, Error>;
	readonly fs: FileSystem;

	readonly textDocuments: readonly TextDocument[];
	readonly onDidOpenTextDocument: Stream.Stream<TextDocument, never>;
	readonly onDidCloseTextDocument: Stream.Stream<TextDocument, never>;
	readonly onDidChangeTextDocument: Stream.Stream<
		TextDocumentChangeEvent,
		never
	>;
}

export const Tag = Context.Tag<Interface>("Service/Workspace");
