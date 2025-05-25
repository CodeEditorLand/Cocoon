/*---------------------------------------------------------------------------------------------
 * Cocoon VS Code API Shim Entry Point (vscode.ts)
 * --------------------------------------------------------------------------------------------
 * This file serves as the module that extensions import or require as 'vscode'.
 * It primarily re-exports core VS Code API types, classes, and enums.
 * The actual functional API object given to extensions at runtime is constructed
 * by the `apiFactoryProvider` in `index.ts`, which uses DI-managed shims.
 *
 * This module provides the necessary type definitions and exports for extensions
 * to compile and for static analysis.
 *--------------------------------------------------------------------------------------------*/

// --- Import and Re-export Core VS Code API Types, Classes, & Enums ---
// These come from "../Shim/out/vscode.js" - the bundled API definitions.
export {
	// Classes
	CallHierarchyItem,
	CancellationError,
	CancellationToken,
	CancellationTokenSource,
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
	Disposable,
	DocumentLink,
	EndOfLine,
	ExtensionKind,
	ExtensionMode,
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
	Uri,
	ViewColumn,
	WorkspaceEdit,

	// Aliased
	Command as VscodeCommand,

	// VS Code's Emitter
	EventEmitter as VscodeEmitter,

	// API LogLevel
	LogLevel as VscodeApiLogLevel,
	FileSystemError as VscodeFileSystemError,

	// Type-only exports for interfaces (useful for consumers)
	type Commands,
	type Window,
	type Workspace,
	type Languages,
	type Env,
	type StatusBarItem,
	type OutputChannel,
	type LogOutputChannel,
	type Terminal,
	type TextEditor,
	type WorkspaceFolder,
	type WorkspaceConfiguration,
	type TextDocument,
	type DiagnosticCollection,
	type FileSystem,
	type TextDocumentWillSaveEvent,
	type FileWillCreateEvent,
	type FileCreateEvent,
	type FileWillDeleteEvent,
	type FileDeleteEvent,
	type FileWillRenameEvent,
	type FileRenameEvent,
	type WorkspaceFoldersChangeEvent,
	type TextEditorSelectionChangeEvent,
	type TextEditorVisibleRangesChangeEvent,
	type TextEditorOptionsChangeEvent,
	type TextEditorViewColumnChangeEvent,
	type SecretStorage,
	type Memento,
	type ExtensionContext,

	// Add other interfaces extensions might import by name
} from "../Shim/out/vscode";

// --- API Object Definition (Primarily for Type Information) ---
// This object defines the *shape* of the `vscode` module.
// At runtime, extensions will receive an object with this shape, but populated
// with functional shims by the `apiFactoryProvider` in `index.ts`.
// The stubs here are minimal, mostly to satisfy `typeof import("vscode")`.

const commandsStub: typeof import("vscode").commands = {
	registerCommand: (id: string, cmd: (...args: any[]) => any) =>
		new Disposable(() => {}),

	executeCommand: async (cmd: string, ...args: any[]) => undefined,

	getCommands: async () => [],
};

