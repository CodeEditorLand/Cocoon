/**
 * @module WebviewPanelImpl
 * @description The concrete implementation of the `vscode.WebviewPanel` interface.
 */

import { Effect, Stream } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	Event,
	Uri,
	ViewColumn,
	Webview,
	WebviewPanel,
	WebviewPanelOnDidChangeViewStateEvent,
} from "vscode";

import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import type { Ipc } from "../Ipc.js";
import { WebviewImpl } from "../Webview2/WebviewImpl.js";

export class WebviewPanelImpl implements WebviewPanel {
	private _isDisposed = false;
	private _title: string;
	private _iconPath: Uri | { light: Uri; dark: Uri } | undefined;

	// --- Events ---
	private readonly OnDidDisposeEvent = CreateEventStream<void>();
	public readonly onDidDispose: Event<void> =
		this.OnDidDisposeEvent.Stream.pipe(Stream.toEvent);
	private readonly OnDidChangeViewStateEvent =
		CreateEventStream<WebviewPanelOnDidChangeViewStateEvent>();
	public readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent> =
		this.OnDidChangeViewStateEvent.Stream.pipe(Stream.toEvent);

	public readonly webview: Webview;
	public readonly viewType: string;
	public readonly viewColumn: ViewColumn; // This would be updated by events from the host
	public readonly active: boolean; // Also updated by events
	public readonly visible: boolean; // Also updated by events

	constructor(
		private readonly Handle: string,
		private readonly IpcService: Ipc.Interface,
		private readonly Extension: IExtensionDescription,
		private readonly OnDidDisposeCallback: () => void,
		InitialTitle: string,
		InitialOptions: WebviewPanelOptions & WebviewOptions,
		InitialViewColumn: ViewColumn,
	) {
		this.viewType = "unimplemented"; // Would come from options
		this.webview = new WebviewImpl(
			Handle,
			IpcService,
			Extension,
			InitialOptions,
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
				this.IpcService.SendNotification("$setWebviewTitle", [
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
				this.IpcService.SendNotification("$setWebviewIconPath", [
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
		(this.webview as WebviewImpl).Dispose();
		Effect.runFork(
			this.IpcService.SendNotification("$disposeWebview", [this.Handle]),
		);
	}
}
