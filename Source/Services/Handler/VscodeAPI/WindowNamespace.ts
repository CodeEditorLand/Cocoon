/**
 * @module Handler/VscodeAPI/WindowNamespace
 * @description
 * Factory for the vscode.window namespace shim.
 * Provides: showInformationMessage, showErrorMessage, showWarningMessage,
 * createTerminal, createStatusBarItem, createOutputChannel, withProgress,
 * onDidChange* events, activeTextEditor, visibleTextEditors.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateWindowNamespace = (
	Context: HandlerContext,
) => ({
	showInformationMessage: async (Message: string, ...Items: unknown[]) => {
		Context.SendToMountain("window.showMessage", { message: Message, level: "info", items: Items }).catch(() => {});
		return undefined;
	},
	showErrorMessage: async (Message: string, ...Items: unknown[]) => {
		Context.SendToMountain("window.showMessage", { message: Message, level: "error", items: Items }).catch(() => {});
		return undefined;
	},
	showWarningMessage: async (Message: string, ...Items: unknown[]) => {
		Context.SendToMountain("window.showMessage", { message: Message, level: "warn", items: Items }).catch(() => {});
		return undefined;
	},
	createTerminal: () => ({ sendText: async () => {}, show: () => {}, hide: () => {}, dispose: () => {} }),
	createStatusBarItem: () => ({ show: () => {}, hide: () => {}, dispose: () => {}, text: "", tooltip: "" }),
	createOutputChannel: () => ({ append: () => {}, appendLine: () => {}, clear: () => {}, show: () => {}, hide: () => {}, dispose: () => {} }),
	withProgress: async (_Option: unknown, Task: any) => Task({ report: () => {} }),
	onDidChangeActiveTextEditor: () => ({ dispose: () => {} }),
	onDidChangeVisibleTextEditors: () => ({ dispose: () => {} }),
	onDidChangeTextEditorSelection: () => ({ dispose: () => {} }),
	onDidChangeTextEditorVisibleRanges: () => ({ dispose: () => {} }),
	activeTextEditor: undefined,
	visibleTextEditors: [],
});

export default CreateWindowNamespace;
