/**
 * @module Window
 * @description
 * Implements the VS Code API surface for window-level operations.
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/api/common/extHostWindow.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Window.ts (borrowed working patterns)
 * - Mountain Integration: Delegates window operations via gRPC to native UI layer
 *
 * Patterns borrowed from this file:
 * - Window state tracking with Ref
 * - Text document display coordination
 * - Event stream pattern for state changes
 *
 * New implementation includes:
 * - Mountain gRPC integration (replaced IPC.SendRequest)
 * - Enhanced show* methods (InformationMessage, WarningMessage, etc.)
 * - Comprehensive TODOs for all window operations
 * - StatusBar, OutputChannel, WebViewPanel integration hooks
 * - TypeConverter integration points
 *
 * Dependencies:
 * - IMountainClientService: For gRPC communication with Mountain
 * - TypeConverter/Dialog: For dialog option serialization
 * - TypeConverter/QuickInput: For quick pick and input box serialization
 * - TypeConverter/StatusBar: For status bar item management
 *
 * TODOs:
 * - HIGH: Implement gRPC calls for all window operations (Mountain integration)
 * - MEDIUM: Implement all show* methods with proper error handling
 * - MEDIUM: Integrate TypeConverter modules (Dialog, QuickInput, StatusBar)
 * - MEDIUM: Add StatusBar stub implementation
 * - LOW: Implement progress tracking for long-running operations
 * - LOW: Create WebView panel management
 * - LOW: Implement TreeView integration
 * - ARCHITECTURE-PATTERN: src/vs/workbench/api/browser/mainThreadWindow.ts (Mountain side implementation needed)
 * - VSCODE-LIFT: src/vs/workbench/api/common/extHostWindow.ts (complete window API surface)
 */

import { Effect, Ref, Context } from "effect";
import type * as VSCode from "vscode";

// Import current Cocoon interfaces
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";

// Import type converters
import { FromAPI as OpenDialogOptionFromAPI } from "../TypeConverter/Dialog/OpenDialogOption.js";
import { FromAPI as SaveDialogOptionFromAPI } from "../TypeConverter/Dialog/SaveDialogOption.js";
import {
	SerializeItems,
	SerializeButtons,
} from "../TypeConverter/QuickInput.js";
import { FromAPI as StatusBarFromAPI } from "../TypeConverter/StatusBar.js";

/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {
	readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	readonly Debug: (
		Message: string,
		...Data: unknown[],
	) => Effect.Effect<void>;
	readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
	readonly Warn: (
		Message: string,
		...Data: unknown[],
	) => Effect.Effect<void>;
	readonly Error: (
		Message: string,
		...Data: unknown[],
	) => Effect.Effect<void>;
}

/**
 * @interface WorkSpace
 * @description WorkSpace interface for accessing text editors
 */
export interface WorkSpace {
	readonly activeTextEditor: VSCode.TextEditor | undefined;
	readonly visibleTextEditors: readonly VSCode.TextEditor[];
}

/**
 * @interface Window
 * @description
 * The contract for the Window service, mirroring `vscode.window` API surface
 * with Effect-TS integration and PascalCase method names.
 *
 * Specification: src/vs/workbench/api/common/extHostWindow.ts (ExtHostWindowShape)
 */
