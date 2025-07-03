/**
 * @module WebViewImplementation
 * @description The concrete implementation of the `vscode.Webview` interface.
 * An instance of this class represents a single webview from the extension host's
 * perspective, proxying state changes to the Mountain host.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import type { Event, Uri, Webview, WebviewOptions } from "vscode";
import type { IPC } from "../IPC.js";
/**
 * @class WebViewImplementation
 * @implements {Webview}
 */
export declare class WebViewImplementation implements Webview {
    readonly Handle: string;
    private readonly IPCService;
    private readonly Extension;
    private IsDisposed;
    private _html;
    private _options;
    private readonly OnDidReceiveMessageEmitter;
    readonly onDidReceiveMessage: Event<any>;
    constructor(Handle: string, IPCService: IPC, Extension: IExtensionDescription, InitialOptions: WebviewOptions);
    get html(): string;
    set html(Value: string);
    get options(): WebviewOptions;
    set options(NewOptions: WebviewOptions);
    get cspSource(): string;
    postMessage(Message: any): Promise<boolean>;
    asWebviewUri(LocalResource: Uri): Uri;
    fireDidReceiveMessage(Message: any): void;
    dispose(): void;
}
//# sourceMappingURL=WebViewImplementation.d.ts.map