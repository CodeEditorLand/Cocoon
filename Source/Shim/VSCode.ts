/*
 * File: Cocoon/Source/Shim/VSCode.ts
 * Responsibility: Provides a TypeScript definition and stub implementation of the VS Code API, enabling extensions to run in the Node.js sidecar (Cocoon) by intercepting and proxying API calls to the Rust backend (Mountain) via IPC.
 * Modified: 2025-06-07 00:57:34 UTC
 * Export: // (vscode.Event)
	type Event, // Crucial for extension activation
	type ExtensionContext, // Type for `vscode.commands` namespace
	type Commands, // Type for `vscode.env` namespace
	type Env, // Type for `vscode.languages.createDiagnosticCollection()`
	type DiagnosticCollection, // Type for `vscode.languages` namespace
	type Languages, // Type for `vscode.window.createOutputChannel({log: true, // Type for `vscode.workspace.fs`
	type FileSystem, // VS Code's Emitter class, // `vscode.Command` interface for commands
	type Command, // type alias
	type Definition, // type alias
	type ExtensionMode, // type alias
	type LanguageModelChatMessageRole, // type alias for clarity
	type Declaration, AccessibilityInformation, AuthenticationSession, CallHierarchyIncomingCall, CallHierarchyItem, CallHierarchyOutgoingCall, CancellationError, CancellationToken, CancellationTokenSource, ChatAgentCompletionItem, ChatAgentDetectedParticipant, ChatAgentReplyFollowup, ChatAgentRequest, ChatAgentResult, ChatAgentWelcomeMessageContent, ChatContext, ChatMessage, ChatResponseFragment, ChatResponseStream, ChatResultFeedback, ChatVariableValue, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, CodeLens, Color, ColorInformation, ColorPresentation, Command, Comment, CommentAuthorInformation, CommentController, CommentReaction, CommentReply, CommentThread, CommentThreadCollapsibleState, CommentingRangeProvider, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemLabel, CompletionItemProvider, CompletionList, CompletionTriggerKind, ConfigurationChangeEvent, ConfigurationTarget, CustomDocument, CustomDocumentBackup, CustomDocumentBackupContext, CustomDocumentEditEvent, CustomDocumentOpenContext, CustomEditorProvider, CustomExecution, CustomReadonlyEditorProvider, CustomTextEditorProvider, DataTransfer, DataTransferItem, Debug, DebugAdapter, DebugAdapterDescriptor, DebugAdapterDescriptorFactory, DebugAdapterExecutable, DebugAdapterInlineImplementation, DebugAdapterNamedPipeServer, DebugAdapterServer, DebugAdapterTracker, DebugAdapterTrackerFactory, DebugConfiguration, DebugConfigurationProvider, DebugConfigurationProviderTriggerKind, DebugConsoleMode, DebugProtocolBreakpoint, DebugProtocolMessage, DebugProtocolSource, DebugSession, DebugSessionCustomEvent, DebugSessionOptions, DeclarationProvider, DefinitionLink, DefinitionProvider, Diagnostic, DiagnosticChangeEvent, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag, Disposable, DocumentColorProvider, DocumentDropEdit, DocumentDropEditProvider, DocumentFilter, DocumentFormattingEditProvider, DocumentHighlight, DocumentHighlightKind, DocumentHighlightProvider, DocumentLink, DocumentLinkProvider, DocumentRangeFormattingEditProvider, DocumentRangeSemanticTokensProvider, DocumentSemanticTokensProvider, DocumentSymbol, DocumentSymbolProvider, EndOfLine, Environment, EnvironmentVariableCollection, EnvironmentVariableMutator, Extension, ExtensionKind, ExtensionMode, FileChangeEvent, FileCreateEvent, FileDecoration, FileDecorationProvider, FileDeleteEvent, FileRenameEvent, FileStat, FileSystemError, FileSystemProvider, FileType, FileWillCreateEvent, FileWillDeleteEvent, FileWillRenameEvent, FoldingContext, FoldingRange, FoldingRangeKind, FoldingRangeProvider, FormattingOptions, GlobPattern, Hover, HoverProvider, ImplementationProvider, IndentAction, IndexedText, InlayHint, InlayHintKind, InlayHintLabelPart, InlayHintsProvider, InlineCompletionContext, InlineCompletionItem, InlineCompletionList, InlineCompletionTriggerKind, InlineValuesProvider, InputBox, InputBoxOptions, InputStep, InteractiveRequest, InteractiveResponse, InteractiveSession, InteractiveSessionCopyAction, InteractiveSessionDynamicRequest, InteractiveSessionFollowup, InteractiveSessionProvider, InteractiveSessionVote, InteractiveSessionWelcomeMessage, Language, LanguageModel, LanguageModelAccessInformation, LanguageModelChat, LanguageModelChatMessage, LanguageModelChatRequest, LanguageModelChatResponse, LanguageModelChatResponseFragment, LanguageModelChatSelector, LanguageModelStatusChangeEvent, LanguageStatusSeverity, LinkedEditingRangeProvider, LinkedEditingRanges, Location, Notebook, SourceControl, Task, Test, Window, Workspace, often used by extensions
	EventEmitter, type DisposableLike, type Extension
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon VS Code API Shim Entry Point
 * --------------------------------------------------------------------------------------------
 * This file serves as the module that extensions import or require. Its structure
 * has been transformed to exclusively use singular, action-oriented PascalCase
 * for all identifiers to adhere to the specified synthesis rules.
 *
 * It re-exports core VS Code API types (which are already PascalCase) and defines
 * a `VscodeApiExport` object. This object and its nested namespace stubs
 * (e.g., `CommandStub`, `WindowStub`) define the *shape* of the `vscode` module
 * that extensions will be provided.
 *
 * **Important Runtime Note:** The actual functional API object provided to extensions
 * at runtime is dynamically constructed by the `ApiFactoryProvider` function.
 * That factory will populate an object of this shape with functional shim instances.
 * This file, therefore, defines the compile-time contract.
 *
 *--------------------------------------------------------------------------------------------*/

