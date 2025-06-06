/*---------------------------------------------------------------------------------------------
 * Cocoon VS Code API Shim Entry Point 
 * --------------------------------------------------------------------------------------------
 * This file serves as the module that extensions import or require when they specify
 * `import * as vscode from 'vscode'` or `const vscode = require('vscode')`.
 *
 * Its primary purpose is to provide the necessary **type definitions and exports** for
 * extensions to compile successfully against the VS Code API. It re-exports core
 * VS Code API types, classes, and enums from a bundled API definition file
 * (assumed to be `../Shim/out/vscode.js`, which typically contains the output of
 * `vscode.d.ts` processing).
 *
 * Additionally, this file defines a `vscodeApiExportObject`. This object and its
 * nested namespace stubs (e.g., `commandsStub`, `windowStub`) define the *shape* of
 * the `vscode` module that extensions expect. These stubs are minimal and primarily
 * intended to satisfy `typeof import("vscode")` for static analysis and type checking
 * during extension development.
 *
 * **Important Runtime Note:** The actual functional `vscode` API object provided to
 * extensions at runtime is NOT this stubbed object. Instead, it is dynamically
 * constructed by the `apiFactoryProvider` function located in `Cocoon/index.ts`.
 * That factory uses Dependency Injection (DI) to populate the API object with
 * instances of Cocoon's functional shims (e.g., `ShimExtHostCommands`,
 *
 * `ShimExtHostWorkspace`). Therefore, the stubs in this file are for compile-time
 * correctness, while `index.ts` provides the runtime behavior.
 *
 *--------------------------------------------------------------------------------------------*/

