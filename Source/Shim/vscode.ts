/*---------------------------------------------------------------------------------------------
 * Cocoon VS Code API Shim Entry Point (vscode.ts)
 * --------------------------------------------------------------------------------------------
 * This file serves as the main module that extensions import or require as 'vscode'.
 * It aggregates and exports the various shimmed parts of the VS Code API,
 *
 *
 * such as `window`, `commands`, `workspace`, `languages`, core types (`Uri`, `Position`, etc.),
 *
 *
 * and enums.
 *
 * In a full VS Code ExtHost setup, this API object is dynamically constructed by an
 * ApiFactory that injects real ExtHost services. In Cocoon, this file (or one like it
 * populated by `index.ts`) manually assembles the API surface using the shims.
 *
 * Responsibilities:
 * - Exporting namespaces like `window`, `commands`, `workspace`, `languages`, `env`.
 * - Exporting core utility classes like `Uri`, `Position`, `Range`, `Selection`, `Location`,
 *
 *
 *   `Disposable`, `CancellationToken`, etc.
 * - Exporting enums like `FileType`, `DiagnosticSeverity`, `ExtensionKind`, etc.
 * - Ensuring that the exported API surface matches `vscode.d.ts` as closely as possible
 *   to provide a consistent experience for extensions.
 *
 * Key Interactions:
 * - This module is what extensions get when they `require('vscode')`.
 * - It imports and re-exports functionalities from various specific shim files
 *   (e.g., `commands-shim.ts`, `workspace-shim.ts`, `uri-shim.ts` or directly from
 *   VS Code's base libraries if bundled).
 * - The `index.ts` (Cocoon entry point) is responsible for instantiating the services/shims
 *   that this `vscode.ts` module will then expose.
 *--------------------------------------------------------------------------------------------*/

// --- Import Core VS Code API Types & Enums ---
// These should ideally come from a single, comprehensive vscode.d.ts-like source
// or be individually imported from their respective shims or VS Code base libraries.
// For Cocoon, these are likely coming from "../Shim/out/vscode.js" which is assumed to be generated.

// TODO: Ensure these imports provide the *actual classes and enums*, not just interfaces,

// where constructors or enum values are needed by extensions.
import {
	CallHierarchyItem,
	CancellationError,
	CancellationToken,
	CancellationTokenSource,
	// To avoid conflict
	CodeAction,
	CodeActionKind,
	CodeLens,
	CompletionItem,
	CompletionItemKind,
	CompletionList,
	CompletionTriggerKind,
	ConfigurationTarget,
	DebugConsoleMode,
	DefinitionLink,
	Diagnostic,
	DiagnosticRelatedInformation,
	DiagnosticSeverity,
	// VS Code's Emitter, not Node's
	Disposable,
	DocumentLink,
	EndOfLine,
	ExtensionKind,
	ExtensionMode,
	// TODO: Add many more classes: TreeItem, TreeDataProvider, DebugSession, Task, FileSystemError, etc.

	// Enums
	FileType,
	Hover,
	IndentAction,
	InputBoxOptions,
	LanguageStatusSeverity,
	Location,
	Position,
	ProgressLocation,
	QuickInputButtons,
	QuickPickItem,
	Range,
	// Class
	RelativePattern,
	Selection,
	SignatureHelp,
	SignatureHelpTriggerKind,
	SnippetString,
	StatusBarAlignment,
	SymbolInformation,
	SymbolKind,
	TaskScope,
	TextDocumentChangeReason,
	TextEdit,
	TextEditorRevealType,
	ThemeColor,
	ThemeIcon,
	TypeHierarchyItem,
	// Classes
	Uri,
	ViewColumn,
	Command as VscodeCommand,
	EventEmitter as VscodeEmitter,
	WorkspaceEdit,
	// TODO: Add many more enums
	// Interfaces (primarily for type checking, not usually constructed directly by extensions)
	// TextDocument, TextLine, OutputChannel, LogOutputChannel, StatusBarItem, Terminal,
	// WorkspaceFolder, WorkspaceConfiguration, SecretStorage, EnvironmentVariableCollection,
	// TODO: Add relevant interfaces
} from "../Shim/out/vscode";