// --- Import and Re-export Core VS Code API Types, Classes, & Enums ---
// These are sourced from `../Shim/out/vscode.js` and are already in PascalCase,
// satisfying the naming convention.
export {
	AccessibilityInformation,
	AuthenticationSession,
	CallHierarchyIncomingCall,
	CallHierarchyItem,
	CallHierarchyOutgoingCall,
	CancellationError,
	CancellationToken,
	CancellationTokenSource,
	ChatAgentCompletionItem,
	ChatAgentDetectedParticipant,
	ChatAgentReplyFollowup,
	ChatAgentRequest,
	ChatAgentResult,
	ChatAgentWelcomeMessageContent,
	ChatContext,
	ChatMessage,
	ChatResponseFragment,
	ChatResponseStream,
	ChatResultFeedback,
	ChatVariableValue,
	CodeAction,
	CodeActionContext,
	CodeActionKind,
	CodeActionProvider,
	CodeLens,
	Color,
	ColorInformation,
	ColorPresentation,
	Comment,
	CommentAuthorInformation,
	CommentController,
	CommentReaction,
	CommentReply,
	CommentThread,
	CommentThreadCollapsibleState,
	CommentingRangeProvider,
	// `vscode.Command` interface for commands
	type Command,
	// Type for `vscode.commands` namespace
	type Commands,
	CompletionContext,
	CompletionItem,
	CompletionItemKind,
	CompletionItemLabel,
	CompletionItemProvider,
	CompletionList,
	CompletionTriggerKind,
	ConfigurationChangeEvent,
	ConfigurationTarget,
	CustomDocument,
	CustomDocumentBackup,
	CustomDocumentBackupContext,
	CustomDocumentEditEvent,
	CustomDocumentOpenContext,
	CustomEditorProvider,
	CustomExecution,
	CustomReadonlyEditorProvider,
	CustomTextEditorProvider,
	DataTransfer,
	DataTransferItem,
	DebugAdapter,
	DebugAdapterDescriptor,
	DebugAdapterDescriptorFactory,
	DebugAdapterExecutable,
	DebugAdapterInlineImplementation,
	DebugAdapterNamedPipeServer,
	DebugAdapterServer,
	DebugAdapterTracker,
	DebugAdapterTrackerFactory,
	DebugConfiguration,
	DebugConfigurationProvider,
	DebugConfigurationProviderTriggerKind,
	DebugConsoleMode,
	DebugProtocolBreakpoint,
	DebugProtocolMessage,
	DebugProtocolSource,
	DebugSession,
	DebugSessionCustomEvent,
	DebugSessionOptions,
	// type alias for clarity
	type Declaration as VscodeDeclaration,
	DeclarationProvider,
	// type alias
	type Definition as VscodeDefinition,
	DefinitionProvider,
	DefinitionLink,
	Diagnostic,
	DiagnosticChangeEvent,
	// Type for `vscode.languages.createDiagnosticCollection()`
	type DiagnosticCollection,
	DiagnosticRelatedInformation,
	DiagnosticSeverity,
	DiagnosticTag,
	Disposable,
	type DisposableLike,
	DocumentColorProvider,
	DocumentDropEdit,
	DocumentDropEditProvider,
	DocumentFilter,
	DocumentFormattingEditProvider,
	DocumentHighlight,
	DocumentHighlightKind,
	DocumentHighlightProvider,
	DocumentLink,
	DocumentLinkProvider,
	DocumentRangeFormattingEditProvider,
	DocumentRangeSemanticTokensProvider,
	DocumentSemanticTokensProvider,
	DocumentSymbol,
	DocumentSymbolProvider,
	EndOfLine,
	// Type for `vscode.env` namespace
	type Env,
	EnvironmentVariableCollection,
	EnvironmentVariableMutator,
	// (vscode.Event)
	type Event,
	// VS Code's Emitter class, often used by extensions
	EventEmitter as VscodeEmitter,
	type Extension,
	// Crucial for extension activation
	type ExtensionContext,
	ExtensionKind,
	ExtensionMode,
	// type alias
	type ExtensionMode as VscodeExtensionMode,
	FileChangeEvent,
	FileCreateEvent,
	FileDecoration,
	FileDecorationProvider,
	FileDeleteEvent,
	FileRenameEvent,
	FileStat,
	// Type for `vscode.workspace.fs`
	type FileSystem,
	FileSystemError,
	FileSystemProvider,
	FileType,
	FileWillCreateEvent,
	FileWillDeleteEvent,
	FileWillRenameEvent,
	FoldingContext,
	FoldingRange,
	FoldingRangeKind,
	FoldingRangeProvider,
	FormattingOptions,
	GlobPattern,
	Hover,
	HoverProvider,
	ImplementationProvider,
	IndentAction,
	IndexedText,
	InlayHint,
	InlayHintKind,
	InlayHintLabelPart,
	InlayHintsProvider,
	InlineCompletionContext,
	InlineCompletionItem,
	InlineCompletionList,
	InlineCompletionTriggerKind,
	InlineValuesProvider,
	InputBox,
	InputBoxOptions,
	InputStep,
	InteractiveRequest,
	InteractiveResponse,
	InteractiveSession,
	InteractiveSessionCopyAction,
	InteractiveSessionDynamicRequest,
	InteractiveSessionFollowup,
	InteractiveSessionProvider,
	InteractiveSessionVote,
	InteractiveSessionWelcomeMessage,
	LanguageModelAccessInformation,
	LanguageModelChat,
	LanguageModelChatMessage,
	// type alias
	type LanguageModelChatMessageRole as VscodeLanguageModelChatMessageRole,
	LanguageModelChatRequest,
	LanguageModelChatResponse,
	LanguageModelChatResponseFragment,
	LanguageModelChatSelector,
	LanguageModelStatusChangeEvent,
	// Type for `vscode.languages` namespace
	type Languages,
	LanguageStatusSeverity,
	LinkedEditingRangeProvider,
	LinkedEditingRanges,
	Location,
	// Type for `vscode.window.createOutputChannel({log: true})`
	type LogOutputChannel,
	LogLevel,
	MarkdownString,
	// Type for `ExtensionContext.globalState` and `workspaceState`
	type Memento,
	MessageItem,
	MessageOptions,
	NotebookCell,
	NotebookCellData,
	NotebookCellExecutionState,
	NotebookCellExecutionStateChangeEvent,
	NotebookCellKind,
	NotebookCellOutput,
	NotebookCellOutputItem,
	NotebookController,
	NotebookData,
	NotebookDocument,
	NotebookDocumentCellChangeEvent,
	NotebookDocumentContentChangeEvent,
	NotebookDocumentMetadataChangeEvent,
	NotebookEditor,
	NotebookEditorSelectionChangeEvent,
	NotebookEditorVisibleRangesChangeEvent,
	NotebookRange,
	NotebookRendererScript,
	NotebookSerializer,
	OnTypeFormattingEditProvider,
	OpenDialogOptions,
	// Type for `vscode.window.createOutputChannel()`
	type OutputChannel,
	Position,
	ProcessExecution,
	ProgressLocation,
	ProgressOptions,
	Pseudoterminal,
	QuickDiffProvider,
	QuickInputButtons,
	QuickPickItem,
	QuickPickItemButtonEvent,
	QuickPickItemKind,
	QuickPickOnDidChangeValueEvent,
	QuickPickOptions,
	Range,
	ReferenceContext,
	ReferenceProvider,
	RelativePattern,
	RenameProvider,
	SaveDialogOptions,
	// Type for `ExtensionContext.secrets`
	type SecretStorage,
	SecretStorageChangeEvent,
	Selection,
	SelectionRange,
	SelectionRangeProvider,
	SemanticTokens,
	SemanticTokensBuilder,
	SemanticTokensEdit,
	SemanticTokensEdits,
	SemanticTokensLegend,
	ShellExecution,
	ShellExecutionOptions,
	SignatureHelp,
	SignatureHelpContext,
	SignatureHelpProvider,
	SignatureHelpTriggerKind,
	SnippetString,
	SourceControl,
	SourceControlInputBox,
	SourceControlResourceGroup,
	SourceControlResourceState,
	StatusBarAlignment,
	// Type for `vscode.window.createStatusBarItem()`
	type StatusBarItem,
	SymbolInformation,
	SymbolKind,
	Tab,
	TabGroup,
	TabInputChat,
	TabInputCustom,
	TabInputNotebook,
	TabInputNotebookDiff,
	TabInputTerminal,
	TabInputText,
	TabInputTextDiff,
	TabInputWebview,
	Task,
	TaskDefinition,
	TaskEndEvent,
	TaskExecution,
	TaskFilter,
	// type alias
	type TaskGroup as VscodeTaskGroup,
	TaskPanelKind,
	TaskProcessEndEvent,
	TaskProcessStartEvent,
	TaskProvider,
	TaskRevealKind,
	TaskScope,
	TaskStartEvent,
	// Type for `vscode.window.createTerminal()`
	type Terminal,
	TerminalDimensions,
	TerminalExitReason,
	TerminalExitStatus,
	TerminalLink,
	TerminalLinkContext,
	TerminalLinkProvider,
	TerminalOptions,
	TerminalProfile,
	TerminalProfileProvider,
	TerminalState,
	TestController,
	TestCoverage,
	TestItem,
	TestMessage,
	TestRun,
	TestRunProfile,
	TestRunRequest,
	TestRunResult,
	// Crucial type for document-related APIs
	type TextDocument,
	TextDocumentChangeReason,
	TextDocumentContentChangeEvent,
	TextDocumentContentProvider,
	TextDocumentSaveReason,
	type TextDocumentWillSaveEvent,
	// Type for `vscode.window.activeTextEditor`
	type TextEditor,
	TextEditorDecorationType,
	TextEditorOptions,
	type TextEditorOptionsChangeEvent,
	TextEditorRevealType,
	type TextEditorSelectionChangeEvent,
	type TextEditorViewColumnChangeEvent,
	type TextEditorVisibleRangesChangeEvent,
	TextEdit,
	TextLine,
	TextSearchComplete,
	TextSearchOptions,
	TextSearchProvider,
	TextSearchQuery,
	TextSearchResult,
	ThemeColor,
	ThemeIcon,
	TreeDataProvider,
	TreeDragAndDropController,
	TreeItem,
	TreeItemCollapsibleState,
	TreeView,
	TreeViewExpansionEvent,
	TreeViewOptions,
	TreeViewSelectionChangeEvent,
	TreeViewVisibilityChangeEvent,
	TypeDefinitionProvider,
	TypeHierarchyItem,
	TypeHierarchyProvider,
	// type alias
	type UIKind as VscodeUIKind,
	Uri,
	UriHandler,
	ViewColumn,
	Webview,
	WebviewOptions,
	WebviewPanel,
	WebviewPanelOnDidChangeViewStateEvent,
	WebviewPanelOptions,
	WebviewPanelSerializer,
	WebviewPort,
	WebviewView,
	WebviewViewProvider,
	WebviewViewResolveContext,
	// Type for `vscode.window` namespace
	type Window,
	WindowState,
	// Type for `vscode.workspace` namespace
	type Workspace,
	// Type for `vscode.workspace.getConfiguration()`
	type WorkspaceConfiguration,
	WorkspaceEdit,
	// Type for `vscode.workspace.workspaceFolders`
	type WorkspaceFolder,
	type WorkspaceFoldersChangeEvent,
	WorkspaceSymbol,
	WorkspaceSymbolProvider,
} from "../Shim/out/vscode";