// --- Import and Re-export Core VS Code API Types, Classes, & Enums ---
// These are sourced from `../Shim/out/vscode.js`, which is assumed to be
// the bundled output of VS Code's API definition file (`vscode.d.ts`).
// This ensures that extensions using Cocoon can use standard VS Code types.
export {
	// Core Classes (constructors are part of the API)
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

	// Added
	DebugConfigurationProviderTriggerKind,
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

	// FileSystemError was VscodeFileSystemError
	FileSystemError,
	FileType,
	Hover,
	IndentAction,
	Location,

	// LogLevel was VscodeApiLogLevel
	LogLevel,

	// Added
	MarkdownString,
	Position,
	ProgressLocation,
	QuickInputButtons,
	QuickPickItem,

	// Added QuickPickItemKind
	QuickPickItemKind,
	Range,
	RelativePattern,
	Selection,
	SignatureHelp,
	SignatureHelpTriggerKind,
	SnippetString,
	StatusBarAlignment,
	SymbolInformation,
	SymbolKind,
	TaskRevealKind,

	// Added TaskRevealKind, TaskPanelKind
	TaskPanelKind,
	TaskScope,
	TextDocumentChangeReason,
	TextEdit,
	TextEditorRevealType,
	ThemeColor,
	ThemeIcon,
	TreeItem,

	// Added TreeItem, TreeItemCollapsibleState
	TreeItemCollapsibleState,
	TypeHierarchyItem,
	Uri,
	ViewColumn,
	WorkspaceEdit,

	// Aliased classes/enums (if needed to avoid local conflicts, though direct export is usually fine)
	// `Command` interface is usually a type-only export
	// Command as VscodeCommand,

	// VS Code's Emitter class, often used by extensions
	EventEmitter as VscodeEmitter,

	// Type-only exports for interfaces (useful for consumers to import types explicitly)
	// These ensure that extensions can type their variables and parameters correctly.
	// Added
	type AccessibilityInformation,

	// Added
	type AuthenticationSession,

	// Added
	type CallHierarchyIncomingCall,

	// Added
	type CallHierarchyOutgoingCall,

	// Added
	type ChatAgentCompletionItem,

	// Added
	type ChatAgentDetectedParticipant,

	// Added
	type ChatAgentReplyFollowup,

	// Added
	type ChatAgentRequest,

	// Added
	type ChatAgentResult,

	// Added
	type ChatAgentWelcomeMessageContent,

	// Added
	type ChatContext,

	// Added
	type ChatMessage,

	// Added
	type ChatResponseFragment,

	// Added
	type ChatResponseStream,

	// Added
	type ChatResultFeedback,

	// Added
	type ChatVariableValue,

	// Added
	type CodeActionContext,

	// Added
	type CodeActionProvider,

	// Added
	type Color,

	// Added
	type ColorInformation,

	// Added
	type ColorPresentation,

	// Added
	type Comment,

	// Added
	type CommentAuthorInformation,

	// Added
	type CommentController,

	// Added
	type CommentReaction,

	// Added
	type CommentReply,

	// Added
	type CommentThread,

	// Added
	type CommentThreadCollapsibleState,

	// Added
	type CommentingRangeProvider,

	// `vscode.Command` interface for commands
	type Command,

	// Type for `vscode.commands` namespace
	type Commands,

	// Added
	type CompletionContext,

	// Added
	type CompletionItemLabel,

	// Added
	type CompletionItemProvider,

	// Added
	type ConfigurationChangeEvent,

	// Added
	type CustomExecution,

	// Added
	type CustomDocument,

	// Added
	type CustomDocumentBackup,

	// Added
	type CustomDocumentBackupContext,

	// Added
	type CustomDocumentEditEvent,

	// Added
	type CustomDocumentOpenContext,

	// Added
	type CustomEditorProvider,

	// Added
	type CustomReadonlyEditorProvider,

	// Added
	type CustomTextEditorProvider,

	// Added
	type DataTransfer,

	// Added
	type DataTransferItem,

	// Added
	type DebugAdapter,

	// Added
	type DebugAdapterDescriptor,

	// Added
	type DebugAdapterDescriptorFactory,

	// Added
	type DebugAdapterExecutable,

	// Added
	type DebugAdapterInlineImplementation,

	// Added
	type DebugAdapterNamedPipeServer,

	// Added
	type DebugAdapterServer,

	// Added
	type DebugAdapterTracker,

	// Added
	type DebugAdapterTrackerFactory,

	// Added
	type DebugConfiguration,

	// Added
	type DebugConfigurationProvider,

	// Added
	type DebugProtocolBreakpoint,

	// Added
	type DebugProtocolMessage,

	// Added
	type DebugProtocolSource,

	// Added
	type DebugSession,

	// Added
	type DebugSessionCustomEvent,

	// Added
	type DebugSessionOptions,

	// Added
	type DebugAdapter,

	// Added, type alias for clarity
	type Declaration as VscodeDeclaration,

	// Added
	type DeclarationProvider,

	// Added, type alias
	type Definition as VscodeDefinition,

	// Added
	type DefinitionProvider,

	// Added
	type DiagnosticChangeEvent,

	// Type for `vscode.languages.createDiagnosticCollection()`
	type DiagnosticCollection,

	// Added
	type DiagnosticTag,

	// Added
	type DisposableLike,

	// Added
	type DocumentColorProvider,

	// Added
	type DocumentDropEdit,

	// Added
	type DocumentDropEditProvider,

	// Added LanguageFilter
	type DocumentFilter,

	// Added
	type DocumentFormattingEditProvider,

	// Added
	type DocumentHighlight,

	// Added
	type DocumentHighlightKind,

	// Added
	type DocumentHighlightProvider,

	// Added
	type DocumentLinkProvider,

	// Added
	type DocumentRangeFormattingEditProvider,

	// Added
	type DocumentSemanticTokensProvider,

	// Added
	type DocumentRangeSemanticTokensProvider,

	// Added
	type DocumentSymbol,

	// Added
	type DocumentSymbolProvider,

	// Type for `vscode.env` namespace
	type Env,

	// Added
	type EnvironmentVariableCollection,

	// Added
	type EnvironmentVariableMutator,

	// Added (vscode.Event)
	type Event,

	// Added
	type Extension,

	// Crucial for extension activation
	type ExtensionContext,

	// Added, type alias
	type ExtensionMode as VscodeExtensionMode,

	// Added
	type FileChangeEvent,
	type FileCreateEvent,
	type FileDeleteEvent,

	// Added
	type FileDecoration,

	// Added
	type FileDecorationProvider,
	type FileRenameEvent,

	// Added
	type FileStat,

	// Type for `vscode.workspace.fs`
	type FileSystem,

	// Added
	type FileSystemProvider,
	type FileWillCreateEvent,
	type FileWillDeleteEvent,
	type FileWillRenameEvent,

	// Added
	type FoldingContext,

	// Added
	type FoldingRange,

	// Added
	type FoldingRangeKind,

	// Added
	type FoldingRangeProvider,

	// Added
	type FormattingOptions,

	// Added
	type GlobPattern,

	// Added
	type HoverProvider,

	// Added
	type ImplementationProvider,

	// Added
	type IndexedText,

	// Added
	type InlineCompletionContext,

	// Added
	type InlineCompletionItem,

	// Added
	type InlineCompletionList,

	// Added
	type InlineCompletionTriggerKind,

	// Added
	type InlineValuesProvider,

	// Added
	type InputBox,

	// Added
	type InputStep,

	// Added
	type InlayHint,

	// Added
	type InlayHintLabelPart,

	// Added
	type InlayHintKind,

	// Added
	type InlayHintsProvider,

	// Added
	type InteractiveSession,

	// Added
	type InteractiveSessionVote,

	// Added
	type InteractiveSessionWelcomeMessage,

	// Added
	type InteractiveSessionFollowup,

	// Added
	type InteractiveRequest,

	// Added
	type InteractiveResponse,

	// Added
	type InteractiveSessionProvider,

	// Added
	type InteractiveSessionDynamicRequest,

	// Added
	type InteractiveSessionCopyAction,

	// Added
	type LanguageModelAccessInformation,

	// Added
	type LanguageModelChatMessage,

	// Added type alias
	type LanguageModelChatMessageRole as VscodeLanguageModelChatMessageRole,

	// Added
	type LanguageModelChat,

	// Added
	type LanguageModelChatRequest,

	// Added
	type LanguageModelChatResponse,

	// Added
	type LanguageModelChatSelector,

	// Added
	type LanguageModelChatResponseFragment,

	// Added
	type LanguageModelStatusChangeEvent,

	// Type for `vscode.languages` namespace
	type Languages,

	// Added
	type LinkedEditingRangeProvider,

	// Added
	type LinkedEditingRanges,

	// Type for `vscode.window.createOutputChannel({log: true})`
	type LogOutputChannel,

	// Type for `ExtensionContext.globalState` and `workspaceState`
	type Memento,

	// Added
	type MessageItem,

	// Added
	type MessageOptions,

	// Added
	type NotebookCell,

	// Added
	type NotebookCellData,

	// Added
	type NotebookCellExecutionState,

	// Added
	type NotebookCellExecutionStateChangeEvent,

	// Added
	type NotebookCellKind,

	// Added
	type NotebookCellOutput,

	// Added
	type NotebookCellOutputItem,

	// Added
	type NotebookController,

	// Added
	type NotebookData,

	// Added
	type NotebookDocument,

	// Added
	type NotebookDocumentCellChangeEvent,

	// Added
	type NotebookDocumentContentChangeEvent,

	// Added
	type NotebookDocumentMetadataChangeEvent,

	// Added
	type NotebookEditor,

	// Added
	type NotebookEditorSelectionChangeEvent,

	// Added
	type NotebookEditorVisibleRangesChangeEvent,

	// Added
	type NotebookRange,

	// Added
	type NotebookRendererScript,

	// Added
	type NotebookSerializer,

	// Added
	type OnTypeFormattingEditProvider,

	// Type for `vscode.window.createOutputChannel()`
	type OutputChannel,

	// Added
	type OpenDialogOptions,

	// Added
	type ProcessExecution,

	// Added
	type ProgressOptions,

	// Added
	type Pseudoterminal,

	// Added
	type QuickDiffProvider,

	// Added
	type QuickPickItemButtonEvent,

	// Added
	type QuickPickOnDidChangeValueEvent,

	// Added
	type QuickPickOptions,

	// Added
	type ReferenceContext,

	// Added
	type ReferenceProvider,

	// Added
	type RenameProvider,

	// Added
	type SaveDialogOptions,

	// Type for `ExtensionContext.secrets`
	type SecretStorage,

	// Added
	type SecretStorageChangeEvent,

	// Added
	type SemanticTokens,

	// Added
	type SemanticTokensBuilder,

	// Added
	type SemanticTokensEdits,

	// Added
	type SemanticTokensEdit,

	// Added
	type SemanticTokensLegend,

	// Added
	type SelectionRange,

	// Added
	type SelectionRangeProvider,

	// Added
	type ShellExecution,

	// Added
	type ShellExecutionOptions,

	// Added
	type SignatureHelpContext,

	// Added
	type SignatureHelpProvider,

	// Added
	type SourceControl,

	// Added
	type SourceControlInputBox,

	// Added
	type SourceControlResourceGroup,

	// Added
	type SourceControlResourceState,

	// Type for `vscode.window.createStatusBarItem()`
	type StatusBarItem,

	// Added
	type Tab,

	// Added
	type TabGroup,

	// Added
	type TabInputChat,

	// Added
	type TabInputCustom,

	// Added
	type TabInputNotebook,

	// Added
	type TabInputNotebookDiff,

	// Added
	type TabInputTerminal,

	// Added
	type TabInputText,

	// Added
	type TabInputTextDiff,

	// Added
	type TabInputWebview,

	// Added
	type Task,

	// Added
	type TaskDefinition,

	// Added
	type TaskEndEvent,

	// Added
	type TaskExecution,

	// Added
	type TaskFilter,

	// Added type alias
	type TaskGroup as VscodeTaskGroup,

	// Added
	type TaskProcessEndEvent,

	// Added
	type TaskProcessStartEvent,

	// Added
	type TaskProvider,

	// Added
	type TaskStartEvent,

	// Type for `vscode.window.createTerminal()`
	type Terminal,

	// Added
	type TerminalDimensions,

	// Added
	type TerminalExitReason,

	// Added
	type TerminalExitStatus,

	// Added
	type TerminalLink,

	// Added
	type TerminalLinkContext,

	// Added
	type TerminalLinkProvider,

	// Added
	type TerminalOptions,

	// Added
	type TerminalProfile,

	// Added
	type TerminalProfileProvider,

	// Added
	type TerminalState,

	// Added
	type TestController,

	// Added
	type TestCoverage,

	// Added
	type TestItem,

	// Added
	type TestMessage,

	// Added
	type TestRun,

	// Added
	type TestRunProfile,

	// Added
	type TestRunRequest,

	// Added
	type TestRunResult,

	// Crucial type for document-related APIs
	type TextDocument,

	// Added
	type TextDocumentContentChangeEvent,

	// Added
	type TextDocumentContentProvider,

	// Added
	type TextDocumentSaveReason,
	type TextDocumentWillSaveEvent,

	// Type for `vscode.window.activeTextEditor`
	type TextEditor,

	// Added
	type TextEditorDecorationType,

	// Added
	type TextEditorOptions,
	type TextEditorOptionsChangeEvent,
	type TextEditorSelectionChangeEvent,
	type TextEditorViewColumnChangeEvent,
	type TextEditorVisibleRangesChangeEvent,

	// Added
	type TextLine,

	// Added
	type TextSearchComplete,

	// Added
	type TextSearchOptions,

	// Added
	type TextSearchQuery,

	// Added
	type TextSearchResult,

	// Added
	type TextSearchProvider,

	// Added
	type TreeDataProvider,

	// Added
	type TreeDragAndDropController,

	// Added
	type TreeView,

	// Added
	type TreeViewExpansionEvent,

	// Added
	type TreeViewOptions,

	// Added
	type TreeViewSelectionChangeEvent,

	// Added
	type TreeViewVisibilityChangeEvent,

	// Added
	type TypeDefinitionProvider,

	// Added
	type TypeHierarchyProvider,

	// Added type alias
	type UIKind as VscodeUIKind,

	// Added
	type UriHandler,

	// Added
	type Webview,

	// Added
	type WebviewOptions,

	// Added
	type WebviewPanel,

	// Added
	type WebviewPanelOnDidChangeViewStateEvent,

	// Added
	type WebviewPanelOptions,

	// Added
	type WebviewPanelSerializer,

	// Added
	type WebviewPort,

	// Added
	type WebviewView,

	// Added
	type WebviewViewProvider,

	// Added
	type WebviewViewResolveContext,

	// Type for `vscode.window` namespace
	type Window,

	// Added
	type WindowState,

	// Type for `vscode.workspace` namespace
	type Workspace,

	// Type for `vscode.workspace.getConfiguration()`
	type WorkspaceConfiguration,

	// Type for `vscode.workspace.workspaceFolders`
	type WorkspaceFolder,
	type WorkspaceFoldersChangeEvent,

	// Added
	type WorkspaceSymbol,

	// Added
	type WorkspaceSymbolProvider,

	// This path should point to the bundled vscode.d.ts output
} from "../Shim/out/vscode";

