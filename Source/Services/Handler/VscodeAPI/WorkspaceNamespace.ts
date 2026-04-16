/**
 * @module Handler/VscodeAPI/WorkspaceNamespace
 * @description
 * Factory for the vscode.workspace namespace shim.
 * Provides: workspaceFolders, getConfiguration, findFiles,
 * openTextDocument, onDidOpen/Close/Change/Save TextDocument,
 * onDidChangeConfiguration, onDidChangeWorkspaceFolders, fs.*.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateWorkspaceNamespace = (
	Context: HandlerContext,
) => ({
	workspaceFolders: [],
	getConfiguration: () => ({
		get: (_Key: string, DefaultValue?: unknown) => DefaultValue,
		update: async () => {},
		has: () => false,
		inspect: () => undefined,
	}),
	findFiles: async () => [],
	openTextDocument: async (Uri: any) => ({
		getText: () => "",
		uri: Uri,
		languageId: "plaintext",
		lineCount: 0,
		fileName: "",
	}),
	onDidOpenTextDocument: (Listener: (...Arguments: any[]) => any) => {
		Context.WorkspaceEventEmitter.on("didOpenTextDocument", Listener);
		return { dispose: () => { Context.WorkspaceEventEmitter.removeListener("didOpenTextDocument", Listener); } };
	},
	onDidCloseTextDocument: (Listener: (...Arguments: any[]) => any) => {
		Context.WorkspaceEventEmitter.on("didCloseTextDocument", Listener);
		return { dispose: () => { Context.WorkspaceEventEmitter.removeListener("didCloseTextDocument", Listener); } };
	},
	onDidChangeTextDocument: (Listener: (...Arguments: any[]) => any) => {
		Context.WorkspaceEventEmitter.on("didChangeTextDocument", Listener);
		return { dispose: () => { Context.WorkspaceEventEmitter.removeListener("didChangeTextDocument", Listener); } };
	},
	onDidSaveTextDocument: (Listener: (...Arguments: any[]) => any) => {
		Context.WorkspaceEventEmitter.on("didSaveTextDocument", Listener);
		return { dispose: () => { Context.WorkspaceEventEmitter.removeListener("didSaveTextDocument", Listener); } };
	},
	onDidChangeConfiguration: () => ({ dispose: () => {} }),
	onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
	fs: {
		stat: async () => ({ type: 1, size: 0, ctime: 0, mtime: 0 }),
		readFile: async () => new Uint8Array(),
		writeFile: async () => {},
		readDirectory: async () => [],
		createDirectory: async () => {},
		delete: async () => {},
		rename: async () => {},
	},
});

export default CreateWorkspaceNamespace;