const CommandStub: typeof import("vscode").commands = {
	RegisterCommand: (Id: string, Command: (...Argument: any[]) => any) =>
		new Disposable(() => {}),
	ExecuteCommand: async (Command: string, ...Argument: any[]) => undefined,
	GetCommand: async () => [],
};

const WindowStub: typeof import("vscode").window = {
	ActiveTextEditor: undefined,
	VisibleTextEditor: [],
	Terminal: [],
	ActiveTerminal: undefined,
	State: Object.freeze({ focused: true, active: true, visible: true }),

	ShowInformationMessage: async (Message: string, ...Argument: any[]) =>
		undefined,
	ShowWarningMessage: async (Message: string, ...Argument: any[]) =>
		undefined,
	ShowErrorMessage: async (Message: string, ...Argument: any[]) => undefined,

	CreateStatusBarItem: (
		IdOrAlignment: any,
		AlignmentOrPriority: any,
		Priority?: any,
	) =>
		({
			id:
				typeof IdOrAlignment === "string"
					? IdOrAlignment
					: "CocoonStubStatusBar-" + Date.now() + Math.random(),
			alignment: StatusBarAlignment.Left,
			priority: 0,
			name: "StubItem",
			text: "",
			tooltip: undefined,
			color: undefined,
			backgroundColor: undefined,
			command: undefined,
			accessibilityInformation: undefined,
			Show: () => console.warn("STUB: StatusBarItem.Show called."),
			Hide: () => console.warn("STUB: StatusBarItem.Hide called."),
			Dispose: () => console.warn("STUB: StatusBarItem.Dispose called."),
		}) as any,

	SetStatusBarMessage: (Text: string, HideOrPromise?: any) => {
		console.warn(`STUB: SetStatusBarMessage('${Text}')`);
		return new Disposable(() => {});
	},

	CreateOutputChannel: (Name: string, OptionOrLanguageId?: any) =>
		({
			name: Name,
			Append: () =>
				console.warn(`STUB: OutputChannel(${Name}).Append called.`),
			AppendLine: () =>
				console.warn(`STUB: OutputChannel(${Name}).AppendLine called.`),
			Clear: () =>
				console.warn(`STUB: OutputChannel(${Name}).Clear called.`),
			Replace: () =>
				console.warn(`STUB: OutputChannel(${Name}).Replace called.`),
			Show: () =>
				console.warn(`STUB: OutputChannel(${Name}).Show called.`),
			Hide: () =>
				console.warn(`STUB: OutputChannel(${Name}).Hide called.`),
			Dispose: () =>
				console.warn(`STUB: OutputChannel(${Name}).Dispose called.`),
			...(typeof OptionOrLanguageId === "object" &&
			OptionOrLanguageId &&
			OptionOrLanguageId.log === true
				? {
						LogLevel: LogLevel.Info,
						OnDidChangeLogLevel: new VscodeEmitter<LogLevel>()
							.event,
						Trace: () => {},
						Debug: () => {},
						Info: () => {},
						Warn: () => {},
						Error: () => {},
						SetLogLevel: () => {},
					}
				: {}),
		}) as any,

	ShowQuickPick: async () => undefined,
	ShowInputBox: async () => undefined,

	ShowOpenDialog: async (Option?: import("vscode").OpenDialogOptions) =>
		undefined,
	ShowSaveDialog: async (Option?: import("vscode").SaveDialogOptions) =>
		undefined,
	ShowWorkspaceFolderPick: async (
		Option?: import("vscode").WorkspaceFolderPickOptions,
	) => undefined,

	WithProgress: async (
		Option: import("vscode").ProgressOptions,
		Task: Function,
	) => {
		console.warn(
			"STUB: WithProgress called. Task will run without UI progress.",
		);
		const CancellationTokenSource = new CancellationTokenSource();
		try {
			return await Promise.resolve(
				Task({ Report: () => {} }, CancellationTokenSource.token),
			);
		} finally {
			CancellationTokenSource.dispose();
		}
	},

	CreateTerminal: (Option?: any) => {
		throw new Error("STUB: CreateTerminal not implemented.");
	},
	CreateWebviewPanel: (
		ViewType: string,
		Title: string,
		ShowOption: any,
		Option?: any,
	) => {
		throw new Error("STUB: CreateWebviewPanel not implemented.");
	},
	RegisterWebviewPanelSerializer: (ViewType: string, Serializer: any) =>
		new Disposable(() => {}),
	CreateTreeView: <T>(
		ViewId: string,
		Option: import("vscode").TreeViewOptions<T>,
	) => {
		throw new Error("STUB: CreateTreeView not implemented.");
	},
	RegisterTreeDataProvider: <T>(
		ViewId: string,
		TreeDataProvider: import("vscode").TreeDataProvider<T>,
	) => new Disposable(() => {}),

	ShowTextDocument: async (DocumentOrUri: any, Option?: any) => {
		throw new Error("STUB: ShowTextDocument not implemented.");
	},
	RegisterUriHandler: (Handler: any) => new Disposable(() => {}),
	RegisterCustomEditorProvider: (
		ViewType: string,
		Provider: any,
		Option?: any,
	) => new Disposable(() => {}),
	RegisterTerminalLinkProvider: (Provider: any) => new Disposable(() => {}),
	RegisterTerminalProfileProvider: (Id: string, Provider: any) =>
		new Disposable(() => {}),

	OnDidChangeActiveTextEditor: new VscodeEmitter<any>().event,
	OnDidChangeVisibleTextEditor: new VscodeEmitter<any>().event,
	OnDidChangeTextEditorSelection: new VscodeEmitter<any>().event,
	OnDidChangeTextEditorVisibleRange: new VscodeEmitter<any>().event,
	OnDidChangeTextEditorOption: new VscodeEmitter<any>().event,
	OnDidChangeTextEditorViewColumn: new VscodeEmitter<any>().event,
	OnDidChangeWindowState: new VscodeEmitter<any>().event,
	OnDidChangeActiveTerminal: new VscodeEmitter<any>().event,
	OnDidOpenTerminal: new VscodeEmitter<any>().event,
	OnDidCloseTerminal: new VscodeEmitter<any>().event,
	OnDidChangeTerminalState: new VscodeEmitter<any>().event,
};

