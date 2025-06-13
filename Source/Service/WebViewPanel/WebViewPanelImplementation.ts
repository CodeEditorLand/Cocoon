/**
 * @module WebViewPanelImpl
 * @description The concrete implementation of the `vscode.WebViewPanel` interface.
 */

import { Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	Event,
	Uri,
	ViewColumn,
	WebView,
	WebViewPanel,
	WebViewPanelOnDidChangeViewStateEvent,
} from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { IPC } from "../IPC.js";
import { WebViewImpl } from "../WebView/WebViewImpl.js";

export class WebViewPanelImpl implements WebViewPanel {
	private _isDisposed = false;
	private _title: string;
	private _iconPath: Uri | { light: Uri; dark: Uri } | undefined;

	// --- Events ---
	private readonly OnDidDisposeEvent = CreateEventStream<void>();
	public readonly onDidDispose: Event<void> =
		this.OnDidDisposeEvent.Stream.pipe(Stream.toEvent);
	private readonly OnDidChangeViewStateEvent =
		CreateEventStream<WebViewPanelOnDidChangeViewStateEvent>();
	public readonly onDidChangeViewState: Event<WebViewPanelOnDidChangeViewStateEvent> =
		this.OnDidChangeViewStateEvent.Stream.pipe(Stream.toEvent);

	public readonly webview: WebView;
	public readonly viewType: string;
	public readonly viewColumn: ViewColumn; // This would be updated by events from the host
	public readonly active: boolean; // Also updated by events
	public readonly visible: boolean; // Also updated by events

	constructor(
		private readonly Handle: string,
		private readonly IPCService: IPC.Interface,
		private readonly Extension: IExtensionDescription,
		private readonly OnDidDisposeCallback: () => void,
		InitialTitle: string,
		InitialOption: WebViewPanelOption & WebViewOption,
		InitialViewColumn: ViewColumn,
	) {
		this.viewType = "unimplemented"; // Would come from options
		this.webview = new WebViewImpl(
			Handle,
			IPCService,
			Extension,
			InitialOption,
		);
		this._title = InitialTitle;
		this.viewColumn = InitialViewColumn;
		this.active = true;
		this.visible = true;
	}

	// --- Properties with RPC side-effects ---
	get title(): string {
		return this._title;
	}
	set title(value: string) {
		if (this._title !== value) {
			this._title = value;
			Effect.runFork(
				this.IPCService.SendNotification("$setWebViewTitle", [
					this.Handle,
					value,
				]),
			);
		}
	}

	get iconPath(): Uri | { light: Uri; dark: Uri } | undefined {
		return this._iconPath;
	}
	set iconPath(value: Uri | { light: Uri; dark: Uri } | undefined) {
		if (this._iconPath !== value) {
			this._iconPath = value;
			// Serialize icon paths to DTOs before sending
			Effect.runFork(
				this.IPCService.SendNotification("$setWebViewIconPath", [
					this.Handle,
					value,
				]),
			);
		}
	}

	// --- Public Methods ---
	public reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void {
		// Send RPC to Mountain to reveal this panel
	}

	public dispose(): void {
		if (this._isDisposed) return;
		this._isDisposed = true;
		this.OnDidDisposeEvent.Fire();
		this.OnDidDisposeCallback();
		(this.webview as WebViewImpl).Dispose();
		Effect.runFork(
			this.IPCService.SendNotification("$disposeWebView", [this.Handle]),
		);
	}
}
