/**
 * @module WebViewPanelImplementation
 * @description
 * The concrete implementation of the `vscode.WebviewPanel` interface.
 *
 * RESPONSIBILITIES:
 * - Proxies webview panel state to Mountain host via IPC notifications
 * - Implements the full vscode.WebviewPanel interface
 * - Manages webview panel lifecycle (create, reveal, dispose)
 * - Tracks view state (active, visible, viewColumn) and fires change events
 * - Delegates webview operations to WebViewImplementation instance
 *
 * ARCHITECTURE:
 * - Pattern: src/vs/workbench/api/common/extHostWebview.ts
 * - Communication: IPC notifications to Mountain host
 * - State: Local cache of panel state with change detection
 * - Events: Emitter for onDidChangeViewState and onDidDispose
 *
 * INTEGRATION:
 * - IPC: SendNotification to relay state changes to Mountain
 * - TypeConverter: URI conversions for iconPath
 * - WebViewImplementation: Embedded webview instance
 * - EventStream: Emitters for panel events
 *
 * IMPLEMENTATION NOTES:
 * - IsDisposed flag prevents operations after disposal
 * - State change detection prevents redundant notifications
 * - IconPath supports both Uri and { light, dark } forms
 * - All setters send IPC notifications to Mountain
 *
 * TODOs (Mountain Integration - HIGH):
 * - Mountain needs to implement IPC handlers for $setWebviewTitle
 * - Mountain needs to implement IPC handlers for $setWebviewIconPath
 * - Mountain needs to implement IPC handlers for $revealWebviewPanel
 * - Mountain needs to implement IPC handlers for $disposeWebview
 *
 * TODOs (Enhancements - LOW):
 * - Add persistence for webview panel state restoration
 * - Add webview panel serialization for session restore
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import type { Event, Uri, ViewColumn, Webview, WebviewOptions, WebviewPanel, WebviewPanelOnDidChangeViewStateEvent, WebviewPanelOptions } from "vscode";
import type { IPC } from "../IPC.js";
/**
 * @class WebViewPanelImplementation
 * @implements {WebviewPanel}
 */
export declare class WebViewPanelImplementation implements WebviewPanel {
    private readonly Handle;
    private readonly IPC;
    private readonly OnDidDisposeCallback;
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
    constructor(Handle: string, IPC: IPC, Extension: IExtensionDescription, OnDidDisposeCallback: () => void, InitialViewType: string, InitialTitle: string, InitialOptions: WebviewPanelOptions & WebviewOptions, InitialViewColumn: ViewColumn);
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
    reveal(ViewColumn?: ViewColumn, PreserveFocus?: boolean): void;
    dispose(): void;
    fireDidReceiveMessage(Message: any): void;
    updateViewState(NewState: {
        readonly active: boolean;
        readonly visible: boolean;
        readonly viewColumn: ViewColumn;
    }): void;
}
//# sourceMappingURL=WebViewPanelImplementation.d.ts.map