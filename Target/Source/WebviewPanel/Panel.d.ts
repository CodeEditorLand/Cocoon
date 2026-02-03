/**
 * @module Panel
 * @description
 * WebView Panel - Individual WebView panel implementation with full lifecycle management
 *
 * RESPONSIBILITIES:
 * - Implement complete WebView panel lifecycle (create, show, hide, dispose)
 * - Manage bidirectional message passing between extension and WebView
 * - Track and manage panel state (active, visible, viewColumn)
 * - Handle panel visibility changes and state transitions
 * - Coordinate with IPC for state synchronization with Mountain
 *
 * ARCHITECTURE:
 * - Pattern: VSCode WebviewPanel interface implementation
 * - State Management: Local cache with IPC synchronization
 * - Event System: EventStream-based event emitters for panel events
 * - Lifecycle: Initialize → Activate → Update → Deactivate → Dispose
 *
 * INTEGRATION:
 * - **Sky**: Astro display layer renders this panel's WebView iframe
 * - **Wind**: Effect-TS services serve panel resources and content assets
 * - **Mountain**: Panel state persisted to Mountain backend via IPC for session restore
 * - **Message**: Message module handles bidirectional communication
 * - **State**: State module manages state persistence and restoration
 *
 * CONNECTIONS:
 * - Factory: Creates and initializes panel instances
 * - Message: Provides message passing capabilities via webview
 * - State: Serializes and restores panel state
 * - IPC: Sends state changes to Mountain host
 *
 * IMPLEMENTATION NOTES:
 * - Implements full VSCode WebviewPanel interface
 * - Defensive checks prevent operations after disposal
 * - State change detection prevents redundant IPC notifications
 * - EventStream provides Effect-TS compatible event system
 * - WebViewImplementation handles embedding webview instance
 *
 * TODOs (WebView Debugging - LOW):
 * - Add DevTools integration for debugging panel content
 * - Add console capture from WebView context
 * - Add performance monitoring (render times, memory usage)
 * - Add WebView inspector for DOM examination
 *
 * TODOs (Performance Monitoring - LOW):
 * - Track initial panel creation time
 * - Track content rendering performance
 * - Monitor memory usage for each panel
 * - Track message round-trip latency
 *
 * TODOs (WebView Permissions - LOW):
 * - Implement permission request system for WebView
 * - Permission dialogs for sensitive operations
 * - Permission persistence across sessions
 *
 * Reference: TODOs mention WebViewPanel as HIGH priority for Mountain integration
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import type { Event, Uri, ViewColumn, Webview, WebviewPanel as VSCodeWebviewPanel, WebviewPanelOnDidChangeViewStateEvent, WebviewPanelOptions } from "vscode";
import type { IPC } from "../IPC.js";
/**
 * @interface PanelOptions
 * @description Configuration options for panel initialization
 */
export interface PanelOptions {
    readonly Handle: string;
    readonly Extension: IExtensionDescription;
    readonly ViewType: string;
    readonly Title: string;
    readonly ShowOptions: {
        readonly ViewColumn?: number;
        readonly PreserveFocus?: boolean;
    };
    readonly Options?: {
        readonly EnableScripts?: boolean;
        readonly RetainContextWhenHidden?: boolean;
        readonly EnableFindWidget?: boolean;
        readonly LocalResourceRoots?: readonly unknown[];
        readonly PortMapping?: readonly unknown[];
    };
    readonly OnDispose: () => void;
}
/**
 * @interface ViewState
 * @description Current view state of the panel
 */
export interface ViewState {
    readonly Active: boolean;
    readonly Visible: boolean;
    readonly ViewColumn: ViewColumn;
}
/**
 * @class Panel
 * @implements {VSCodeWebviewPanel}
 * @description WebView Panel with complete lifecycle management
 */
export declare class Panel implements VSCodeWebviewPanel {
    private readonly FactoryHandle;
    private IsDisposed;
    private _title;
    private _iconPath;
    private _active;
    private _visible;
    private _viewColumn;
    private readonly OnDidDisposeEmitter;
    readonly onDidDispose: Event<void>;
    private readonly OnDidChangeViewStateEmitter;
    readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
    readonly webview: Webview;
    readonly viewType: string;
    readonly options: WebviewPanelOptions;
    handle: string;
    readonly ipcService: IPC;
    readonly extension: IExtensionDescription;
    constructor(FactoryHandle: string, IPCSvc: IPC, Extension: IExtensionDescription, InitialViewType: string, InitialTitle: string, InitialOptions: WebviewPanelOptions, InitialViewColumn: ViewColumn);
    /**
     * Create a new Panel instance
     */
    static Create(Options: PanelOptions): Effect.Effect<Panel, never>;
    get viewColumn(): ViewColumn | undefined;
    get active(): boolean;
    get visible(): boolean;
    get title(): string;
    set title(Value: string);
    get iconPath(): Uri | {
        readonly light: Uri;
        readonly dark: Uri;
    };
    set iconPath(Value: Uri | {
        readonly light: Uri;
        readonly dark: Uri;
    });
    /**
     * Reveal the panel in the editor
     */
    reveal(ViewColumnParam?: ViewColumn, PreserveFocus?: boolean): void;
    /**
     * Dispose the panel and cleanup resources
     */
    dispose(): void;
    /**
     * Fire a message received event from the WebView
     */
    FireDidReceiveMessage(Message: unknown): void;
    /**
     * Update the view state of the panel
     */
    UpdateViewState(NewState: ViewState): void;
}
//# sourceMappingURL=Panel.d.ts.map