const WorkspaceStub: typeof import("vscode").workspace = {
	Name: undefined,
	WorkspaceFile: undefined,
	WorkspaceFolder: undefined,
	IsTrusted: true,
	FileSystem: {
		GetStat: async (Uri: Uri) => {
			throw new FileSystemError(
				"STUB: FileSystem.GetStat not implemented.",
			);
		},
		ReadDirectory: async (Uri: Uri) => [],
		ReadFile: async (Uri: Uri) => new Uint8Array(0),
		WriteFile: async (Uri: Uri, Content: Uint8Array) => {},
		CreateDirectory: async (Uri: Uri) => {},
		Delete: async (Uri: Uri, Option?: any) => {},
		Rename: async (Source: Uri, Target: Uri, Option?: any) => {},
		Copy: async (Source: Uri, Target: Uri, Option?: any) => {},
		IsWritableFileSystem: (Scheme: string) => undefined,
		OnDidChangeFile: new VscodeEmitter<any[]>().event,
	} as any,

	TextDocument: [],

	GetConfiguration: (Section?: string, Scope?: any) =>
		({
			Get: (Key: string, DefaultValue?: any) => DefaultValue,
			Has: (Key: string) => false,
			Inspect: (Key: string) => undefined,
			Update: async (
				Key: string,
				Value: any,
				Target?: any,
				Override?: any,
			) => {},
		}) as any,

	GetWorkspaceFolder: (UriAsParameter: any) => undefined,
	ApplyEdit: async (Edit: WorkspaceEdit) => false,
	SaveAll: async (IncludeUntitled?: boolean) => false,

	FindFile: async (
		Include: any,
		Exclude?: any,
		MaxResult?: any,
		Token?: any,
	) => [],
	OpenTextDocument: async (UriOrOption?: any) => {
		throw new Error("STUB: OpenTextDocument not implemented.");
	},
	RegisterTextDocumentContentProvider: (Scheme: string, Provider: any) =>
		new Disposable(() => {}),
	RegisterFileSystemProvider: (Scheme: string, Provider: any, Option?: any) =>
		new Disposable(() => {}),
	CreateFileSystemWatcher: (
		GlobPattern: any,
		IgnoreCreateEvent?: boolean,
		IgnoreChangeEvent?: boolean,
		IgnoreDeleteEvent?: boolean,
	) => ({
		Dispose: () => {},
		OnDidCreate: new VscodeEmitter<Uri>().event,
		OnDidChange: new VscodeEmitter<Uri>().event,
		OnDidDelete: new VscodeEmitter<Uri>().event,
		ignoreCreateEvents: false,
		ignoreChangeEvents: false,
		ignoreDeleteEvents: false,
	}),

	GetRelativePath: (PathOrUri: any, IncludeWorkspaceFolder?: boolean) => "",
	AsRelativePath: (PathOrUri: any, IncludeWorkspaceFolder?: boolean) =>
		WorkspaceStub.GetRelativePath(PathOrUri, IncludeWorkspaceFolder),

	RegisterTaskProvider: (Type: string, Provider: any) =>
		new Disposable(() => {}),

	OnDidChangeWorkspaceFolder: new VscodeEmitter<any>().event,
	OnDidOpenTextDocument: new VscodeEmitter<any>().event,
	OnDidCloseTextDocument: new VscodeEmitter<any>().event,
	OnDidChangeTextDocument: new VscodeEmitter<any>().event,
	OnDidSaveTextDocument: new VscodeEmitter<any>().event,
	OnWillSaveTextDocument: new VscodeEmitter<any>().event,
	OnWillCreateFile: new VscodeEmitter<any>().event,
	OnDidCreateFile: new VscodeEmitter<any>().event,
	OnWillDeleteFile: new VscodeEmitter<any>().event,
	OnDidDeleteFile: new VscodeEmitter<any>().event,
	OnWillRenameFile: new VscodeEmitter<any>().event,
	OnDidRenameFile: new VscodeEmitter<any>().event,
	OnDidChangeConfiguration: new VscodeEmitter<any>().event,
	OnDidGrantWorkspaceTrust: new VscodeEmitter<void>().event,
};

