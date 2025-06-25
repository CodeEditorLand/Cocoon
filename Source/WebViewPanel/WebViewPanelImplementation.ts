/**
 * @module WebViewPanelImplementation
 * @description The concrete implementation of the `vscode.WebviewPanel` interface.
 * An instance of this class represents a single webview panel from the extension
 * host's perspective, proxying state changes to the Mountain host.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Event,
	Uri,
	ViewColumn,
	Webview,
	WebviewOptions,
	WebviewPanel,
	WebviewPanelOnDidChangeViewStateEvent,
	WebviewPanelOptions,
} from "vscode";
import { FromAPI as UriFromAPI } from "../TypeConverter/Main/URI.js";
import { ConvertShowOptionToDTO } from "../TypeConverter/WebView/ConvertShowOptionToDTO.js";
import { CreateEventStream } from "../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";
import { WebViewImplementation } from "./WebViewImplementation.js";

/**
 * @class WebViewPanelImplementation
 * @implements {WebviewPanel}
 */
export class WebViewPanelImplementation implements WebviewPanel {
	private IsDisposed = false;
	private _title: string;
	// FIX: Make the internal property optional to correctly implement the interface.
	private _iconPath?: Uri | { readonly light: Uri; readonly dark: Uri };
	private _active: boolean;
	private _visible: boolean;
	private _viewColumn: ViewColumn;

	private readonly OnDidDisposeEmitter = CreateEventStream<void>();
	public readonly onDidDispose: Event<void>;
	private readonly OnDidChangeViewStateEmitter =
		CreateEventStream<WebviewPanelOnDidChangeViewStateEvent>();
	public readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
	public readonly webview: Webview;
	public readonly viewType: string;
	public readonly options: WebviewPanelOptions;

	constructor(
		private readonly Handle: string,
		private readonly IPC: IPC,
		Extension: IExtensionDescription,
		private readonly OnDidDisposeCallback: () => void,
		InitialViewType: string,
		InitialTitle: string,
		InitialOptions: WebviewPanelOptions & WebviewOptions,
		InitialViewColumn: ViewColumn,
	) {
		this.viewType = InitialViewType;
		this.options = InitialOptions;
		this.webview = new WebViewImplementation(
			Handle,
			IPC,
			Extension,
			InitialOptions,
		);
		this._title = InitialTitle;
		this._viewColumn = InitialViewColumn;
		this._active = true;
		this._visible = true;
		// FIX: Initialize the property to satisfy the interface contract at construction time.
		this._iconPath = undefined;
		this.onDidDispose = this.OnDidDisposeEmitter.event;
		this.onDidChangeViewState = this.OnDidChangeViewStateEmitter.event;
	}

	get viewColumn(): ViewColumn | undefined {
		return this._viewColumn;
	}
	get active(): boolean {
		return this._active;
	}
	get visible(): boolean {
		return this._visible;
	}
	get title(): string {
		return this._title;
	}
	set title(Value: string) {
		if (this.IsDisposed || this._title === Value) return;
		this._title = Value;
		Effect.runFork(
			this.IPC.SendNotification("$setWebviewTitle", [this.Handle, Value]),
		);
	}
	get iconPath():
		| Uri
		| { readonly light: Uri; readonly dark: Uri }
		| undefined {
		return this._iconPath;
	}
	set iconPath(
		Value: Uri | { readonly light: Uri; readonly dark: Uri } | undefined,
	) {
		if (this.IsDisposed || this._iconPath === Value) return;
		this._iconPath = Value;
		const IconPathDTO = Value
			? "light" in Value && "dark" in Value
				? {
						light: UriFromAPI(Value.light),
						dark: UriFromAPI(Value.dark),
					}
				: {
						light: UriFromAPI(Value as Uri),
						dark: UriFromAPI(Value as Uri),
					}
			: undefined;
		Effect.runFork(
			this.IPC.SendNotification("$setWebviewIconPath", [
				this.Handle,
				IconPathDTO,
			]),
		);
	}

	public reveal(ViewColumn?: ViewColumn, PreserveFocus?: boolean): void {
		if (this.IsDisposed) return;
		const ViewColumnDTO = ViewColumn
			? ConvertShowOptionToDTO(ViewColumn, PreserveFocus ?? false)
			: undefined;
		Effect.runFork(
			this.IPC.SendNotification("$revealWebviewPanel", [
				this.Handle,
				ViewColumnDTO,
				PreserveFocus,
			]),
		);
	}

	public dispose(): void {
		if (this.IsDisposed) {
			return;
		}
		this.IsDisposed = true;
		this.OnDidDisposeEmitter.Fire();
		this.OnDidDisposeCallback();
		(this.webview as WebViewImplementation).dispose();
		Effect.runFork(
			this.IPC.SendNotification("$disposeWebview", [this.Handle]),
		);
	}

	public fireDidReceiveMessage(Message: any): void {
		(this.webview as WebViewImplementation).fireDidReceiveMessage(Message);
	}
	public updateViewState(NewState: {
		readonly active: boolean;
		readonly visible: boolean;
		readonly viewColumn: ViewColumn;
	}) {
		if (this.IsDisposed) return;
		const Changed =
			this._active !== NewState.active ||
			this._visible !== NewState.visible ||
			this._viewColumn !== NewState.viewColumn;
		this._active = NewState.active;
		this._visible = NewState.visible;
		this._viewColumn = NewState.viewColumn;
		if (Changed) {
			this.OnDidChangeViewStateEmitter.Fire({ webviewPanel: this });
		}
	}
}
