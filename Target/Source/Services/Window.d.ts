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
import { Effect } from "effect";
import type * as VSCode from "vscode";
/**
 * @interface Logger
 * @description Logger interface for service logging
 */
export interface Logger {
    readonly Trace: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Debug: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Info: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Warn: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
    readonly Error: (Message: string, ...Data: unknown[]) => Effect.Effect<void>;
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
    readonly ShowTextDocument: (DocumentOrUri: VSCode.Uri | VSCode.TextDocument, ColumnOrOptions?: VSCode.ViewColumn | VSCode.TextDocumentShowOptions, PreserveFocus?: boolean) => Effect.Effect<VSCode.TextEditor, Error>;
    readonly ShowInformationMessage: (Message: string, ...Items: string[]) => Effect.Effect<string | undefined, Error>;
    readonly ShowWarningMessage: (Message: string, ...Items: string[]) => Effect.Effect<string | undefined, Error>;
    readonly ShowErrorMessage: (Message: string, ...Items: string[]) => Effect.Effect<string | undefined, Error>;
    readonly ShowQuickPick: <T extends string>(Items: readonly T[] | VSCode.QuickPickItem[], Options?: VSCode.QuickPickOptions) => Effect.Effect<T | VSCode.QuickPickItem | undefined, Error>;
    readonly ShowInputBox: (Options?: VSCode.InputBoxOptions) => Effect.Effect<string | undefined, Error>;
    readonly ShowOpenDialog: (Options?: VSCode.OpenDialogOptions) => Effect.Effect<VSCode.Uri[] | undefined, Error>;
    readonly ShowSaveDialog: (Options?: VSCode.SaveDialogOptions) => Effect.Effect<VSCode.Uri | undefined, Error>;
    readonly CreateStatusBarItem: (Id?: string, Alignment?: VSCode.StatusBarAlignment, Priority?: number) => Effect.Effect<VSCode.StatusBarItem, Error>;
    readonly CreateOutputChannel: (Name: string) => Effect.Effect<VSCode.OutputChannel, Error>;
    readonly CreateWebviewPanel: (ViewType: string, Title: string, ShowOptions: VSCode.ViewColumn | {
        viewColumn: VSCode.ViewColumn;
        preserveFocus?: boolean;
    }, Options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions) => Effect.Effect<VSCode.WebviewPanel, Error>;
}
declare const WindowService_base: Effect.Service.Class<WindowService, "Service/Window", {
    readonly effect: Effect.Effect<Window, unknown, unknown>;
}>;
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
export declare class WindowService extends WindowService_base {
}
/**
 * Window interface compatible with public VSCode API
 * This is what extensions see when they access vscode.window
 *
 * TODO: Implement this as a namespace factory in APIFactoryService
 */
export interface VSCodeWindowAPI {
    readonly activeTextEditor: VSCode.TextEditor | undefined;
    readonly visibleTextEditors: readonly VSCode.TextEditor[];
    readonly activeColorTheme: VSCode.ColorTheme;
    readonly state: VSCode.WindowState;
    readonly onDidChangeActiveTextEditor: VSCode.Event<VSCode.TextEditor | undefined>;
    readonly onDidChangeVisibleTextEditors: VSCode.Event<VSCode.TextEditor[]>;
    readonly onDidChangeWindowState: VSCode.Event<VSCode.WindowState>;
    showTextDocument(documentOrUri: VSCode.Uri | VSCode.TextDocument, column?: VSCode.ViewColumn, preserveFocus?: boolean): Thenable<VSCode.TextEditor>;
    showInformationMessage(message: string, ...items: string[]): Thenable<string>;
    showWarningMessage(message: string, ...items: string[]): Thenable<string>;
    showErrorMessage(message: string, ...items: string[]): Thenable<string>;
    showQuickPick<T extends string>(items: readonly T[], options?: VSCode.QuickPickOptions): Thenable<T | undefined>;
    showInputBox(options?: VSCode.InputBoxOptions): Thenable<string | undefined>;
    createStatusBarItem(id?: string, alignment?: VSCode.StatusBarAlignment, priority?: number): VSCode.StatusBarItem;
    createOutputChannel(name: string): VSCode.OutputChannel;
    createWebviewPanel(viewType: string, title: string, showOptions: VSCode.ViewColumn | {
        viewColumn: VSCode.ViewColumn;
        preserveFocus?: boolean;
    }, options?: VSCode.WebviewPanelOptions & VSCode.WebviewOptions): VSCode.WebviewPanel;
}
export {};
//# sourceMappingURL=Window.d.ts.map