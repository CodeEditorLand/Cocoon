/**
 * @module WebViewPanelImplementation
 * @description The concrete implementation of the `vscode.WebViewPanel` interface.
 */

import { Effect, Stream } from "effect";
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

import { WebView as TypeConverter } from "../../TypeConverter.js";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import type IPCService from "../IPC/Service.js";
import WebViewImplementation from "../WebView/WebViewImplementation.js";

export default class implements WebviewPanel {
	private IsDisposed = false;
	private _title: string;
	private _iconPath:
		| Uri
		| { readonly light: Uri; readonly dark: Uri }
		| undefined;
	private _active: boolean;
	private _visible: boolean;
	private _viewColumn: ViewColumn;

	// --- Events ---
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
		private readonly IPCService: IPCService,
		private readonly Extension: IExtensionDescription,
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
			IPCService,
			Extension,
			InitialOptions,
		);
		this._title = InitialTitle;
		this._viewColumn = InitialViewColumn;
		this._active = true; // Assume active on creation
		this._visible = true; // Assume visible on creation
		this.onDidDispose = Stream.toEvent(this.OnDidDisposeEmitter.Stream);
		this.onDidChangeViewState = Stream.toEvent(
			this.OnDidChangeViewStateEmitter.Stream,
		);
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
	set title(Value: string) {
		if (this.IsDisposed || this._title === Value) {
			return;
		}
		this._title = Value;
		Effect.runFork(
			this.IPCService.SendNotification("$setWebviewTitle", [
				this.Handle,
				Value,
			]),
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
		if (this.IsDisposed || this._iconPath === Value) {
			return;
		}
		this._iconPath = Value;
		const IconPathDTO = Value
			? {
					light: (Value as any).light
						? TypeConverter.ConvertExtensionDataToDTO(
								(Value as any).light,
							)
						: undefined,
					dark: (Value as any).dark
						? TypeConverter.ConvertExtensionDataToDTO(
								(Value as any).dark,
							)
						: TypeConverter.ConvertExtensionDataToDTO(Value as Uri),
				}
			: undefined;
		Effect.runFork(
			this.IPCService.SendNotification("$setWebviewIconPath", [
				this.Handle,
				IconPathDTO,
			]),
		);
	}

	// --- Public Methods ---
	public reveal(ViewColumn?: ViewColumn, PreserveFocus?: boolean): void {
		if (this.IsDisposed) return;
		const ViewColumnDTO = ViewColumn
			? TypeConverter.ConvertShowOptionToDTO(
					ViewColumn,
					PreserveFocus ?? false,
				)
			: undefined;
		this.IPCService.SendNotification("$revealWebviewPanel", [
			this.Handle,
			ViewColumnDTO,
			PreserveFocus,
		]);
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
			this.IPCService.SendNotification("$disposeWebview", [this.Handle]),
		);
	}

	// --- Internal Methods ---
	public _updateViewState(NewState: {
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