// This is the assumed central export point for vscode API shims/types

// --- Import Shimmed API Implementations ---
// These are the instances of services that provide the *functionality* behind the API.
// They are typically instantiated in `index.ts` and then made available here.
// This file defines the API *surface*. How it's populated is tricky without DI at this exact spot.

// For a self-contained `vscode.ts` that doesn't rely on `index.ts` to pre-populate,

// it would need to instantiate shims here, which requires their dependencies.
// This becomes a mini DI setup.

// Alternative: `index.ts` creates an `apiInstances` object and passes it to this module,

// or this module exports a factory function that `index.ts` calls.

// For now, let's assume that `index.ts` will somehow make the instantiated services available,

// or we provide stubs here and `index.ts` patches them.
// The original JS `vscode.js` was very basic stubs. Let's expand on that concept but acknowledge
// the need for real instances.

// --- Placeholder for Instantiated Shim Services ---
// These would be set by `index.ts` or an API factory.
// TODO: Replace these stubs with actual instances provided by the Cocoon initialization process.
let commandsImpl: any = {
	registerCommand: (
		commandId: string,

		handler: (...args: any[]) => any,
	): Disposable => {
		console.warn(
			`[vscode.ts STUB] commands.registerCommand: "${commandId}"`,
		);

		return new Disposable(() => {});
	},

	executeCommand: async <T = unknown>(
		command: string,

		...rest: any[]
	): Promise<T | undefined> => {
		console.warn(`[vscode.ts STUB] commands.executeCommand: "${command}"`);

		return undefined;
	},

	getCommands: async (filterInternal?: boolean): Promise<string[]> => {
		console.warn(`[vscode.ts STUB] commands.getCommands`);

		return [];
	},
};

let windowImpl: any = {
	showInformationMessage: async (
		message: string,

		...args: any[]
	): Promise<any | undefined> => {
		console.warn(
			`[vscode.ts STUB] window.showInformationMessage: "${message}"`,
		);

		return undefined;
	},

	showWarningMessage: async (
		message: string,

		...args: any[]
	): Promise<any | undefined> => {
		console.warn(
			`[vscode.ts STUB] window.showWarningMessage: "${message}"`,
		);

		return undefined;
	},

	showErrorMessage: async (
		message: string,

		...args: any[]
	): Promise<any | undefined> => {
		console.warn(`[vscode.ts STUB] window.showErrorMessage: "${message}"`);

		return undefined;
	},

	createStatusBarItem: (
		alignment?: StatusBarAlignment,

		priority?: number,
	): /*StatusBarItem*/ any => {
		console.warn(`[vscode.ts STUB] window.createStatusBarItem`);

		// Return a very basic stub satisfying part of the interface for type checking
		let _text = "";

		return {
			id: "stubbed-status-item",

			alignment: StatusBarAlignment.Left,

			priority: 0,

			name: "Stubbed Item",

			text: _text,

			set text(val: string) {
				_text = val;
			},

			tooltip: undefined,

			color: undefined,

			backgroundColor: undefined,

			command: undefined,

			accessibilityInformation: undefined,

			show: () => {},

			hide: () => {},

			dispose: () => {},
		};
	},

	// TODO: Add stubs for other window members: activeTextEditor, visibleTextEditors, createOutputChannel,

	// showQuickPick, showInputBox, createTreeView, registerTreeDataProvider, createWebviewPanel etc.
	// These would delegate to ShimExtHostWindow, ShimExtHostQuickInput, ShimExtHostOutputService etc.
	terminals: [],

	activeTerminal: undefined,

	onDidChangeActiveTerminal: new VscodeEmitter<any>().event,

	onDidOpenTerminal: new VscodeEmitter<any>().event,

	onDidCloseTerminal: new VscodeEmitter<any>().event,

	// ... and more
};

