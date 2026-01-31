/**
 * @module Window
 * @description
 * Implements the VS Code API surface for window-level operations.
 *
 * RESPONSIBILITIES:
 * - Window state management and change notifications
 * - Display modal dialogs (information, warning, error messages)
 * - Show input boxes and quick pick menus
 * - Show file open/save dialogs
 * - Create and manage status bar items
 * - Create and manage output channels
 * - Create and manage webview panels
 * - Show progress indicators for long-running operations
 * - Display text documents in editor columns
 *
 * Architecture:
 * - Lifted from: src/vs/workbench/api/common/extHostWindow.ts (VSCode Dependency/Editor)
 * - Adapted from: Source/Archive/Window.ts (borrowed working patterns)
 * - Mountain Integration: Delegates window operations via gRPC to native UI layer
 *
 * Patterns borrowed from this file:
 * - Window state tracking with Ref
 * - Text document display coordination
 * - Event stream pattern for state changes (onDidChangeWindowState)
 *
 * Integration with TypeConverter:
 * - TypeConverter/Dialog/OpenDialogOption: Serializes open dialog options
 * - TypeConverter/Dialog/SaveDialogOption: Serializes save dialog options
 * - TypeConverter/QuickInput: Serializes quick pick items and input box options
 * - TypeConverter/StatusBar: Serializes status bar item state
 * - TypeConverter/WebView/*: Serializes webview panel and content options
 * - TypeConverter/Main/ViewColumn: Converts VSCode.ViewColumn to internal DTO
 *
 * Dependencies:
 * - IMountainClientService: For gRPC communication with Mountain
 * - TypeConverter modules: For serialization of options and objects
 * - CreateEventStream: For window state change event emitters
 * - WebViewPanelImplementation: For webview panel proxy implementation
 *
 * IMPLEMENTATION NOTES:
 * - All window operations delegate to Mountain's native UI implementation via gRPC
 * - TypeConverter integration is complete for all serialization paths
 * - Event streams are implemented using EventStream utility
 * - Status bar, output channel, and webview panel have full proxy implementations
 * - Progress indicator support with cancellation tokens
 *
 * TODOs (Mountain Integration - HIGH):
 * - Implement actual gRPC call in ShowTextDocument
 * - Implement actual gRPC call in ShowInformationMessage
 * - Implement actual gRPC call in ShowWarningMessage
 * - Implement actual gRPC call in ShowErrorMessage
 * - Implement actual gRPC call in ShowQuickPick
 * - Implement actual gRPC call in ShowInputBox
 * - Implement actual gRPC call in ShowOpenDialog
 * - Implement actual gRPC call in ShowSaveDialog
 * - Implement actual gRPC call in WithProgress
 * - Implement actual gRPC call in CreateStatusBarItem (and update methods)
 * - Implement actual gRPC call in CreateOutputChannel (and update methods)
 * - Implement actual gRPC call in CreateWebviewPanel
 * - Wire up AcceptWindowStateChange to gRPC notification handler
 *
 * TODOs (Enhancements - LOW):
 * - PERFORMANCE: Track window operation latency (target: <100ms for dialogs)
 * - PERSISTENCE: Save and restore window dimensions
 * - TELEMETRY: Track window usage patterns
 * - ACCESSIBILITY: Integrate with screen reader APIs
 * - ICONS/DETAIL: Support icon and detail in ShowInformationMessage (LOW)
 * - MODAL: Add modal option support to message dialogs (LOW)
 * - PREVIEW: Add support for preview mode in ShowTextDocument (LOW)
 *
 * ARCHITECTURE-PATTERN: src/vs/workbench/api/browser/mainThreadWindow.ts (Mountain side implementation needed)
 * VSCODE-LIFT: src/vs/workbench/api/common/extHostWindow.ts (complete window API surface)
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
    readonly onDidChangeWindowState: VSCode.Event<VSCode.WindowState>;
    readonly ShowTextDocument: (DocumentOrUri: VSCode.Uri | VSCode.TextDocument, ColumnOrOptions?: VSCode.ViewColumn | VSCode.TextDocumentShowOptions, PreserveFocus?: boolean) => Effect.Effect<VSCode.TextEditor, Error>;
    readonly ShowInformationMessage: (Message: string, ...Items: string[]) => Effect.Effect<string | undefined, Error>;
    readonly ShowWarningMessage: (Message: string, ...Items: string[]) => Effect.Effect<string | undefined, Error>;
    readonly ShowErrorMessage: (Message: string, ...Items: string[]) => Effect.Effect<string | undefined, Error>;
    readonly ShowQuickPick: <T extends string>(Items: readonly T[] | VSCode.QuickPickItem[], Options?: VSCode.QuickPickOptions) => Effect.Effect<T | VSCode.QuickPickItem | undefined, Error>;
    readonly ShowInputBox: (Options?: VSCode.InputBoxOptions) => Effect.Effect<string | undefined, Error>;
    readonly ShowOpenDialog: (Options?: VSCode.OpenDialogOptions) => Effect.Effect<VSCode.Uri[] | undefined, Error>;
    readonly ShowSaveDialog: (Options?: VSCode.SaveDialogOptions) => Effect.Effect<VSCode.Uri | undefined, Error>;
    readonly WithProgress: <T>(Options: VSCode.ProgressOptions, Task: (Progress: VSCode.Progress<{
        message?: string;
        increment?: number;
    }>, Token: VSCode.CancellationToken) => Promise<T>) => Effect.Effect<T, Error>;
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
 * RESPONSIBILITIES:
 * - Maintains window state (focused, active) with Ref-based tracking
 * - Emits onDidChangeWindowState events using EventStream
 * - Coordinates all window UI operations through Mountain gRPC interface
 * - Provides proxy implementations for StatusBarItem, OutputChannel, WebviewPanel
 * - Integrates TypeConverter for all option serialization
 *
 * Architecture Pattern: src/vs/workbench/api/common/extHostWindow.ts (ExtHostWindow)
 * Implementation: Effect-TS service with Ref-based state management
 *
 * IMPLEMENTATION STATUS:
 * - Window state management: COMPLETE (EventStream, Ref, AcceptWindowStateChange)
 * - ShowTextDocument: COMPLETE (TypeConverter)
 * - ShowInformationMessage: COMPLETE (TypeConverter)
 * - ShowWarningMessage: COMPLETE (TypeConverter)
 * - ShowErrorMessage: COMPLETE (TypeConverter)
 * - ShowQuickPick: COMPLETE (TypeConverter/QuickInput)
 * - ShowInputBox: COMPLETE (TypeConverter)
 * - ShowOpenDialog: COMPLETE (TypeConverter/Dialog/OpenDialogOption)
 * - ShowSaveDialog: COMPLETE (TypeConverter/Dialog/SaveDialogOption)
 * - WithProgress: COMPLETE (Progress reporter with cancellation)
 * - CreateStatusBarItem: COMPLETE (Full proxy implementation)
 * - CreateOutputChannel: COMPLETE (Full proxy implementation)
 * - CreateWebviewPanel: COMPLETE (TypeConverter/WebView)
 *
 * PENDING (Mountain Integration - HIGH):
 * - All gRPC calls marked with TODO need Mountain implementation
 * - See TODOs section in module header for list
 *
 * ENHANCEMENTS (Future - LOW):
 * - PERFORMANCE: Track window operation latency (target: <100ms for dialogs)
 * - PERSISTENCE: Save and restore window dimensions
 * - TELEMETRY: Track window usage patterns
 * - ACCESSIBILITY: Integrate with screen reader APIs
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