const windowStub: typeof import("vscode").window = {
	activeTextEditor: undefined,

	visibleTextEditors: [],

	terminals: [],

	activeTerminal: undefined,

	state: { focused: true, active: true, visible: true },

	showInformationMessage: async (message: string, ...args: any[]) =>
		undefined,

	showWarningMessage: async (message: string, ...args: any[]) => undefined,

	showErrorMessage: async (message: string, ...args: any[]) => undefined,

	createStatusBarItem: (idOrAlign, alignOrPrio, prio) =>
		({
			id:
				typeof idOrAlign === "string"
					? idOrAlign
					: "stub-status-" + Date.now() + Math.random(),

			alignment: StatusBarAlignment.Left,

			priority: 0,

			name: "stub",

			text: "",

			tooltip: undefined,

			color: undefined,

			backgroundColor: undefined,

			command: undefined,

			accessibilityInformation: undefined,

			show: () => {},

			hide: () => {},

			dispose: () => {},

			// Cast to any for stub
		}) as any,

	createOutputChannel: (name, opts) =>
		({
			name,

			append: () => {},

			appendLine: () => {},

			clear: () => {},

			replace: () => {},

			show: () => {},

			hide: () => {},

			dispose: () => {},

			// Basic stub
		}) as any,

	onDidChangeActiveTextEditor: new VscodeEmitter<any>().event,

	onDidChangeVisibleTextEditors: new VscodeEmitter<any>().event,

	onDidChangeTextEditorSelection: new VscodeEmitter<any>().event,

	onDidChangeTextEditorVisibleRanges: new VscodeEmitter<any>().event,

	onDidChangeTextEditorOptions: new VscodeEmitter<any>().event,

	onDidChangeTextEditorViewColumn: new VscodeEmitter<any>().event,

	onDidChangeWindowState: new VscodeEmitter<any>().event,

	onDidChangeActiveTerminal: new VscodeEmitter<any>().event,

	onDidOpenTerminal: new VscodeEmitter<any>().event,

	onDidCloseTerminal: new VscodeEmitter<any>().event,

	// Add stubs for other window methods if needed for local type-checking
	showQuickPick: async () => undefined,

	showInputBox: async () => undefined,

	createWebviewPanel: () => {
		throw new Error("window.createWebviewPanel STUB");
	},

	registerWebviewPanelSerializer: () => new Disposable(() => {}),

	createTreeView: <T>(
		_viewId: string,

		_options: import("vscode").TreeViewOptions<T>,
	) => {
		throw new Error("window.createTreeView STUB");
	},

	registerTreeDataProvider: <T>(
		_viewId: string,

		_treeDataProvider: import("vscode").TreeDataProvider<T>,
	) => new Disposable(() => {}),

	setStatusBarMessage: () => new Disposable(() => {}),

	withProgress: async () => {
		throw new Error("window.withProgress STUB");
	},

	createTerminal: async () => {
		throw new Error("window.createTerminal STUB");
	},

	registerUriHandler: () => new Disposable(() => {}),

	showWorkspaceFolderPick: async () => undefined,

	showTextDocument: async () => {
		throw new Error("window.showTextDocument STUB");
	},

	registerCustomEditorProvider: () => new Disposable(() => {}),

	registerTerminalLinkProvider: () => new Disposable(() => {}),

	registerTerminalProfileProvider: () => new Disposable(() => {}),

	// Stubs for Progress, TreeView, Webview, etc. need to be added if used by extensions
	// window.activeColorTheme, window.onDidChangeActiveColorTheme, etc.
	// window.tabGroups, window.visibleNotebookEditors, etc.
};

const workspaceStub: typeof import("vscode").workspace = {
	workspaceFolders: undefined,

	name: undefined,

	workspaceFile: undefined,

	isTrusted: true,

	fs: {
		stat: async () => {
			throw new VscodeFileSystemError("stub");
		},

		// Basic FS stub
	} as any,

	textDocuments: [],

	getConfiguration: (section?: string, scope?: any) =>
		({
			get: () => undefined,

			has: () => false,

			inspect: () => undefined,

			update: async () => {},
		}) as any,

	getWorkspaceFolder: (uri) => undefined,

	findFiles: async () => [],

	openTextDocument: async () => {
		throw new Error("workspace.openTextDocument STUB");
	},

	saveAll: async () => false,

	applyEdit: async () => false,

	createFileSystemWatcher: () => ({
		dispose: () => {},

		onDidCreate: new VscodeEmitter<Uri>().event,

		onDidChange: new VscodeEmitter<Uri>().event,

		onDidDelete: new VscodeEmitter<Uri>().event,

		ignoreCreateEvents: false,

		ignoreChangeEvents: false,

		ignoreDeleteEvents: false,
	}),

	registerTextDocumentContentProvider: () => new Disposable(() => {}),

	registerTaskProvider: () => new Disposable(() => {}),

	registerFileSystemProvider: () => new Disposable(() => {}),

	getRelativePath: () => "",

	asRelativePath: (pathOrUri, includeWorkspaceFolder) =>
		workspaceStub.getRelativePath(pathOrUri, includeWorkspaceFolder),

	onDidChangeWorkspaceFolders: new VscodeEmitter<any>().event,

	onDidOpenTextDocument: new VscodeEmitter<any>().event,

	onDidCloseTextDocument: new VscodeEmitter<any>().event,

	onDidChangeTextDocument: new VscodeEmitter<any>().event,

	onDidSaveTextDocument: new VscodeEmitter<any>().event,

	onWillSaveTextDocument: new VscodeEmitter<any>().event,

	onWillCreateFiles: new VscodeEmitter<any>().event,

	onDidCreateFiles: new VscodeEmitter<any>().event,

	onWillDeleteFiles: new VscodeEmitter<any>().event,

	onDidDeleteFiles: new VscodeEmitter<any>().event,

	onWillRenameFiles: new VscodeEmitter<any>().event,

	onDidRenameFiles: new VscodeEmitter<any>().event,

	onDidGrantWorkspaceTrust: new VscodeEmitter<void>().event,

	// Stubs for notebook related properties/events
	// workspace.notebookDocuments, workspace.onDidOpenNotebookDocument, etc.
	// workspace.isTrusted (already stubbed), workspace.onDidGrantWorkspaceTrust (already stubbed)
};