let workspaceImpl: any = {
	// Properties
	get workspaceFolders() {
		console.warn("[vscode.ts STUB] workspace.workspaceFolders");

		return undefined;
	},

	get name() {
		console.warn("[vscode.ts STUB] workspace.name");

		return undefined;
	},

	get workspaceFile() {
		console.warn("[vscode.ts STUB] workspace.workspaceFile");

		return undefined;
	},

	get isTrusted() {
		console.warn("[vscode.ts STUB] workspace.isTrusted");

		return true;
	},

	get fs() {
		console.warn("[vscode.ts STUB] workspace.fs");

		// This needs to be an instance of ShimFileSystemApi or similar
		return {
			/* NOP FileSystem methods */ stat: async () => {
				throw new Error("fs.stat NOP");
			},
		};
	},

	get textDocuments() {
		console.warn("[vscode.ts STUB] workspace.textDocuments");

		return [];
	},

	// Methods
	getConfiguration: (section?: string, scope?: any) => {
		console.warn(
			`[vscode.ts STUB] workspace.getConfiguration: section=${section}`,
		);

		// Needs to return a WorkspaceConfiguration object
		return {
			get: () => undefined,

			has: () => false,

			inspect: () => undefined,

			update: async () => {},
		};
	},

	getWorkspaceFolder: (uri: VscodeUri) => {
		console.warn("[vscode.ts STUB] workspace.getWorkspaceFolder");

		return undefined;
	},

	findFiles: async () => {
		console.warn("[vscode.ts STUB] workspace.findFiles");

		return [];
	},

	openTextDocument: async () => {
		console.warn("[vscode.ts STUB] workspace.openTextDocument");

		throw new Error("Not implemented");
	},

	// TODO: Add stubs for saveAll, applyEdit, registerFileSystemProvider, etc.

	// Events
	onDidChangeWorkspaceFolders: new VscodeEmitter<any>().event,

	onDidOpenTextDocument: new VscodeEmitter<any>().event,

	onDidCloseTextDocument: new VscodeEmitter<any>().event,

	onDidChangeTextDocument: new VscodeEmitter<any>().event,

	// ... and more
};

let languagesImpl: any = {
	registerHoverProvider: (
		selector: DocumentSelector,

		provider: HoverProvider,
	): Disposable => {
		console.warn("[vscode.ts STUB] languages.registerHoverProvider");

		return new Disposable(() => {});
	},

	// TODO: Add stubs for all other register*Provider methods, getLanguages, match, etc.
	// These would delegate to ShimLanguages.
	getLanguages: async () => [],

	match: () => 0,
};

let envImpl: any = {
	appName: "Cocoon Stub App",

	appRoot: undefined,

	language: "en",

	machineId: "stubbed-machine-id",

	sessionId: "stubbed-session-id",

	// TODO: Add stubs for other env properties: uriScheme, appHost, clipboard, openExternal, etc.
	// These would delegate to ShimExtHostEnvironment.
};