// --- API Object Definition (Primarily for Type Information at Compile Time) ---
// This object, `vscodeApiExportObject`, defines the *shape* of the `vscode` module that
// extensions expect when they `import * as vscode from 'vscode'`.
// At runtime, extensions will receive an object with this same shape, but its properties
// (the API namespaces like `commands`, `window`, etc.) will be populated with instances
// of Cocoon's functional shims. This is orchestrated by the `apiFactoryProvider` in `index.ts`.
//
// The stubs defined here (e.g., `commandsStub`, `windowStub`) are minimal. They primarily
// serve to satisfy `typeof import("vscode")` for TypeScript's static analysis and to
// provide type checking for extensions during their development and compilation against Cocoon.
// Many stubbed methods are NOPs, return default values, or throw errors to indicate
// that the full functionality is provided by the runtime shims.

const commandsStub: typeof import("vscode").commands = {
	registerCommand: (id: string, cmd: (...args: any[]) => any) =>
		new Disposable(() => {}),

	executeCommand: async (cmd: string, ...args: any[]) => undefined,

	getCommands: async () => [],
};

const windowStub: typeof import("vscode").window = {
	// Properties
	activeTextEditor: undefined,

	visibleTextEditors: [],

	terminals: [],

	activeTerminal: undefined,

	// Default state
	state: Object.freeze({ focused: true, active: true, visible: true }),

	// Message Methods (showInformationMessage, etc.)
	showInformationMessage: async (message: string, ...args: any[]) =>
		undefined,

	showWarningMessage: async (message: string, ...args: any[]) => undefined,

	showErrorMessage: async (message: string, ...args: any[]) => undefined,

	// StatusBar Methods
	createStatusBarItem: (idOrAlign?: any, alignOrPrio?: any, prio?: any) =>
		({
			// Basic stub structure for StatusBarItem
			id:
				typeof idOrAlign === "string"
					? idOrAlign
					: "cocoon-stub-statusbar-" + Date.now() + Math.random(),

			alignment: StatusBarAlignment.Left,

			priority: 0,

			name: "StubbedItem",

			text: "",

			tooltip: undefined,

			color: undefined,

			backgroundColor: undefined,

			command: undefined,

			accessibilityInformation: undefined,

			show: () => console.warn("STUB: StatusBarItem.show() called."),

			hide: () => console.warn("STUB: StatusBarItem.hide() called."),

			dispose: () =>
				console.warn("STUB: StatusBarItem.dispose() called."),

			// Cast to `any` as stub is minimal
		}) as any,

	setStatusBarMessage: (text: string, hideOrPromise?: any) => {
		console.warn(`STUB: setStatusBarMessage('${text}')`);

		return new Disposable(() => {});
	},

	// OutputChannel Methods
	createOutputChannel: (name: string, optsOrLangId?: any) =>
		({
			name,

			append: () =>
				console.warn(`STUB: OutputChannel(${name}).append() called.`),

			appendLine: () =>
				console.warn(
					`STUB: OutputChannel(${name}).appendLine() called.`,
				),

			clear: () =>
				console.warn(`STUB: OutputChannel(${name}).clear() called.`),

			replace: () =>
				console.warn(`STUB: OutputChannel(${name}).replace() called.`),

			show: () =>
				console.warn(`STUB: OutputChannel(${name}).show() called.`),

			hide: () =>
				console.warn(`STUB: OutputChannel(${name}).hide() called.`),

			dispose: () =>
				console.warn(`STUB: OutputChannel(${name}).dispose() called.`),

			// Add LogOutputChannel specific stubs if optsOrLangId indicates log:true
			...(typeof optsOrLangId === "object" &&
			optsOrLangId &&
			optsOrLangId.log === true
				? {
						logLevel: LogLevel.Info,

						onDidChangeLogLevel: new VscodeEmitter<LogLevel>()
							.event,

						trace: () => {},

						debug: () => {},

						info: () => {},

						warn: () => {},

						error: () => {},

						setLogLevel: () => {},
					}
				: {}),

			// Cast to `any` due to conditional log channel parts
		}) as any,

	// QuickInput Methods
	showQuickPick: async () => undefined,

	showInputBox: async () => undefined,

	// createQuickPick: () => { throw new Error("STUB: window.createQuickPick not implemented in vscode.ts stub."); },

	// createInputBox: () => { throw new Error("STUB: window.createInputBox not implemented in vscode.ts stub."); },

	// Dialog Methods
	showOpenDialog: async (options?: import("vscode").OpenDialogOptions) =>
		undefined,

	showSaveDialog: async (options?: import("vscode").SaveDialogOptions) =>
		undefined,

	showWorkspaceFolderPick: async (
		options?: import("vscode").WorkspaceFolderPickOptions,
	) => undefined,

	// Progress Method
	withProgress: async (
		options: import("vscode").ProgressOptions,

		task: Function,
	) => {
		console.warn(
			"STUB: window.withProgress called. Task will run without UI progress.",
		);

		const tokenSource = new CancellationTokenSource();

		try {
			return await Promise.resolve(
				task({ report: () => {} }, tokenSource.token),
			);
		} finally {
			tokenSource.dispose();
		}
	},

	// Terminal Methods
	createTerminal: (options?: any) => {
		throw new Error(
			"STUB: window.createTerminal not implemented in vscode.ts stub.",
		);
	},

	// get activeTerminal, terminals are properties above

	// Webview Methods
	createWebviewPanel: (
		viewType: string,

		title: string,

		showOptions: any,

		options?: any,
	) => {
		throw new Error(
			"STUB: window.createWebviewPanel not implemented in vscode.ts stub.",
		);
	},

	registerWebviewPanelSerializer: (viewType: string, serializer: any) =>
		new Disposable(() => {}),

	// registerWebviewViewProvider, createWebviewTextEditorInset

	// TreeView Methods
	createTreeView: <T>(
		_viewId: string,

		_options: import("vscode").TreeViewOptions<T>,
	) => {
		throw new Error(
			"STUB: window.createTreeView not implemented in vscode.ts stub.",
		);
	},

	registerTreeDataProvider: <T>(
		_viewId: string,

		_treeDataProvider: import("vscode").TreeDataProvider<T>,
	) => new Disposable(() => {}),

	// Other Window API parts
	showTextDocument: async (docOrUri: any, options?: any) => {
		throw new Error(
			"STUB: window.showTextDocument not implemented in vscode.ts stub.",
		);
	},

	registerUriHandler: (handler: any) => new Disposable(() => {}),

	registerCustomEditorProvider: (
		viewType: string,

		provider: any,

		options?: any,
	) => new Disposable(() => {}),

	registerTerminalLinkProvider: (provider: any) => new Disposable(() => {}),

	registerTerminalProfileProvider: (id: string, provider: any) =>
		new Disposable(() => {}),

	// activeColorTheme, tabGroups, etc. are often properties or have their own events.

	// Event Emitters (all NOPs that never fire for the stub)
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

	// Added
	onDidChangeTerminalState: new VscodeEmitter<any>().event,

	// onDidChangeActiveNotebookEditor, onDidChangeVisibleNotebookEditors, etc.
	// onDidChangeNotebookEditorSelection, onDidChangeNotebookEditorVisibleRanges
	// onDidOpenNotebookDocument, onDidCloseNotebookDocument, onDidSaveNotebookDocument
	// onDidChangeActiveColorTheme, onDidChangeTabs, onDidChangeTabGroups
};