const LanguageStub: typeof import("vscode").languages = {
	RegisterHoverProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterCompletionItemProvider: (
		Selector: any,
		Provider: any,
		...TriggerCharacter: string[]
	) => new Disposable(() => {}),
	RegisterSignatureHelpProvider: (
		Selector: any,
		Provider: any,
		MetadataOrTriggerCharacter?: any,
	) => new Disposable(() => {}),
	RegisterDefinitionProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterTypeDefinitionProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDeclarationProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterImplementationProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterReferenceProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentHighlightProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentSymbolProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterWorkspaceSymbolProvider: (Provider: any) =>
		new Disposable(() => {}),
	RegisterCodeActionsProvider: (
		Selector: any,
		Provider: any,
		Metadata?: any,
	) => new Disposable(() => {}),
	RegisterCodeLensProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentFormattingEditProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentRangeFormattingEditProvider: (
		Selector: any,
		Provider: any,
	) => new Disposable(() => {}),
	RegisterOnTypeFormattingEditProvider: (
		Selector: any,
		Provider: any,
		FirstTriggerCharacter: string,
		...MoreTriggerCharacter: string[]
	) => new Disposable(() => {}),
	RegisterRenameProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentLinkProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentColorProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterFoldingRangeProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterSelectionRangeProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterCallHierarchyProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterTypeHierarchyProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterLinkedEditingRangeProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterInlayHintsProvider: (Selector: any, Provider: any) =>
		new Disposable(() => {}),
	RegisterDocumentSemanticTokensProvider: (
		Selector: any,
		Provider: any,
		Legend: any,
	) => new Disposable(() => {}),
	RegisterDocumentRangeSemanticTokensProvider: (
		Selector: any,
		Provider: any,
		Legend: any,
	) => new Disposable(() => {}),

	GetLanguage: async () => [],
	SetTextDocumentLanguage: async (
		Document: TextDocument,
		LanguageId: string,
	) => Document,
	Match: (Selector: any, Document: any) => 0,

	CreateDiagnosticCollection: (Name?: string) =>
		({
			name: Name || "StubDiagnosticCollection",
			Clear: () => {},
			Dispose: () => {},
			ForEach: () => {},
			Get: () => undefined,
			Has: () => false,
			Delete: () => {},
			Set: () => {},
		}) as any,

	get OnDidChangeDiagnostic() {
		return new VscodeEmitter<readonly Uri[]>().event;
	},

	SetLanguageStatus: (Selector: any, Status: any) => new Disposable(() => {}),
	CreateLanguageStatusItem: (Id: string, Selector: any) =>
		({
			id: Id,
			selector: Selector,
			text: "",
			name: "StubStatus",
			severity: LanguageStatusSeverity.Information,
			command: undefined,
			accessibilityInformation: undefined,
			busy: false,
			Dispose: () => {},
			OnDidChange: new VscodeEmitter<void>().event,
		}) as any,
};

