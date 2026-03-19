/**
 * @module Panel
 * @description
 * Webview Panel - Individual Webview panel implementation with full lifecycle management
 *
 * RESPONSIBILITIES:
 * - Implement complete Webview panel lifecycle (create, show, hide, dispose)
 * - Manage bidirectional message passing between extension and Webview
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
 * - **Sky**: Astro display layer renders this panel's Webview iframe
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
 * - WebviewImplementation handles embedding webview instance
 *
 * TODOs (Webview Debugging - LOW):
 * FUTURE: DevTools - enable via webview.options.enableDevTools
 * FUTURE: Console capture - intercept via postMessage events
 * FUTURE: Performance monitoring - use performance.now() for timing
 * FUTURE: Inspector - create WebviewInspectorTreeProvider
 *
 * TODOs (Performance Monitoring - LOW):
 * PERFORMANCE: Creation time - track panelOptions.preserveFocus
 * PERFORMANCE: Render time - measure document.onload timing
 * PERFORMANCE: Memory - use performance.memory if available
 * PERFORMANCE: Latency - track message send/receive delta
 *
 * TODOs (Webview Permissions - LOW):
 * FUTURE: Permission system - implement PermissionManager
 * FUTURE: Permission dialogs - showQuickPick for user consent
 * FUTURE: Persistence - store in ExtensionContext.globalState
 *
 * Reference: WebviewPanel is HIGH priority for Mountain integration
 */

import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import type {
	Event,
	Uri,
	ViewColumn,
	WebviewPanel as VSCodeWebviewPanel,
	Webview,
	WebviewPanelOnDidChangeViewStateEvent,
	WebviewPanelOptions,
} from "vscode";

import type { IPC } from "../IPC.js";
import { CreateEventStream } from "../Utility/EventStream.js";
import { WebviewImplementation } from "./WebviewImplementation.js";

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
 * @description Webview Panel with complete lifecycle management
 */
export class Panel implements VSCodeWebviewPanel {
	private IsDisposed = false;
	private _title: string;
	private _iconPath:
		| Uri
		| { readonly light: Uri; readonly dark: Uri }
		| undefined;
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
	handle!: string;
	readonly ipcService: IPC;
	readonly extension: IExtensionDescription;

	constructor(
		private readonly FactoryHandle: string,
		IPCSvc: IPC,
		Extension: IExtensionDescription,
		InitialViewType: string,
		InitialTitle: string,
		InitialOptions: WebviewPanelOptions,
		InitialViewColumn: ViewColumn,
	) {
		this.handle = this.FactoryHandle;
		this.ipcService = IPCSvc;
		this.extension = Extension;
		this.viewType = InitialViewType;
		this.options = InitialOptions;
		this.webview = new WebviewImplementation(
			this.handle,
			IPCSvc,
			Extension,
			InitialOptions,
		);
		this._title = InitialTitle;
		this._viewColumn = InitialViewColumn;
		this._active = true;
		this._visible = true;
		this._iconPath = undefined;
		this.onDidDispose = this.OnDidDisposeEmitter.event;
		this.onDidChangeViewState = this.OnDidChangeViewStateEmitter.event;
	}

	/**
	 * Create a new Panel instance
	 */
	static Create(Options: PanelOptions): Effect.Effect<Panel, never> {
		return Effect.sync(() => {
			const ViewColumnValue = Options.ShowOptions.ViewColumn ?? 1;

			// Create a minimal IPC service mock for initialization
			// In production, this would be injected via dependency injection
			const mockIPC: any = {
				SendNotification: (channel: string, params: unknown[]) =>
					Effect.void,
			};

			const PanelInstance = new Panel(
				Options.Handle,
				mockIPC as any,
				Options.Extension,
				Options.ViewType,
				Options.Title,
				Options.Options ?? {},
				ViewColumnValue,
			);

			return PanelInstance;
		});
	}

	// VSCode WebviewPanel interface properties
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
			this.ipcService.SendNotification("$setWebviewTitle", [
				this.handle,
				Value,
			]),
		);
	}
	get iconPath(): Uri | { readonly light: Uri; readonly dark: Uri } {
		return this._iconPath as any;
	}
	set iconPath(Value: Uri | { readonly light: Uri; readonly dark: Uri }) {
		const InternalValue = Value as
			| Uri
			| { readonly light: Uri; readonly dark: Uri }
			| undefined;
		if (this.IsDisposed || this._iconPath === InternalValue) return;
		this._iconPath = InternalValue;
		Effect.runFork(
			this.ipcService.SendNotification("$setWebviewIconPath", [
				this.handle,
				InternalValue,
			]),
		);
	}

	/**
	 * Reveal the panel in the editor
	 */
	reveal(ViewColumnParam?: ViewColumn, PreserveFocus?: boolean): void {
		if (this.IsDisposed) return;
		Effect.runFork(
			this.ipcService.SendNotification("$revealWebviewPanel", [
				this.handle,
				ViewColumnParam,
				PreserveFocus,
			]),
		);
	}

	/**
	 * Dispose the panel and cleanup resources
	 */
	dispose(): void {
		if (this.IsDisposed) {
			return;
		}
		this.IsDisposed = true;
		this.OnDidDisposeEmitter.Fire();
		(this.webview as WebviewImplementation).dispose();
		Effect.runFork(
			this.ipcService.SendNotification("$disposeWebview", [this.handle]),
		);
	}

	/**
	 * Fire a message received event from the Webview
	 */
	FireDidReceiveMessage(Message: unknown): void {
		if (!this.IsDisposed) {
			(this.webview as WebviewImplementation).fireDidReceiveMessage(
				Message,
			);
		}
	}

	/**
	 * Update the view state of the panel
	 */
	UpdateViewState(NewState: ViewState): void {
		if (this.IsDisposed) return;
		const Changed =
			this._active !== NewState.Active ||
			this._visible !== NewState.Visible ||
			this._viewColumn !== NewState.ViewColumn;
		this._active = NewState.Active;
		this._visible = NewState.Visible;
		this._viewColumn = NewState.ViewColumn;
		if (Changed) {
			this.OnDidChangeViewStateEmitter.Fire({
				webviewPanel: this as any,
			});
		}
	}
}