const workspaceStub: typeof import("vscode").workspace = {
	// Properties
	name: undefined,

	workspaceFile: undefined,

	workspaceFolders: undefined,

	// Default to trusted for stub
	isTrusted: true,

	fs: {
		// Minimal stub for vscode.workspace.fs
		stat: async (uri: Uri) => {
			throw new FileSystemError(
				"STUB: workspace.fs.stat not implemented.",
			);
		},

		readDirectory: async (uri: Uri) => [],

		readFile: async (uri: Uri) => new Uint8Array(0),

		writeFile: async (uri: Uri, content: Uint8Array) => {},

		createDirectory: async (uri: Uri) => {},

		delete: async (uri: Uri, options?: any) => {},

		rename: async (source: Uri, target: Uri, options?: any) => {},

		copy: async (source: Uri, target: Uri, options?: any) => {},

		isWritableFileSystem: (scheme: string) => undefined,

		onDidChangeFile: new VscodeEmitter<any[]>().event,

		// Cast to `any` as it's a minimal stub matching VscodeFileSystemAPIType shape
	} as any,

	// Readonly array of open text documents
	textDocuments: [],

	// Configuration Methods
	getConfiguration: (section?: string, scope?: any) =>
		({
			get: (key: string, defaultValue?: any) => defaultValue,

			has: (key: string) => false,

			inspect: (key: string) => undefined,

			update: async (
				key: string,

				value: any,

				target?: any,

				override?: any,
			) => {},

			// Stub for effectiveValue, a newer property
			// effectiveValue: (key: string) => undefined,

			// Cast to `any` as it's a minimal stub
		}) as any,

	// Parameter name matches vscode.d.ts
	getWorkspaceFolder: (uriAsParameter: any) => undefined,

	applyEdit: async (edit: WorkspaceEdit) => false,

	saveAll: async (includeUntitled?: boolean) => false,

	// File Operations / Search
	findFiles: async (
		include: any,

		exclude?: any,

		maxResults?: any,

		token?: any,
	) => [],

	openTextDocument: async (uriOrOptions?: any) => {
		throw new Error(
			"STUB: workspace.openTextDocument not implemented in vscode.ts stub.",
		);
	},

	registerTextDocumentContentProvider: (scheme: string, provider: any) =>
		new Disposable(() => {}),

	registerFileSystemProvider: (
		scheme: string,

		provider: any,

		options?: any,
	) => new Disposable(() => {}),

	createFileSystemWatcher: (
		globPattern: any,

		ignoreCreateEvents?: boolean,

		ignoreChangeEvents?: boolean,

		ignoreDeleteEvents?: boolean,
	) => ({
		dispose: () => {},

		onDidCreate: new VscodeEmitter<Uri>().event,

		onDidChange: new VscodeEmitter<Uri>().event,

		onDidDelete: new VscodeEmitter<Uri>().event,

		ignoreCreateEvents: false,

		ignoreChangeEvents: false,

		ignoreDeleteEvents: false,
	}),

	getRelativePath: (pathOrUri: any, includeWorkspaceFolder?: boolean) => "",

	asRelativePath: (pathOrUri: any, includeWorkspaceFolder?: boolean) =>
		// Use its own stub
		workspaceStub.getRelativePath(pathOrUri, includeWorkspaceFolder),

	// Task Provider Registration
	registerTaskProvider: (type: string, provider: any) =>
		// `any` for provider type in stub
		new Disposable(() => {}),

	// Notebook related (stubs)
	// notebookDocuments: [],

	// openNotebookDocument: async (uriOrType?: any) => { throw new Error("STUB: workspace.openNotebookDocument not implemented."); },

	// registerNotebookSerializer: (notebookType: string, serializer: any, options?: any) => new Disposable(() => {}),

	// onDidOpenNotebookDocument: new VscodeEmitter<any>().event,

	// onDidCloseNotebookDocument: new VscodeEmitter<any>().event,

	// onDidSaveNotebookDocument: new VscodeEmitter<any>().event,

	// Event Emitters (all NOPs for the stub)
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

	// Added
	onDidChangeConfiguration: new VscodeEmitter<any>().event,

	onDidGrantWorkspaceTrust: new VscodeEmitter<void>().event,
};