const languagesStub: typeof import("vscode").languages = {
	registerHoverProvider: () => new Disposable(() => {}),

	getLanguages: async () => [],

	match: () => 0,

	setTextDocumentsLanguage: async (doc, langId) => doc,

	createDiagnosticCollection: (name?: string) =>
		({
			name: name || "stub",

			clear: () => {},

			dispose: () => {},

			forEach: () => {},

			get: () => undefined,

			has: () => false,

			delete: () => {},

			set: () => {},
		}) as any,

	onDidChangeDiagnostics: new VscodeEmitter<readonly Uri[]>().event,

	setLanguageStatus: () => new Disposable(() => {}),

	createLanguageStatusItem: (id, selector) =>
		({
			id,

			name: "stub",

			text: "",

			command: undefined,

			severity: LanguageStatusSeverity.Information,

			accessibilityInformation: undefined,

			busy: false,

			dispose: () => {},
		}) as any,

	// Add stubs for all other register*Provider methods
	registerCompletionItemProvider: () => new Disposable(() => {}),

	registerDefinitionProvider: () => new Disposable(() => {}),

	registerCodeActionsProvider: () => new Disposable(() => {}),

	registerCodeLensProvider: () => new Disposable(() => {}),

	registerDeclarationProvider: () => new Disposable(() => {}),

	registerDocumentFormattingEditProvider: () => new Disposable(() => {}),

	registerDocumentHighlightProvider: () => new Disposable(() => {}),

	registerDocumentLinkProvider: () => new Disposable(() => {}),

	registerDocumentRangeFormattingEditProvider: () => new Disposable(() => {}),

	registerOnTypeFormattingEditProvider: () => new Disposable(() => {}),

	registerReferenceProvider: () => new Disposable(() => {}),

	registerRenameProvider: () => new Disposable(() => {}),

	registerSignatureHelpProvider: () => new Disposable(() => {}),

	registerImplementationProvider: () => new Disposable(() => {}),

	registerTypeDefinitionProvider: () => new Disposable(() => {}),

	registerWorkspaceSymbolProvider: () => new Disposable(() => {}),

	registerSelectionRangeProvider: () => new Disposable(() => {}),

	registerCallHierarchyProvider: () => new Disposable(() => {}),

	registerTypeHierarchyProvider: () => new Disposable(() => {}),

	registerLinkedEditingRangeProvider: () => new Disposable(() => {}),

	registerInlayHintsProvider: () => new Disposable(() => {}),

	registerDocumentColorProvider: () => new Disposable(() => {}),

	registerFoldingRangeProvider: () => new Disposable(() => {}),

	// Stubs for getDiagnostics (usually on DiagnosticCollection, but also a top-level helper in some API versions)
	// getDiagnostics: () => [],

	// getCodeActions: async () => [],

	// etc. for direct provider calls
	// provideHover: async () => undefined,
};

const envStub: typeof import("vscode").env = {
	appName: "Cocoon Stub App",

	appRoot: undefined,

	language: "en",

	machineId: "stubbed-machine-id",

	sessionId: "stubbed-session-id",

	isTrusted: true,

	isRemote: false,

	remoteName: undefined,

	shell: "unknown_shell",

	uiKind: 1 /* UIKind.Desktop */,

	clipboard: { readText: async () => "", writeText: async () => {} },

	openExternal: async () => false,

	asExternalUri: async (target) => target,

	onDidChangeTelemetryLevel: new VscodeEmitter<any>().event,

	onDidChangeShell: new VscodeEmitter<string>().event,

	isNewAppInstall: false,

	isBuilt: true,

	uriScheme: "cocoon-code",

	appHost: "desktop",

	// Stubs for other env properties if needed
	// env.appQuality, env.appCommit, env.appServerPort, etc.
};

const extensionsStub: typeof import("vscode").extensions = {
	getExtension: (extensionId: string) => undefined,

	get all() {
		return [];
	},

	get onDidChange() {
		return new VscodeEmitter<void>().event;
	},

	// Stubs for other extension properties if needed (e.g. determineExtensionUri)
};

