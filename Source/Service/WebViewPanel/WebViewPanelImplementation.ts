/**
 * @module WebViewPanelImplementation
 * @description The concrete implementation of the `vscode.WebViewPanel` interface.
 */

import { Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	Event,
	Uri,
	ViewColumn,
	Webview,
	WebviewOptions,
	WebviewPanel,
	WebviewPanelOnDidChangeViewStateEvent,
	WebviewPanelOptions,
} from "vscode";

import * as TypeConverter from "../../TypeConverter.js";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";
import { WebViewImplementation } from "../WebView/WebViewImplementation.js";

export class WebViewPanelImplementation implements WebviewPanel {
	private _isDisposed = false;
	private _title: string;
	private _iconPath: Uri | { light: Uri; dark: Uri } | undefined;
	private _active: boolean;
	private _visible: boolean;
	private _viewColumn: ViewColumn;

	// --- Events ---
	private readonly onDidDisposeEmitter = CreateEventStream<void>();
	public readonly onDidDispose: Event<void> =
		this.onDidDisposeEmitter.Stream.pipe(Stream.toEvent);

	private readonly onDidChangeViewStateEmitter =
		CreateEventStream<WebviewPanelOnDidChangeViewStateEvent>();
	public readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent> =
		this.onDidChangeViewStateEmitter.Stream.pipe(Stream.toEvent);

	public readonly webview: Webview;
	public readonly viewType: string;

	constructor(
		private readonly handle: string,
		private readonly ipcService: IPC.Interface,
		private readonly extension: IExtensionDescription,
		private readonly onDidDisposeCallback: () => void,
		initialViewType: string,
		initialTitle: string,
		initialOptions: WebviewPanelOptions & WebviewOptions,
		initialViewColumn: ViewColumn,
	) {
		this.viewType = initialViewType;
		this.webview = new WebViewImplementation(
			handle,
			ipcService,
			extension,
			initialOptions,
		);
		this._title = initialTitle;
		this._viewColumn = initialViewColumn;
		this._active = true; // Assume active on creation
		this._visible = true; // Assume visible on creation
	}

	// --- Properties with RPC side-effects ---
	get viewColumn(): ViewColumn {
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
	set title(value: string) {
		if (this._isDisposed || this._title === value) {
			return;
		}
		this._title = value;
		Effect.runFork(
			this.ipcService.SendNotification("$setWebviewTitle", [
				this.handle,
				value,
			]),
		);
	}

	get iconPath(): Uri | { light: Uri; dark: Uri } | undefined {
		return this._iconPath;
	}
	set iconPath(value: Uri | { light: Uri; dark: Uri } | undefined) {
		if (this._isDisposed || this._iconPath === value) {
			return;
		}
		this._iconPath = value;
		const iconPathDTO = value
			? {
					light: (value as any).light
						? TypeConverter.URIConverter.FromAPI(
								(value as any).light,
							)
						: undefined,
					dark: (value as any).dark
						? TypeConverter.URIConverter.FromAPI(
								(value as any).dark,
							)
						: TypeConverter.URIConverter.FromAPI(value as Uri),
				}
			: undefined;
		Effect.runFork(
			this.ipcService.SendNotification("$setWebviewIconPath", [
				this.handle,
				iconPathDTO,
			]),
		);
	}

	// --- Public Methods ---
	public reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void {
		if (this._isDisposed) return;
		const viewColumnDTO = viewColumn
			? TypeConverter.ViewColumnConverter.FromAPI(viewColumn)
			: undefined;
		this.ipcService.SendNotification("$revealWebviewPanel", [
			this.handle,
			viewColumnDTO,
			preserveFocus,
		]);
	}

	public dispose(): void {
		if (this._isDisposed) {
			return;
		}
		this._isDisposed = true;
		this.onDidDisposeEmitter.Fire();
		this.onDidDisposeCallback();
		(this.webview as WebViewImplementation).dispose();
		Effect.runFork(
			this.ipcService.SendNotification("$disposeWebview", [this.handle]),
		);
	}

	// --- Internal Methods ---
	public _updateViewState(newState: {
		active: boolean;
		visible: boolean;
		viewColumn: ViewColumn;
	}) {
		if (this._isDisposed) return;
		const changed =
			this._active !== newState.active ||
			this._visible !== newState.visible ||
			this._viewColumn !== newState.viewColumn;
		this._active = newState.active;
		this._visible = newState.visible;
		this._viewColumn = newState.viewColumn;
		if (changed) {
			this.onDidChangeViewStateEmitter.Fire({ webviewPanel: this });
		}
	}
}