const languagesStub: typeof import("vscode").languages = {
	// Provider registration methods (all return NOP disposables)
	registerHoverProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerCompletionItemProvider: (
		selector: any,

		provider: any,

		...triggerCharacters: string[]
	) => new Disposable(() => {}),

	registerSignatureHelpProvider: (
		selector: any,

		provider: any,

		metadataOrTriggerChars?: any,
	) => new Disposable(() => {}),

	registerDefinitionProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerTypeDefinitionProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDeclarationProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerImplementationProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerReferenceProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentHighlightProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentSymbolProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerWorkspaceSymbolProvider: (provider: any) =>
		// No selector
		new Disposable(() => {}),

	registerCodeActionsProvider: (
		selector: any,

		provider: any,

		metadata?: any,
	) => new Disposable(() => {}),

	registerCodeLensProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentFormattingEditProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentRangeFormattingEditProvider: (
		selector: any,

		provider: any,
	) => new Disposable(() => {}),

	registerOnTypeFormattingEditProvider: (
		selector: any,

		provider: any,

		firstTriggerCharacter: string,

		...moreTriggerCharacters: string[]
	) => new Disposable(() => {}),

	registerRenameProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentLinkProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentColorProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerFoldingRangeProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerSelectionRangeProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerCallHierarchyProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerTypeHierarchyProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerLinkedEditingRangeProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerInlayHintsProvider: (selector: any, provider: any) =>
		new Disposable(() => {}),

	registerDocumentSemanticTokensProvider: (
		selector: any,

		provider: any,

		legend: any,
	) => new Disposable(() => {}),

	registerDocumentRangeSemanticTokensProvider: (
		selector: any,

		provider: any,

		legend: any,
	) => new Disposable(() => {}),

	// Language utility methods
	getLanguages: async () => [],

	setTextDocumentsLanguage: async (
		document: TextDocument,

		languageId: string,

		// Return original doc as NOP
	) => document,

	// Returns a match score, 0 for no match.
	match: (selector: any, document: any) => 0,

	// Diagnostics
	createDiagnosticCollection: (name?: string) =>
		({
			name: name || "stub-diagnostic-collection",

			clear: () => {},

			dispose: () => {},

			forEach: () => {},

			get: () => undefined,

			has: () => false,

			delete: () => {},

			set: () => {},

			// Cast to `any` as it's a minimal stub
		}) as any,

	get onDidChangeDiagnostics() {
		return new VscodeEmitter<readonly Uri[]>().event;

		// NOP event
	},

	// Stub for top-level helper, if it exists
	// getDiagnostics: (resource?: Uri) => [],

	// Language Status
	setLanguageStatus: (selector: any, status: any) => new Disposable(() => {}),

	createLanguageStatusItem: (id: string, selector: any) =>
		({
			id,

			selector,

			text: "",

			name: "StubStatus",

			severity: LanguageStatusSeverity.Information,

			command: undefined,

			accessibilityInformation: undefined,

			busy: false,

			dispose: () => {},

			onDidChange: new VscodeEmitter<void>().event,

			// Cast to `any` for stub
		}) as any,

	// Direct provider invocation methods (stubs, these are advanced)
	// provideHover: async () => undefined,

	// etc.
	// provideCompletionItems: async () => undefined,
};

