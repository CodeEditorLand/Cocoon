/**
 * @module WebViewPanel
 * @description Defines the service for creating and managing `vscode.WebviewPanel` instances.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import { Disposable, type ViewColumn, type WebviewPanel as VSCodeWebviewPanel, type WebviewOptions, type WebviewPanelOptions, type WebviewPanelSerializer } from "vscode";
import { IPCService } from "./IPC.js";
import { WebViewPanelImplementation } from "./WebViewPanel/WebViewPanelImplementation.js";
/**
 * @interface WebViewPanel
 * @description The contract for the WebViewPanel service.
 */
export interface WebViewPanel {
    readonly CreateWebviewPanel: (Extension: IExtensionDescription, ViewType: string, Title: string, ShowOptions: ViewColumn | {
        viewColumn: ViewColumn;
        preserveFocus?: boolean;
    }, Options?: WebviewPanelOptions & WebviewOptions) => Effect.Effect<VSCodeWebviewPanel, Error>;
    readonly RegisterWebviewPanelSerializer: (Extension: IExtensionDescription, ViewType: string, Serializer: WebviewPanelSerializer) => Effect.Effect<Disposable, never>;
}
declare const WebViewPanelService_base: Effect.Service.Class<WebViewPanelService, "Service/WebViewPanel", {
    readonly effect: Effect.Effect<{
        CreateWebviewPanel: (Extension: IExtensionDescription, ViewType: string, Title: string, ShowOptions: ViewColumn | {
            viewColumn: ViewColumn;
            preserveFocus?: boolean;
        }, Options?: WebviewPanelOptions & WebviewOptions) => Effect.Effect<WebViewPanelImplementation, import("./IPC/IPCProblem.js").IPCProblem, never>;
        RegisterWebviewPanelSerializer: (_Extension: IExtensionDescription, ViewType: string, _Serializer: WebviewPanelSerializer) => Effect.Effect<Disposable, never, never>;
    }, never, IPCService>;
}>;
/**
 * @class WebViewPanel
 * @description The `Effect.Service` for managing webview panels.
 */
export declare class WebViewPanelService extends WebViewPanelService_base {
}
export {};
//# sourceMappingURL=WebViewPanel.d.ts.map