export interface Window {
	readonly state: VSCode.WindowState;
	readonly activeTextEditor: VSCode.TextEditor | undefined;
	readonly visibleTextEditors: readonly VSCode.TextEditor[];
	readonly ShowTextDocument: (
		DocumentOrUri: VSCode.Uri | VSCode.TextDocument,
		ColumnOrOptions?: VSCode.ViewColumn | VSCode.TextDocumentShowOptions,
		PreserveFocus?: boolean,
	) => Effect.Effect<VSCode.TextEditor, Error>;
	readonly ShowInformationMessage: (
		Message: string,
		...Items: string[]
	) => Effect.Effect<string | undefined, Error>;
	readonly ShowWarningMessage: (
		Message: string,
		...Items: string[]
	) => Effect.Effect<string | undefined, Error>;
	readonly ShowErrorMessage: (
		Message: string,
		...Items: string[]
	) => Effect.Effect<string | undefined, Error>;
	readonly ShowQuickPick: <T extends string>(
		Items: readonly T[] | VSCode.QuickPickItem[],
		Options?: VSCode.QuickPickOptions,
	) => Effect.Effect<T | VSCode.QuickPickItem | undefined, Error>;
	readonly ShowInputBox: (
		Options?: VSCode.InputBoxOptions,
	) => Effect.Effect<string | undefined, Error>;
	readonly ShowOpenDialog: (
		Options?: VSCode.OpenDialogOptions,
	) => Effect.Effect<VSCode.Uri[] | undefined, Error>;
	readonly ShowSaveDialog: (
		Options?: VSCode.SaveDialogOptions,
	) => Effect.Effect<VSCode.Uri | undefined, Error>;
	readonly CreateStatusBarItem: (
		Id?: string,
		Alignment?: VSCode.StatusBarAlignment,
		Priority?: number,
	) => Effect.Effect<VSCode.StatusBarItem, Error>;
	readonly CreateOutputChannel: (
		Name: string,
	) => Effect.Effect<VSCode.OutputChannel, Error>;
	readonly CreateWebviewPanel: (
		ViewType: string,
		Title: string,
		ShowOptions:
			| VSCode.ViewColumn
			| { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean },
		Options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions,
	) => Effect.Effect<VSCode.WebviewPanel, Error>;
}

/**
 * @class WindowService
 * @description
 * The Effect-TS service for the Window service. Manages window state, displays
 * messages and dialogs, and coordinates text document display by delegating to
 * Mountain's native UI implementation via gRPC.
 *
 * Architecture Pattern: src/vs/workbench/api/common/extHostWindow.ts (ExtHostWindow)
 * Implementation: Effect-TS service with Ref-based state management
 *
 * TODOs:
 * - PERFORMANCE: Track window operation latency (target: <100ms for dialogs) (LOW)
 * - PERSISTENCE: Save and restore window dimensions (LOW)
 * - TELEMETRY: Track window usage patterns (LOW)
 * - ACCESSIBILITY: Integrate with screen reader APIs (LOW)
 */