const debugStub: typeof import("vscode").debug = {
	activeDebugSession: undefined,

	activeDebugConsole: { append: () => {}, appendLine: () => {} },

	breakpoints: [],

	onDidStartDebugSession: new VscodeEmitter<any>().event,

	onDidTerminateDebugSession: new VscodeEmitter<any>().event,

	onDidChangeActiveDebugSession: new VscodeEmitter<any>().event,

	onDidReceiveDebugSessionCustomEvent: new VscodeEmitter<any>().event,

	onDidChangeBreakpoints: new VscodeEmitter<any>().event,

	startDebugging: async () => false,

	stopDebugging: async () => {},

	registerDebugConfigurationProvider: () => new Disposable(() => {}),

	registerDebugAdapterDescriptorFactory: () => new Disposable(() => {}),

	addBreakpoints: async () => {},

	removeBreakpoints: async () => {},

	// ... other debug methods
};

const tasksStub: typeof import("vscode").tasks = {
	taskExecutions: [],

	onDidStartTask: new VscodeEmitter<any>().event,

	onDidEndTask: new VscodeEmitter<any>().event,

	onDidStartTaskProcess: new VscodeEmitter<any>().event,

	onDidEndTaskProcess: new VscodeEmitter<any>().event,

	registerTaskProvider: () => new Disposable(() => {}),

	fetchTasks: async () => [],

	executeTask: async () => {
		throw new Error("tasks.executeTask STUB");
	},

	// ... other tasks methods
};

// --- API Object Definition ---
const vscodeApiExportObject = {
	commands: commandsStub,

	window: windowStub,

	workspace: workspaceStub,

	languages: languagesStub,

	env: envStub,

	extensions: extensionsStub,

	debug: debugStub,

	tasks: tasksStub,

	// Add stubs for scm, comments, notebooks, tests if needed for type-checking
	scm: {
		createSourceControl: () =>
			({
				id: "stub-scm",

				label: "Stub SCM",

				rootUri: undefined,

				inputBox: undefined,

				count: 0,

				acceptInputCommand: undefined,

				get desaparece() {
					return new VscodeEmitter<void>().event;
				},

				dispose: () => {},
			}) as any,

		rootUri: undefined,

		inputBox: undefined,
	} as any,

	comments: {
		createCommentController: () =>
			({
				id: "stub-comment",

				label: "Stub Comment Ctrl",

				dispose: () => {},
			}) as any,
	} as any,

	notebooks: {
		createNotebookController: () =>
			({
				id: "stub-notebook",

				label: "Stub Notebook Ctrl",

				dispose: () => {},
			}) as any,

		onDidOpenNotebookDocument: new VscodeEmitter<any>().event,

		onDidCloseNotebookDocument: new VscodeEmitter<any>().event,
	} as any,

	tests: {
		createTaskRunner: () => ({ run: () => {}, dispose: () => {} }) as any,

		createTestController: () =>
			({
				id: "stub-test",

				label: "Stub Test Ctrl",

				dispose: () => {},
			}) as any /* ... other test methods */,
	} as any,

	// Re-export core classes and enums directly on the default export
	Uri,

	Position,

	Range,

	Selection,

	Location,

	Disposable,

	CancellationToken,

	CancellationTokenSource,

	CancellationError,

	EventEmitter: VscodeEmitter,

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

	LogLevel: VscodeApiLogLevel,

	FileSystemError: VscodeFileSystemError,
};

// --- Default Export ---
export default vscodeApiExportObject;

// --- Named Exports for Namespaces ---
export const commands: typeof vscodeApiExportObject.commands =
	vscodeApiExportObject.commands;

export const window: typeof vscodeApiExportObject.window =
	vscodeApiExportObject.window;

export const workspace: typeof vscodeApiExportObject.workspace =
	vscodeApiExportObject.workspace;

export const languages: typeof vscodeApiExportObject.languages =
	vscodeApiExportObject.languages;

export const env: typeof vscodeApiExportObject.env = vscodeApiExportObject.env;

export const extensions: typeof vscodeApiExportObject.extensions =
	vscodeApiExportObject.extensions;

export const debug: typeof vscodeApiExportObject.debug =
	vscodeApiExportObject.debug;

export const tasks: typeof vscodeApiExportObject.tasks =
	vscodeApiExportObject.tasks;

export const scm: typeof vscodeApiExportObject.scm = vscodeApiExportObject.scm;

export const comments: typeof vscodeApiExportObject.comments =
	vscodeApiExportObject.comments;

export const notebooks: typeof vscodeApiExportObject.notebooks =
	vscodeApiExportObject.notebooks;

export const tests: typeof vscodeApiExportObject.tests =
	vscodeApiExportObject.tests;

// Individual classes and enums are already exported by name at the top of the file.