const EnvironmentStub: typeof import("vscode").env = {
	AppName: "Cocoon Stub Application",
	AppRoot: undefined,
	AppHost: "desktop",
	UriScheme: "cocoon-code-stub",
	Language: "en",
	MachineId: "StubbedMachineId",
	SessionId: "StubbedSessionId",
	IsTrusted: true,
	IsRemote: false,
	RemoteName: undefined,
	Shell:
		(process?.platform === "win32"
			? process?.env?.ComSpec
			: process?.env?.SHELL) || "UnknownShellStub",
	UiKind: 1,
	Clipboard: {
		ReadText: async () => "",
		WriteText: async (Text: string) => {},
	},
	OpenExternal: async (Target: Uri) => false,
	AsExternalUri: async (Target: Uri) => Target,
	get OnDidChangeTelemetryLevel() {
		return new VscodeEmitter<any>().event;
	},
	get OnDidChangeShell() {
		return new VscodeEmitter<string>().event;
	},
	IsNewAppInstall: false,
	IsBuilt: true,
};

const ExtensionStub: typeof import("vscode").extensions = {
	GetExtension: <T>(ExtensionId: string) => undefined,
	get All() {
		return Object.freeze([]);
	},
	get OnDidChange() {
		return new VscodeEmitter<void>().event;
	},
};