export class WindowService extends Effect.Service<WindowService>()(
	"Service/Window",
	{
		effect: Effect.gen(function* () {
			// Resolve service dependencies
			const MountainClient = yield* IMountainClientService;
			const WorkSpace = yield* Context.Tag<WorkSpace>("Service/WorkSpace");
			const Logger = yield* Context.Tag<Logger>("Service/Logger");

			// Window state tracking
			const WindowStateRef = yield* Ref.make<VSCode.WindowState>({
				focused: true,
				active: true,
			});

			// TODO: Implement event stream emitter for onDidChangeWindowState (HIGH)
			// ARCHITECTURE-PATTERN: Source/Utility/EventStream.ts needs to be created
			const OnDidChangeWindowStateEmitter = new Map<
				string,
				(state: VSCode.WindowState) => void
			>();

			/**
			 * Accept window state change notification from Mountain
			 *
			 * TODO: Wire this up to gRPC notification handler in GRPCServerService (HIGH)
			 */
			const AcceptWindowStateChange = (
				State: VSCode.WindowState,
			) =>
				Effect.gen(function* () {
					yield* Ref.set(WindowStateRef, State);
					yield* Logger.Debug(
						`[WindowService] Window state changed: focused=${State.focused}, active=${State.active}`,
					);

					// Fire all registered listeners
					OnDidChangeWindowStateEmitter.forEach((listener) =>
						listener(State),
					);
				});

			/**
			 * Show text document in editor
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showTextDocument)
			 *
			 * TODOs:
			 * - TYPECONVERTER: Integrate TypeConverter for Range and ViewColumn (MEDIUM)
			 * - PERSISTENCE: Save view column preference (LOW)
			 * - ANIMATION: Add support for preserveFocus and preview modes (LOW)
			 */
			const ShowTextDocument = (
				DocumentOrUri: VSCode.Uri | VSCode.TextDocument,
				ColumnOrOptions?: VSCode.ViewColumn | VSCode.TextDocumentShowOptions,
				PreserveFocus?: boolean,
			): Effect.Effect<VSCode.TextEditor, Error> =>
				Effect.gen(function* () {
					const Uri =
						"uri" in DocumentOrUri
							? DocumentOrUri.uri
							: DocumentOrUri;

					yield* Logger.Info(
						`[WindowService] Showing text document: ${Uri.toString()}` +
							(ColumnOrOptions ? ` with options` : ""),
					);

					// TODO: Implement proper type conversion (MEDIUM)
					// const OptionsDTO = ColumnOrOptions ? TypeConverter.TextDocumentShowOptionsToDTO(ColumnOrOptions) : undefined;
					// const ViewColumnDTO = typeof ColumnOrOptions === 'number' ? TypeConverter.ViewColumnToDTO(ColumnOrOptions) : undefined;

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					// ARCHITECTURE-PATTERN: Mountain needs to implement mainThreadWindow.$showTextDocument
					const EditorId = yield* Effect.tryPromise({
						try: async () => {
							// return await MountainClient.sendRequest('window.showTextDocument', {
							//     uri: Uri.toString(),
							//     viewColumn: ViewColumnDTO,
							//     options: OptionsDTO,
							//     preserveFocus: PreserveFocus ?? false
							// });
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowTextDocument`,
							);
							return "editor-1";
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show text document`,
								error as Error,
							);
							throw error;
						},
					});

					// Find editor in workspace
					const Editor = WorkSpace.visibleTextEditors.find(
						(e) => (e as any).id === EditorId,
					);

					if (!Editor) {
						return yield* Effect.fail(
							new Error(
								`[WindowService] Could not find text editor with ID ${EditorId} after Mountain confirmation`,
							),
						);
					}

					return Editor;
				});

			/**
			 * Show information message to user
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showInformationMessage)
			 *
			 * TODOs:
			 * - ICONS: Support icon and detail options (LOW)
			 * - MODAL: Add modal option support (LOW)
			 */
			const ShowInformationMessage = (
				Message: string,
				...Items: string[]
			): Effect.Effect<string | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing information message: ${Message}`,
					);

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					// ARCHITECTURE-PATTERN: Mountain needs to implement native dialog display
					return yield* Effect.tryPromise({
						try: async () => {
							// if (Items.length === 0) {
							//     await MountainClient.sendRequest('window.showInformationMessage', { message: Message });
							//     return undefined;
							// } else {
							//     return await MountainClient.sendRequest('window.showInformationMessageWithItems', {
							//         message: Message,
							//         items: Items
							//     });
							// }
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowInformationMessage`,
							);
							return undefined;
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show information message`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Show warning message to user
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showWarningMessage)
			 */
			const ShowWarningMessage = (
				Message: string,
				...Items: string[]
			): Effect.Effect<string | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing warning message: ${Message}`,
					);

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					return yield* Effect.tryPromise({
						try: async () => {
							// return await MountainClient.sendRequest('window.showWarningMessage', {
							//     message: Message,
							//     items: Items
							// });
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowWarningMessage`,
							);
							return undefined;
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show warning message`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Show error message to user
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showErrorMessage)
			 */
			const ShowErrorMessage = (
				Message: string,
				...Items: string[]
			): Effect.Effect<string | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing error message: ${Message}`,
					);

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					return yield* Effect.tryPromise({
						try: async () => {
							// return await MountainClient.sendRequest('window.showErrorMessage', {
							//     message: Message,
							//     items: Items
							// });
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowErrorMessage`,
							);
							return undefined;
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show error message`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Show quick pick dialog
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showQuickPick)
			 * TODO: Integrate TypeConverter/QuickPick.ts for serialization (MEDIUM)
			 */
			const ShowQuickPick = <T extends string>(
				Items: readonly T[] | VSCode.QuickPickItem[],
				Options?: VSCode.QuickPickOptions,
			): Effect.Effect<T | VSCode.QuickPickItem | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing quick pick with ${Items.length} items`,
					);

					// TODO: Serialize items using TypeConverter (MEDIUM)
					// const ItemsDTO = SerializeItems(Items);
					// const ButtonsDTO = Options?.buttons ? SerializeButtons(Options.buttons) : undefined;

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					return yield* Effect.tryPromise({
						try: async () => {
							// return await MountainClient.sendRequest('window.showQuickPick', {
							//     items: ItemsDTO,
							//     options: Options,
							//     buttons: ButtonsDTO
							// });
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowQuickPick`,
							);
							return undefined;
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show quick pick`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Show input box
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showInputBox)
			 * TODO: Integrate TypeConverter/QuickInput.ts for serialization (MEDIUM)
			 */
			const ShowInputBox = (
				Options?: VSCode.InputBoxOptions,
			): Effect.Effect<string | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing input box${Options ? ` with placeholder: ${Options.placeholder}` : ""}`,
					);

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					return yield* Effect.tryPromise({
						try: async () => {
							// return await MountainClient.sendRequest('window.showInputBox', { options: Options });
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowInputBox`,
							);
							return undefined;
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show input box`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Show open dialog
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showOpenDialog)
			 * TODO: Integrate TypeConverter/Dialog/ for option serialization (MEDIUM)
			 */
			const ShowOpenDialog = (
				Options?: VSCode.OpenDialogOptions,
			): Effect.Effect<VSCode.Uri[] | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing open dialog`,
					);

					// TODO: Serialize options using TypeConverter (MEDIUM)
					// const OptionsDTO = Options ? OpenDialogOptionFromAPI(Options) : undefined;

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					return yield* Effect.tryPromise({
						try: async () => {
							// const Result = await MountainClient.sendRequest('window.showOpenDialog', {
							//     options: OptionsDTO
							// });
							// if (Result && Result.length > 0) {
							//     return Result.map(uri => VSCode.Uri.parse(uri));
							// }
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowOpenDialog`,
							);
							return undefined;
						},
						catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show open dialog`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Show save dialog
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (showSaveDialog)
			 * TODO: Integrate TypeConverter/Dialog/ for option serialization (MEDIUM)
			 */
			const ShowSaveDialog = (
				Options?: VSCode.SaveDialogOptions,
			): Effect.Effect<VSCode.Uri | undefined, Error> =>
				Effect.gen(function* () {
					yield* Logger.Debug(
						`[WindowService] Showing save dialog`,
					);

					// TODO: Serialize options using TypeConverter (MEDIUM)
					// const OptionsDTO = Options ? SaveDialogOptionFromAPI(Options) : undefined;

					// TODO: MOUNTAIN-INTEGRATION: Implement actual gRPC call (HIGH)
					return yield* Effect.tryPromise({
						try: async () => {
							// const Result = await MountainClient.sendRequest('window.showSaveDialog', {
							//     options: OptionsDTO
							// });
							// return Result ? VSCode.Uri.parse(Result) : undefined;
							yield* Logger.Warn(
								`[WindowService] TODO: Implement Mountain gRPC call for ShowSaveDialog`,
							);
							return undefined;
						},
							catch: (error) => {
							yield* Logger.Error(
								`[WindowService] Failed to show save dialog`,
								error as Error,
							);
							throw error;
						},
					});
				});

			/**
			 * Create status bar item
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWindow.ts (createStatusBarItem)
			 * TODO: Integrate TypeConverter/StatusBar.ts for status bar item management (MEDIUM)
			 */
			const CreateStatusBarItem = (
				Id?: string,
				Alignment?: VSCode.StatusBarAlignment,
				Priority?: number,
			): Effect.Effect<VSCode.StatusBarItem, Error> =>
				Effect.gen(function* () {
					yield* Logger.Info(
						`[WindowService] Creating status bar item${Id ? ` with id '${Id}'` : ""}`,
					);

					// TODO: STATUSBAR: Integrate with TypeConverter/StatusBar.ts (MEDIUM)
					// TODO: MOUNTAIN: Need to implement status bar management in Mountain (HIGH)
					// const StatusBarItemDTO = StatusBarFromAPI(statusBarItem, id, extensionId, commandConverter);

					return yield* Effect.succeed({
						text: "",
						alignment,
						priority,
						show: () => Effect.sync(() => {}),
						hide: () => Effect.sync(() => {}),
						dispose: () => Effect.sync(() => {}),
						// TODO: Implement full status bar item interface (MEDIUM)
					} as VSCode.StatusBarItem);
				});

			/**
			 * Create output channel
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostOutputService.ts
			 * TODO: Implement output channel service (LOW)
			 */
			const CreateOutputChannel = (
				Name: string,
			): Effect.Effect<VSCode.OutputChannel, Error> =>
				Effect.gen(function* () {
					yield* Logger.Info(
						`[WindowService] Creating output channel: ${Name}`,
					);

					// TODO: Implement output channel service (LOW)
					// OUTPUT-SERVICE: Need to create separate OutputService
					return yield* Effect.succeed({
						name: Name,
						append: (value: string) => Effect.sync(() => {}),
						appendLine: (value: string) => Effect.sync(() => {}),
						clear: () => Effect.sync(() => {}),
						show: () => Effect.sync(() => {}),
						hide: () => Effect.sync(() => {}),
						dispose: () => Effect.sync(() => {}),
						// TODO: Implement full output channel interface (LOW)
					} as VSCode.OutputChannel);
				});

			/**
			 * Create webview panel
			 *
			 * Implementation Pattern: src/vs/workbench/api/common/extHostWebview.ts
			 * TODO: Implement webview service (LOW)
			 */
			const CreateWebviewPanel = (
				ViewType: string,
				Title: string,
				ShowOptions:
					| VSCode.ViewColumn
					| { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean },
				Options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions,
			): Effect.Effect<VSCode.WebviewPanel, Error> =>
				Effect.gen(function* () {
					yield* Logger.Info(
						`[WindowService] Creating webview panel: ${ViewType} - ${Title}`,
					);

					// TODO: Implement webview service (LOW)
					// WEBVIEW-SERVICE: Need to create separate WebViewService
					// TODO: MOUNTAIN: Need to implement webview management in Mountain (HIGH)
					return yield* Effect.succeed({
						viewType: ViewType,
						title: Title,
						dispose: () => Effect.sync(() => {}),
						// TODO: Implement full webview panel interface (LOW)
					} as VSCode.WebviewPanel);
				});

			// Return the service implementation with PascalCase method names
			const ServiceImplementation: Window = {
				get state() {
					return Effect.runSync(Ref.get(WindowStateRef));
				},
				get activeTextEditor() {
					return WorkSpace.activeTextEditor;
				},
				get visibleTextEditors() {
					return WorkSpace.visibleTextEditors;
				},
				ShowTextDocument,
				ShowInformationMessage,
				ShowWarningMessage,
				ShowErrorMessage,
				ShowQuickPick,
				ShowInputBox,
				ShowOpenDialog,
				ShowSaveDialog,
				CreateStatusBarItem,
				CreateOutputChannel,
				CreateWebviewPanel,
			};

			return ServiceImplementation;
		}),
	},
) {}

