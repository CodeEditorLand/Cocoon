/**
 * @module Window (ARCHIVED)
 * @description
 * ARCHIVED - This file has been adapted and moved to Source/Services/Window.ts
 *
 * Patterns borrowed from this file:
 * - Window state tracking with Ref
 * - Text document display coordination
 * - Event stream pattern for state changes
 *
 * New implementation in Source/Services/Window.ts includes:
 * - Mountain gRPC integration (replaced IPC.SendRequest)
 * - Enhanced show* methods (InformationMessage, WarningMessage, etc.)
 * - Comprehensive TODOs for all window operations
 * - StatusBar, OutputChannel, WebViewPanel integration hooks
 * - TypeConverter integration points
 *
 * Archive kept for reference during further implementation work.
 *
 * Original description: Defines the service for managing window-level state and orchestrating
 * calls to show documents in the editor, delegating to the host process via IPC.
 */
import { Effect } from "effect";
import type { Event, TextDocument, TextDocumentShowOptions, TextEditor, Uri, ViewColumn, WindowState } from "vscode";
import { IPCService } from "./IPC.js";
import { WorkSpaceService } from "./WorkSpace.js";
/**
 * @interface Window
 * @description The contract for the Window service.
 */
export interface Window {
    readonly state: WindowState;
    readonly onDidChangeWindowState: Event<WindowState>;
    readonly activeTextEditor: TextEditor | undefined;
    readonly ShowTextDocument: (documentOrUri: Uri | TextDocument, columnOrOptions?: ViewColumn | TextDocumentShowOptions, preserveFocus?: boolean) => Effect.Effect<TextEditor, Error>;
}
declare const WindowService_base: Effect.Service.Class<WindowService, "Service/Window", {
    readonly effect: Effect.Effect<Window, never, IPCService | WorkSpaceService>;
}>;
/**
 * @class WindowService
 * @description The `Effect.Service` for the Window service.
 */
export declare class WindowService extends WindowService_base {
}
export {};
//# sourceMappingURL=Window.d.ts.map