// --- API Surface Definition ---
// This object structure defines what `require('vscode')` will provide.
// TODO: This needs to be comprehensive and match vscode.d.ts.
const vscodeApiExport = {
	// Top-level namespaces
	// Cast to actual vscode namespace type
	commands: commandsImpl as typeof import("vscode").commands,

	window: windowImpl as typeof import("vscode").window,

	workspace: workspaceImpl as typeof import("vscode").workspace,

	languages: languagesImpl as typeof import("vscode").languages,

	env: envImpl as typeof import("vscode").env,

	// TODO: Add other namespaces: extensions, debug, tasks, scm, comments, notebooks, tests, etc.

	// Core classes (constructors)
	Uri,

	Position,

	Range,

	Selection,

	Location,

	Disposable,

	CancellationToken,

	CancellationTokenSource,

	CancellationError,

	// Export VS Code's Emitter
	VscodeEmitter,

	Diagnostic,

	DiagnosticRelatedInformation,

	CompletionItem,

	CompletionList,

	SnippetString,

	Hover,

	SignatureHelp,

	DefinitionLink,

	CodeAction,

	CodeActionKind,

	CodeLens,

	Command: VscodeCommand,

	DocumentLink,

	WorkspaceEdit,

	SymbolInformation,

	SymbolKind,

	CallHierarchyItem,

	TypeHierarchyItem,

	QuickPickItem,

	InputBoxOptions,

	TextEdit,

	RelativePattern,

	ThemeColor,

	ThemeIcon,

	// TODO: Export all other necessary classes

	// Core enums (values)
	FileType,

	DiagnosticSeverity,

	ExtensionKind,

	ExtensionMode,

	EndOfLine,

	ViewColumn,

	StatusBarAlignment,

	QuickInputButtons,

	ConfigurationTarget,

	TextEditorRevealType,

	TextDocumentChangeReason,

	TaskScope,

	DebugConsoleMode,

	ProgressLocation,

	CompletionItemKind,

	CompletionTriggerKind,

	SignatureHelpTriggerKind,

	IndentAction,

	LanguageStatusSeverity,

	// TODO: Export all other necessary enums

	// --- Function to allow `index.ts` to inject real shim instances ---
	// This is a common pattern if this file is loaded before DI is fully set up.
	/**
	 * @internal Used by Cocoon's index.ts to replace stub implementations with real ones.
	 */

	_injectimplementation(instances: {
		// Using a non-English word "implementation" (realizatsia - implementation)
		commands?: typeof import("vscode").commands;

		window?: typeof import("vscode").window;

		workspace?: typeof import("vscode").workspace;

		languages?: typeof import("vscode").languages;

		env?: typeof import("vscode").env;

		// Add other services that populate the vscode API
	}): void {
		if (instances.commands) commandsImpl = instances.commands;

		if (instances.window) windowImpl = instances.window;

		if (instances.workspace) workspaceImpl = instances.workspace;

		if (instances.languages) languagesImpl = instances.languages;

		if (instances.env) envImpl = instances.env;

		console.log(
			"[vscode.ts] Shim implementations potentially injected/updated.",
		);
	},
};

// --- Default Export ---
// This makes `import vscode from 'vscode'` or `const vscode = require('vscode')` work.
export default vscodeApiExport;

// --- Named Exports (for `import { commands, window } from 'vscode'`) ---
// This requires re-exporting from the `vscodeApi` object or defining them individually.
export const commands = vscodeApiExport.commands;

export const window = vscodeApiExport.window;

export const workspace = vscodeApiExport.workspace;

export const languages = vscodeApiExport.languages;

export const env = vscodeApiExport.env;

// Re-export all imported classes and enums so they are available on `import * as vscode from 'vscode'`
// and `import { Uri } from 'vscode'`.
export {
	Uri,
	Position,
	Range,
	Selection,
	Location,
	Disposable,
	// VS Code's Emitter
	VscodeEmitter,
	CancellationToken,
	CancellationTokenSource,
	CancellationError,
	Diagnostic,
	DiagnosticRelatedInformation,
	CompletionItem,
	CompletionList,
	SnippetString,
	Hover,
	SignatureHelp,
	DefinitionLink,
	CodeAction,
	CodeActionKind,
	CodeLens,
	VscodeCommand as Command,
	DocumentLink,
	WorkspaceEdit,
	SymbolInformation,
	SymbolKind,
	CallHierarchyItem,
	TypeHierarchyItem,
	QuickPickItem,
	InputBoxOptions,
	TextEdit,
	RelativePattern,
	ThemeColor,
	ThemeIcon,
	FileType,
	DiagnosticSeverity,
	ExtensionKind,
	ExtensionMode,
	EndOfLine,
	ViewColumn,
	StatusBarAlignment,
	QuickInputButtons,
	ConfigurationTarget,
	TextEditorRevealType,
	TextDocumentChangeReason,
	TaskScope,
	DebugConsoleMode,
	ProgressLocation,
	CompletionItemKind,
	CompletionTriggerKind,
	SignatureHelpTriggerKind,
	IndentAction,
	LanguageStatusSeverity,
};

// Type for the _injectimplementation function's parameter
export type VscodeApiShimInstances = Parameters<
	typeof vscodeApiExport._injectimplementation
>[0];