/**
 * Window interface compatible with public VSCode API
 * This is what extensions see when they access vscode.window
 * 
 * TODO: Implement this as a namespace factory in APIFactoryService
 */
export interface VSCodeWindowAPI {
    readonly activeTextEditor: VSCode.TextEditor | undefined;
    readonly visibleTextEditors: readonly VSCode.TextEditor [];
    readonly activeColorTheme: VSCode.ColorTheme;
    readonly state: VSCode.WindowState;
    readonly onDidChangeActiveTextEditor: VSCode.Event<VSCode.TextEditor | undefined>;
    readonly onDidChangeVisibleTextEditors: VSCode.Event<VSCode.TextEditor []>;
    readonly onDidChangeWindowState: VSCode.Event<VSCode.WindowState>;
    showTextDocument(
        documentOrUri: VSCode.Uri | VSCode.TextDocument,
        column?: VSCode.ViewColumn,
        preserveFocus?: boolean
    ): Thenable<VSCode.TextEditor>;
    showInformationMessage(
        message: string,
        ...items: string[]
    ): Thenable<string>;
    showWarningMessage(
        message: string,
        ...items: string[]
    ): Thenable<string>;
    showErrorMessage(
        message: string,
        ...items: string[]
    ): Thenable<string>;
    showQuickPick<T extends string>(
        items: readonly T[],
        options?: VSCode.QuickPickOptions
    ): Thenable<T | undefined>;
    showInputBox(options?: VSCode.InputBoxOptions): Thenable<string | undefined>;
    createStatusBarItem(id?: string, alignment?: VSCode.StatusBarAlignment, priority?: number): VSCode.StatusBarItem;
    createOutputChannel(name: string): VSCode.OutputChannel;
    createWebviewPanel(
        viewType: string,
        title: string,
        showOptions: VSCode.ViewColumn | { viewColumn: VSCode.ViewColumn; preserveFocus?: boolean },
        options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions
    ): VSCode.WebviewPanel;
}
