/**
 * @module TypeConverter
 * @description This module is the main entry point for all type converter modules.
 * It re-exports all specific converter namespaces, providing a single, consolidated
 * import point for services that need to marshal or unmarshal data for IPC.
 *
 * Each exported namespace contains functions for marshalling rich `vscode` objects
 * into plain DTOs and unmarshalling DTOs back into `vscode` class instances.
 */

export * as CodeAction from "./TypeConverter/CodeAction.js";
export * as Command from "./TypeConverter/Command.js";
export * as Completion from "./TypeConverter/Completion.js";
export * as Diagnostic from "./TypeConverter/Diagnostic.js";
export * as Dialog from "./TypeConverter/Dialog.js";
export * as Hover from "./TypeConverter/Hover.js";
export * as Main from "./TypeConverter/Main.js";
export * as Notebook from "./TypeConverter/Notebook.js";
export * as QuickInput from "./TypeConverter/QuickInput.js";
export * as StatusBar from "./TypeConverter/StatusBar.js";
export * as Task from "./TypeConverter/Task.js";
export * as TreeView from "./TypeConverter/TreeView.js";
export * as WebView from "./TypeConverter/WebView.js";
export * as WorkSpaceEdit from "./TypeConverter/WorkSpaceEdit.js";

// Re-exporting specific converters from Main for convenience
export {
	URI as URIConverter,
	Position as PositionConverter,
	Range as RangeConverter,
	Selection as SelectionConverter,
	Location as LocationConverter,
	TextEdit as TextEditConverter,
	MarkdownString as MarkdownStringConverter,
	ViewColumn as ViewColumnConverter,
} from "./TypeConverter/Main.js";