const envStub: typeof import("vscode").env = {
	appName: "Cocoon Stub Application",

	// Typically a string path
	appRoot: undefined,

	// 'desktop' | 'web' | 'codespaces'
	appHost: "desktop",

	// Main URI scheme for the app
	uriScheme: "cocoon-code-stub",

	// BCP 47 language tag
	language: "en",

	machineId: "stubbed-machine-id-vscode.ts",

	sessionId: "stubbed-session-id-vscode.ts",

	// Workspace trust state
	isTrusted: true,

	// Whether the current window is connected to a remote
	isRemote: false,

	// Name of the remote authority (e.g., 'ssh-remote', 'wsl')
	remoteName: undefined,

	shell:
		(process?.platform === "win32"
			? process?.env?.ComSpec
			: process?.env?.SHELL) || "unknown_shell_stub",

	// vscode.UIKind.Desktop = 1, vscode.UIKind.Web = 2
	uiKind: 1,

	clipboard: {
		// Stubbed clipboard
		readText: async () => "",

		writeText: async (text: string) => {},
	},

	// Returns boolean indicating success
	openExternal: async (target: Uri) => false,

	// Returns the transformed URI
	asExternalUri: async (target: Uri) => target,

	get onDidChangeTelemetryLevel() {
		return new VscodeEmitter<any>().event;

		// NOP event
	},

	get onDidChangeShell() {
		return new VscodeEmitter<string>().event;

		// NOP event
	},

	// Whether this is the first session after a new install
	isNewAppInstall: false,

	// Whether this is a release build (vs. development)
	isBuilt: true,

	// Other env properties (appQuality, appCommit, appServerPort, etc.) are often more internal.
};