const DebugStub: typeof import("vscode").debug = {
	ActiveDebugSession: undefined,
	ActiveDebugConsole: Object.freeze({
		Append: () => {},
		AppendLine: () => {},
	}),
	Breakpoint: Object.freeze([]),

	OnDidStartDebugSession: new VscodeEmitter<any>().event,
	OnDidTerminateDebugSession: new VscodeEmitter<any>().event,
	OnDidChangeActiveDebugSession: new VscodeEmitter<any>().event,
	OnDidReceiveDebugSessionCustomEvent: new VscodeEmitter<any>().event,
	OnDidChangeBreakpoint: new VscodeEmitter<any>().event,

	StartDebugging: async (Folder: any, NameOrConfig: any, Option?: any) =>
		false,
	StopDebugging: async (Session?: any) => {},
	RegisterDebugConfigurationProvider: (
		DebugType: string,
		Provider: any,
		TriggerKind?: any,
	) => new Disposable(() => {}),
	RegisterDebugAdapterDescriptorFactory: (DebugType: string, Factory: any) =>
		new Disposable(() => {}),
	RegisterDebugAdapterTrackerFactory: (DebugType: string, Factory: any) =>
		new Disposable(() => {}),
	AddBreakpoint: async (Breakpoint: readonly any[]) => {},
	RemoveBreakpoint: async (Breakpoint: readonly any[]) => {},
	AsDebugSourceUri: (Source: any, Session?: any) =>
		Uri.parse("DebugStub:" + (Source.name || "Unknown")),
	GetDebugProtocolBreakpoint: async (Breakpoint: any, Session?: any) =>
		undefined,
};

const TaskStub: typeof import("vscode").tasks = {
	TaskExecution: Object.freeze([]),

	OnDidStartTask: new VscodeEmitter<any>().event,
	OnDidEndTask: new VscodeEmitter<any>().event,
	OnDidStartTaskProcess: new VscodeEmitter<any>().event,
	OnDidEndTaskProcess: new VscodeEmitter<any>().event,

	RegisterTaskProvider: (Type: string, Provider: any) =>
		new Disposable(() => {}),
	FetchTask: async (Filter?: any) => [],
	ExecuteTask: async (Task: any) => {
		throw new Error("STUB: ExecuteTask not implemented.");
	},
};

