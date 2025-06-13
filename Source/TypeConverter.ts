/**
 * @module TypeConverter
 * @description This module is the main entry point for all type converter modules.
 * It re-exports all specific converter namespaces, providing a single, consolidated
 * import point for services that need to marshal or unmarshal data for IPC.
 *
 * Each exported namespace contains functions like `fromApi` (to serialize rich
 * `vscode` objects into plain DTOs) and `toApi` (to revive DTOs back into
 * `vscode` class instances).
 */

export * as CodeAction from "./CodeAction.js";
export * as Commands from "./Commands.js";
export * as Completion from "./Completion.js";
export * as Diagnostic from "./Diagnostic.js";
export * as Dialog from "./Dialog.js";
export * as Hover from "./Hover.js";
export * as Main from "./Main.js";
export * as Notebook from "./Notebook.js";
export * as QuickInput from "./QuickInput.js";
export * as StatusBar from "./StatusBar.js";
export * as Task from "./Task.js";
export * as TreeView from "./TreeView.js";
export * as Webview from "./Webview.js";
export * as WorkspaceEdit from "./WorkspaceEdit.js";

// Re-exporting specific converters from Main for convenience
export {
	Uri as UriConverter,
	Position as PositionConverter,
	Range as RangeConverter,
	Selection as SelectionConverter,
	Location as LocationConverter,
	TextEdit as TextEditConverter,
	MarkdownString as MarkdownStringConverter,
	ViewColumn as ViewColumnConverter,
} from "./Main.js";