const extensionsStub: typeof import("vscode").extensions = {
	getExtension: <T>(extensionId: string) => undefined,

	get all() {
		return Object.freeze([]);

		// Readonly empty array
	},

	get onDidChange() {
		return new VscodeEmitter<void>().event;

		// NOP event
	},

	// determineExtensionUri, getExtensionPath, etc. (more internal methods if needed for stubs)
};

const debugStub: typeof import("vscode").debug = {
	// Properties
	activeDebugSession: undefined,

	activeDebugConsole: Object.freeze({
		append: () => {},

		appendLine: () => {},
	}),

	breakpoints: Object.freeze([]),

	// Events (all NOPs)
	onDidStartDebugSession: new VscodeEmitter<any>().event,

	onDidTerminateDebugSession: new VscodeEmitter<any>().event,

	onDidChangeActiveDebugSession: new VscodeEmitter<any>().event,

	onDidReceiveDebugSessionCustomEvent: new VscodeEmitter<any>().event,

	onDidChangeBreakpoints: new VscodeEmitter<any>().event,

	// Methods
	startDebugging: async (folder: any, nameOrConfig: any, options?: any) =>
		false,

	stopDebugging: async (session?: any) => {},

	registerDebugConfigurationProvider: (
		debugType: string,

		provider: any,

		triggerKind?: any,
	) => new Disposable(() => {}),

	registerDebugAdapterDescriptorFactory: (debugType: string, factory: any) =>
		new Disposable(() => {}),

	registerDebugAdapterTrackerFactory: (debugType: string, factory: any) =>
		// Added
		new Disposable(() => {}),

	addBreakpoints: async (breakpoints: readonly any[]) => {},

	removeBreakpoints: async (breakpoints: readonly any[]) => {},

	asDebugSourceUri: (source: any, session?: any) =>
		// Dummy URI
		Uri.parse("debug-stub:" + (source.name || "unknown")),

	getDebugProtocolBreakpoint: async (breakpoint: any, session?: any) =>
		undefined,

	// customDebugAdapterRequest, saveState, readMemory, writeMemory etc.
};

const tasksStub: typeof import("vscode").tasks = {
	// Properties
	taskExecutions: Object.freeze([]),

	// Events (all NOPs)
	onDidStartTask: new VscodeEmitter<any>().event,

	onDidEndTask: new VscodeEmitter<any>().event,

	onDidStartTaskProcess: new VscodeEmitter<any>().event,

	onDidEndTaskProcess: new VscodeEmitter<any>().event,

	// Methods
	registerTaskProvider: (type: string, provider: any) =>
		new Disposable(() => {}),

	fetchTasks: async (filter?: any) => [],

	executeTask: async (task: any) => {
		throw new Error(
			"STUB: tasks.executeTask not implemented in vscode.ts stub.",
		);
	},

	// getTask, etc.
};