const VscodeApiExport = {
	// Namespaces
	Command: CommandStub,
	Window: WindowStub,
	Workspace: WorkspaceStub,
	Language: LanguageStub,
	Environment: EnvironmentStub,
	Extension: ExtensionStub,
	Debug: DebugStub,
	Task: TaskStub,

	// Other Namespaces
	SourceControl: {
		CreateSourceControl: (Id: string, Label: string, RootUri?: Uri) =>
			({
				id: Id,
				label: Label,
				rootUri: RootUri,
				InputBox: undefined,
				Count: 0,
				AcceptInputCommand: undefined,
				get OnDidChangeInputBox() {
					return new VscodeEmitter<string>().event;
				},
				get OnDidChangeStatusBarCommand() {
					return new VscodeEmitter<void>().event;
				},
				get OnDidChangeState() {
					return new VscodeEmitter<void>().event;
				},
				CreateResourceGroup: (Id: string, Label: string) => ({
					id: Id,
					label: Label,
					Dispose: () => {},
				}),
				Dispose: () => {},
			}) as any,
		get OnDidChangeVisibleSourceControl() {
			return new VscodeEmitter<
				readonly import("vscode").SourceControl[]
			>().event;
		},
		get VisibleSourceControl() {
			return [];
		},
	} as any,

	Comment: {
		CreateCommentController: (Id: string, Label: string) =>
			({
				id: Id,
				label: Label,
				CommentingRangeProvider: undefined,
				ReactionHandler: undefined,
				Option: undefined,
				Dispose: () => {},
				CreateCommentThread: (
					Uri: Uri,
					Range: Range,
					Comment: readonly Comment[],
				) =>
					({
						uri: Uri,
						range: Range,
						comments: Comment,
						collapsibleState: 0,
						CanReply: true,
						ContextValue: undefined,
						Label: undefined,
						Dispose: () => {},
						get OnDidChange() {
							return new VscodeEmitter<void>().event;
						},
					}) as any,
			}) as any,
	} as any,

	Notebook: {
		CreateNotebookController: (
			Id: string,
			NotebookType: string,
			Label: string,
			Handler?: (
				Cell: any[],
				Notebook: any,
				Controller: any,
			) => void | Thenable<void>,
		) =>
			({
				id: Id,
				notebookType: NotebookType,
				label: Label,
				SupportedLanguage: undefined,
				ExecuteHandler: Handler,
				Dispose: () => {},
				CreateNotebookCellExecution: (Cell: any) =>
					({
						cell: Cell,
						ExecutionOrder: undefined,
						Start: () => {},
						End: () => {},
						ClearOutput: async () => {},
						ReplaceOutput: async () => {},
						AppendOutput: async () => {},
						AppendOutputItem: async () => {},
					}) as any,
				get OnDidChangeSelectedNotebook() {
					return new VscodeEmitter<{
						readonly notebook: import("vscode").NotebookDocument;
						readonly selected: boolean;
					}>().event;
				},
			}) as any,
		OnDidOpenNotebookDocument: new VscodeEmitter<any>().event,
		OnDidCloseNotebookDocument: new VscodeEmitter<any>().event,
		OnDidSaveNotebookDocument: new VscodeEmitter<any>().event,
		OnDidChangeNotebookDocument: new VscodeEmitter<any>().event,
		RegisterNotebookSerializer: (
			NotebookType: string,
			Serializer: any,
			Option?: any,
		) => new Disposable(() => {}),
	} as any,

	Test: {
		CreateTestController: (
			Id: string,
			Label: string,
			RefreshHandler?: (
				Token: CancellationToken,
			) => Thenable<void> | void,
		) =>
			({
				id: Id,
				label: Label,
				RefreshHandler: RefreshHandler,
				Item: {
					Add: () => {},
					Delete: () => {},
					ForEach: () => {},
					Get: () => undefined,
					size: 0,
					Replace: () => {},
				} as any,
				CreateRunProfile: (
					Label: string,
					Kind: any,
					RunHandler: any,
					IsDefault?: boolean,
					Tag?: any,
					SupportContinuousRun?: boolean,
				) =>
					({
						label: Label,
						kind: Kind,
						runHandler: RunHandler,
						isDefault: IsDefault,
						tag: Tag,
						supportsContinuousRun: SupportContinuousRun,
						Dispose: () => {},
						ConfigureHandler: undefined,
					}) as any,
				CreateTestRun: (
					Request: any,
					Name?: string,
					Persist?: boolean,
				) =>
					({
						name: Name,
						token: new CancellationTokenSource().token,
						Enqueued: () => {},
						Started: () => {},
						Skipped: () => {},
						Failed: () => {},
						Errored: () => {},
						Passed: () => {},
						End: () => {},
						CoverageProvider: undefined,
						Output: "",
					}) as any,
				ResolveHandler: undefined,
				Dispose: () => {},
				get OnDidChangeTestResult() {
					return new VscodeEmitter<void>().event;
				},
				get Result() {
					return [];
				},
			}) as any,
		RunTest: async (Request: any, Token?: CancellationToken) => {},
		get TestResult() {
			return [];
		},
		get OnDidChangeTestResult() {
			return new VscodeEmitter<void>().event;
		},
		CreateTestRunProfile: (
			Controller: any,
			Label: string,
			Kind: any,
			RunHandler: any,
			IsDefault?: boolean,
			Tag?: any,
			SupportContinuousRun?: boolean,
		) =>
			({
				label: Label,
				kind: Kind,
				runHandler: RunHandler,
				isDefault: IsDefault,
				tag: Tag,
				supportsContinuousRun: SupportContinuousRun,
				Dispose: () => {},
				ConfigureHandler: undefined,
			}) as any,
	} as any,

	LanguageModel: {
		SelectLanguageModel: async (Selector: any) => [],
		SendChatRequest: async (
			ModelId: string,
			Message: any[],
			Option?: any,
			Token?: CancellationToken,
		) => ({ Stream: (async function* () {})() }) as any,
		RegisterChatResponseProvider: (
			Id: string,
			Provider: any,
			Metadata: any,
		) => new Disposable(() => {}),
		get OnDidChangeLanguageModel() {
			return new VscodeEmitter<any>().event;
		},
		get LanguageModel() {
			return [];
		},
	} as any,

	// Re-export core classes and enums directly
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
	LogLevel,
	FileSystemError,
	QuickPickItemKind,
	TreeItem,
	TreeItemCollapsibleState,
};

export default VscodeApiExport;

export const Command: typeof VscodeApiExport.Command = VscodeApiExport.Command;
export const Window: typeof VscodeApiExport.Window = VscodeApiExport.Window;
export const Workspace: typeof VscodeApiExport.Workspace =
	VscodeApiExport.Workspace;
export const Language: typeof VscodeApiExport.Language =
	VscodeApiExport.Language;
export const Environment: typeof VscodeApiExport.Environment =
	VscodeApiExport.Environment;
export const Extension: typeof VscodeApiExport.Extension =
	VscodeApiExport.Extension;
export const Debug: typeof VscodeApiExport.Debug = VscodeApiExport.Debug;
export const Task: typeof VscodeApiExport.Task = VscodeApiExport.Task;
export const SourceControl: typeof VscodeApiExport.SourceControl =
	VscodeApiExport.SourceControl;
export const Comment: typeof VscodeApiExport.Comment = VscodeApiExport.Comment;
export const Notebook: typeof VscodeApiExport.Notebook =
	VscodeApiExport.Notebook;
export const Test: typeof VscodeApiExport.Test = VscodeApiExport.Test;
export const LanguageModel: typeof VscodeApiExport.LanguageModel =
	VscodeApiExport.LanguageModel;