// --- API Object Definition ---
// This object forms the default export of this module.
// It re-exports the stubs for each namespace and also directly re-exports
// common classes and enums for direct access (e.g., `vscode.Uri`).
const vscodeApiExportObject = {
	// Namespaces
	commands: commandsStub,

	window: windowStub,

	workspace: workspaceStub,

	languages: languagesStub,

	env: envStub,

	extensions: extensionsStub,

	debug: debugStub,

	tasks: tasksStub,

	// Stubs for other less common top-level namespaces
	scm: {
		createSourceControl: (id: string, label: string, rootUri?: Uri) =>
			({
				id,

				label,

				rootUri,

				inputBox: undefined,

				count: 0,

				acceptInputCommand: undefined,

				get onDidChangeInputBox() {
					return new VscodeEmitter<string>().event;

					// Added missing event
				},

				get onDidChangeStatusBarCommands() {
					return new VscodeEmitter<void>().event;

					// Added missing event
				},

				get onDidChangeState() {
					return new VscodeEmitter<void>().event;

					// Added missing event
				},

				createResourceGroup: (id: string, label: string) => ({
					id,

					label,

					dispose: () => {},
				}),

				dispose: () => {},
			}) as any,

		// rootUri and inputBox are typically accessed via a SourceControl instance
		// get rootUri() { return undefined; },

		// get inputBox() { return undefined; },

		get onDidChangeVisibleSourceControls() {
			return new VscodeEmitter<
				readonly import("vscode").SourceControl[]
			>().event;

			// Added
		},

		get visibleSourceControls() {
			return [];

			// Added
		},
	} as any,

	comments: {
		createCommentController: (id: string, label: string) =>
			({
				id,

				label,

				commentingRangeProvider: undefined,

				reactionHandler: undefined,

				options: undefined,

				dispose: () => {},

				createCommentThread: (
					uri: Uri,

					range: Range,

					comments: readonly Comment[],
				) =>
					({
						uri,

						range,

						comments,

						// CommentThreadCollapsibleState.Collapsed
						collapsibleState: 0,

						canReply: true,

						contextValue: undefined,

						label: undefined,

						dispose: () => {},

						get onDidChange() {
							return new VscodeEmitter<void>().event;

							// Added
						},
					}) as any,
			}) as any,
	} as any,

	notebooks: {
		createNotebookController: (
			id: string,

			notebookType: string,

			label: string,

			handler?: (
				cells: any[],

				notebook: any,

				controller: any,
			) => void | Thenable<void>,
		) =>
			({
				id,

				notebookType,

				label,

				supportedLanguages: undefined,

				executeHandler: handler,

				dispose: () => {},

				createNotebookCellExecution: (cell: any) =>
					({
						cell,

						executionOrder: undefined,

						start: () => {},

						end: () => {},

						clearOutput: async () => {},

						replaceOutput: async () => {},

						appendOutput: async () => {},

						appendOutputItems: async () => {},
					}) as any,

				get onDidChangeSelectedNotebooks() {
					return new VscodeEmitter<{
						readonly notebook: import("vscode").NotebookDocument;

						readonly selected: boolean;
					}>().event;

					// Added
				},
			}) as any,

		// Events for notebooks
		onDidOpenNotebookDocument: new VscodeEmitter<any>().event,

		onDidCloseNotebookDocument: new VscodeEmitter<any>().event,

		// Added
		onDidSaveNotebookDocument: new VscodeEmitter<any>().event,

		// Added
		onDidChangeNotebookDocument: new VscodeEmitter<any>().event,

		registerNotebookSerializer: (
			notebookType: string,

			serializer: any,

			options?: any,

			// Added
		) => new Disposable(() => {}),

		// Properties
		// Already on workspaceStub typically
		// notebookDocuments: [],

		// activeNotebookEditor: undefined,

		// visibleNotebookEditors: [],

		// onDidChangeActiveNotebookEditor: new VscodeEmitter<any>().event,

		// onDidChangeVisibleNotebookEditors: new VscodeEmitter<any>().event,

		// onDidChangeNotebookEditorSelection: new VscodeEmitter<any>().event,

		// onDidChangeNotebookEditorVisibleRanges: new VscodeEmitter<any>().event,
	} as any,

	tests: {
		// createTaskRunner: (profile: any, options?: any) => ({ run: () => {}, dispose: () => {}} as any),

		createTestController: (
			id: string,

			label: string,

			refreshHandler?: (
				token: CancellationToken,
			) => Thenable<void> | void,
		) =>
			({
				id,

				label,

				refreshHandler,

				items: {
					add: () => {},

					delete: () => {},

					forEach: () => {},

					get: () => undefined,

					size: 0,

					replace: () => {},

					// Simplified collection
				} as any,

				createRunProfile: (
					label: string,

					kind: any,

					runHandler: any,

					isDefault?: boolean,

					tag?: any,

					supportsContinuousRun?: boolean,
				) =>
					({
						label,

						kind,

						runHandler,

						isDefault,

						tag,

						supportsContinuousRun,

						dispose: () => {},

						configureHandler: undefined,
					}) as any,

				createTestRun: (
					request: any,

					name?: string,

					persist?: boolean,
				) =>
					({
						name,

						token: new CancellationTokenSource().token,

						enqueued: () => {},

						started: () => {},

						skipped: () => {},

						failed: () => {},

						errored: () => {},

						passed: () => {},

						end: () => {},

						coverageProvider: undefined,

						output: "",
					}) as any,

				resolveHandler: undefined,

				dispose: () => {},

				get onDidChangeTestResults() {
					return new VscodeEmitter<void>().event;

					// Added
				},

				get résultat() {
					return [];

					// Added TestRunResult[] stub
				},
			}) as any,

		// Added
		runTests: async (request: any, token?: CancellationToken) => {},

		get testResults() {
			return [];

			// Added
		},

		get onDidChangeTestResults() {
			return new VscodeEmitter<void>().event;

			// Added
		},

		createTestRunProfile: (
			controller: any,

			label: string,

			kind: any,

			runHandler: any,

			isDefault?: boolean,

			tag?: any,

			supportsContinuousRun?: boolean,
		) =>
			({
				label,

				kind,

				runHandler,

				isDefault,

				tag,

				supportsContinuousRun,

				dispose: () => {},

				configureHandler: undefined,

				// Added
			}) as any,
	} as any,

	// Language Models (lm) - Stub, actual implementation is complex
	lm: {
		selectLanguageModels: async (selector: any) => [],

		sendChatRequest: async (
			modelId: string,

			messages: any[],

			options?: any,

			token?: CancellationToken,
		) => ({ stream: (async function* () {})() }) as any,

		registerChatResponseProvider: (
			id: string,

			provider: any,

			metadata: any,
		) => new Disposable(() => {}),

		get onDidChangeLanguageModels() {
			return new VscodeEmitter<any>().event;
		},

		get languageModels() {
			return [];
		},
	} as any,

	// Re-export core classes and enums directly on this default export object
	// This makes them accessible as `vscode.Uri`, `vscode.Position`, etc.
	Uri,

	Position,

	Range,

	Selection,

	Location,

	Disposable,

	CancellationToken,

	CancellationTokenSource,

	CancellationError,

	// Note: This is VS Code's Emitter, not Node's.
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

	// This is the interface `vscode.Command`
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

	MarkdownString,

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

	TaskRevealKind,

	TaskPanelKind,

	DebugConsoleMode,

	DebugConfigurationProviderTriggerKind,

	ProgressLocation,

	CompletionItemKind,

	CompletionTriggerKind,

	SignatureHelpTriggerKind,

	IndentAction,

	LanguageStatusSeverity,

	// Exporting the re-aliased LogLevel
	LogLevel: VscodeApiLogLevel,

	// Exporting the re-aliased FileSystemError
	FileSystemError: VscodeFileSystemError,

	QuickPickItemKind,

	TreeItem,

	TreeItemCollapsibleState,
};

// --- Default Export of the API Object ---
// This `vscodeApiExportObject` is what `require('vscode')` will yield at compile time for extensions.
export default vscodeApiExportObject;

// --- Named Exports for Individual Namespaces ---
// This allows extensions to use `import { commands, window } from 'vscode';`
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

// Added Language Models namespace
export const lm: typeof vscodeApiExportObject.lm = vscodeApiExportObject.lm;

// Note: Individual classes and enums (Uri, Position, LogLevel, etc.) are already exported
// by name at the top of this file via the re-export from `../Shim/out/vscode`.
