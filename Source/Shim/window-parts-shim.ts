/*---------------------------------------------------------------------------------------------
 * Cocoon Miscellaneous Window Parts Shim (shims/window-parts-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides stub implementations for miscellaneous parts of the `vscode.window` API
 * namespace that are not covered by more specific UI shims (such as those for messages,
 *
 * quick input, dialogs, output channels, or terminals).
 *
 * This includes functionalities like creating status bar items, showing progress
 * notifications, and registering tree views or webview panels. For Cocoon's MVP,
 *
 * many of these complex UI features are heavily stubbed: methods might be NOPs,
 *
 * return default values, or throw "Not Implemented" errors.
 *
 * Responsibilities (as a stub):
 * - Implementing a subset of the `vscode.window` API interface.
 * - Providing NOP or default-returning stubs for methods like `createStatusBarItem`,
 *
 *   `setStatusBarMessage`, `withProgress`.
 * - Explicitly throwing "Not Implemented" errors for complex features like `createTreeView`
 *   and `createWebviewPanel` to indicate they are unavailable in the current MVP.
 * - Logging warnings when stubbed UI methods are called.
 *
 * Key Interactions:
 * - An instance is made available as part of the `vscode.window` object, composed by the
 *   API factory in `index.ts`.
 * - In a full implementation, many of these methods would interact with corresponding
 *   `MainThread` services (e.g., `MainThreadStatusBar`, `MainThreadProgress`,
 *
 *   `MainThreadTreeViews`, `MainThreadWebviews`) via RPC.
 * - Uses `BaseCocoonShim` for logging.
 *
 * Last Reviewed/Updated: [Your Last Review Date or Placeholder]
 *--------------------------------------------------------------------------------------------*/

// For withProgress token
import { CancellationTokenSource } from "vs/base/common/cancellation";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the window namespace
import {
	ProgressLocation,
	// Enums
	StatusBarAlignment,
	ViewColumn,
	// Interfaces
	// For StatusBarItem
	type AccessibilityInformation,
	// Not directly used, but shows typical window API breadth
	type ExtensionTerminalOptions,
	type InputBoxOptions,
	type LogOutputChannel,
	type MessageItem,
	type MessageOptions,
	type OutputChannel,
	type Progress,
	type ProgressOptions,
	type QuickPick,
	type QuickPickItem,
	type QuickPickOptions,
	type StatusBarItem,
	// For newer createStatusBarItem overload
	type StatusBarItemAffinity,
	type Terminal,
	type TerminalOptions,
	type TextEditor,
	type TextEditorOptionsChangeEvent,
	type TextEditorRevealType,
	type TextEditorSelectionChangeEvent,
	type TextEditorViewColumnChangeEvent,
	type TextEditorVisibleRangesChangeEvent,
	// For StatusBarItem.color & backgroundColor
	type ThemeColor,
	type TreeDataProvider,
	type TreeView,
	type TreeViewOptions,
	type UriHandler,
	// For StatusBarItem.command
	type Command as VscodeCommand,
	type WebviewOptions,
	type WebviewPanel,
	type WebviewPanelOptions,
	type WebviewPanelSerializer,
	type WindowState,
} from "vscode";

// Assuming path to the API type definitions

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	// Not used if RPC calls are not made
	// refineErrorForShim,
	type IRpcProtocolServiceAdapter,
	// Uncomment if RPC is used
	// type ProxyIdentifier,
} from "./_baseShim";

// If RPCing to MainThreadWindow or specific services
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";

// --- Type Definitions ---

/**
 * Placeholder for RPC shape if parts of this were proxied.
 */
// interface MainThreadWindowPartsProxyShape {

//     $setStatusBarMessage?(message: string, hideAfterTimeout?: number, handle?: number): Promise<void>;

//     $disposeStatusBarMessage?(handle: number): Promise<void>;

// For withProgress: $startProgress, $updateProgress, $finishProgress
//
// For TreeViews: $registerTreeView, $refreshTreeView, etc.
//
// For Webviews: $createWebviewPanel, $postWebviewMessage, etc.
//
// }

/**
 * Defines the service interface for miscellaneous `vscode.window` parts that this shim implements for DI.
 */
export interface IExtHostWindowPartsServiceShape {
	// For DI registration
	readonly _serviceBrand: undefined;

	// Properties
	readonly state: WindowState;

	// Text editor related properties (activeTextEditor, visibleTextEditors) are typically managed by ExtHostDocumentsAndEditors.

	// Methods
	createStatusBarItem(
		alignment?: StatusBarAlignment,

		priority?: number,
	): StatusBarItem;

	createStatusBarItem(
		id: string,

		alignment?: StatusBarAlignment,

		priority?: number,
	): StatusBarItem;

	setStatusBarMessage(text: string, hideAfterTimeout?: number): IDisposable;

	setStatusBarMessage(text: string, hideWhenDone?: Promise<any>): IDisposable;

	withProgress<R>(
		options: ProgressOptions,

		task: (
			progress: Progress<{ message?: string; increment?: number }>,

			token: import("vscode").CancellationToken,
		) => Thenable<R> | Promise<R>,
	): Promise<R>;

	createTreeView<T>(viewId: string, options: TreeViewOptions<T>): TreeView<T>;

	registerTreeDataProvider<T>(
		viewId: string,

		treeDataProvider: TreeDataProvider<T>,
	): IDisposable;

	createWebviewPanel(
		viewType: string,

		title: string,

		showOptions:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },

		options?: WebviewPanelOptions & WebviewOptions,
	): WebviewPanel;

	registerWebviewPanelSerializer(
		viewType: string,

		serializer: WebviewPanelSerializer,
	): IDisposable;

	registerUriHandler(handler: UriHandler): IDisposable;

	// Events
	readonly onDidChangeWindowState: VscodeEvent<WindowState>;

	// Text editor related events are typically from ExtHostDocumentsAndEditors.
}

/**
 * Cocoon's stub implementation for miscellaneous `vscode.window` API parts.
 * Many complex UI features are NOPs or throw errors in this MVP version.
 */
export class ShimExtHostWindowPartsService
	extends BaseCocoonShim
	implements IExtHostWindowPartsServiceShape
{
	public readonly _serviceBrand: undefined;

	// #mainThreadWindowPartsProxy: MainThreadWindowPartsProxyShape | null = null;

	/**
	 * Current window state. In a real host, this would be updated by the main thread.
	 * For MVP, it's a static, default value.
	 */
	public readonly state: WindowState = Object.freeze({
		focused: true,

		active: true,

		visible: true,
	});

	// Event emitters for window state changes (currently NOPs)
	private readonly _onDidChangeWindowStateEmitter =
		new VscodeEmitter<WindowState>();

	public readonly onDidChangeWindowState: VscodeEvent<WindowState> =
		this._onDidChangeWindowStateEmitter.event;

	// Other editor-related events (e.g., onDidChangeActiveTextEditor) are typically managed by ExtHostDocumentsAndEditors.

	/**
	 * Creates an instance of ShimExtHostWindowPartsService.
	 * @param rpcService The RPC service adapter (passed to base, currently unused by this stub).
	 * @param logService The logging service.
	 */
	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,

		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostWindowPartsService", rpcService, logService);

		this._log("Initialized (STUBBED for miscellaneous window parts).");

		// if (this._rpcService) {

		//     this.#mainThreadWindowPartsProxy = this._getProxy(
		// Assuming such a proxy exists
		//         MainContext.MainThreadWindowParts as ProxyIdentifier<MainThreadWindowPartsProxyShape>
		//     );

		// }
	}

	/**
	 * This shim, in its stubbed form, does not require RPC for most of its current functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	// --- vscode.window methods (miscellaneous stubs) ---

	/** {@inheritDoc IExtHostWindowPartsServiceShape.createStatusBarItem} */
	public createStatusBarItem(
		idOrAlignment?: string | StatusBarAlignment,

		alignmentOrPriority?: StatusBarAlignment | number,

		priorityArg?: number,
	): StatusBarItem {
		let id: string;

		let alignment: StatusBarAlignment;

		let priority: number | undefined;

		// Newer API property
		let affinity: StatusBarItemAffinity | undefined = undefined;

		if (typeof idOrAlignment === "string") {
			id = idOrAlignment;

			alignment =
				(alignmentOrPriority as StatusBarAlignment) ??
				// Default alignment
				StatusBarAlignment.Left;

			priority = priorityArg;

			// affinity would be part of an options object in the most recent API for item with ID
		} else {
			// idOrAlignment is StatusBarAlignment | undefined
			id =
				"cocoon.stubStatusBarItem." +
				// Generate a unique enough ID
				Math.random().toString(36).substring(2);

			alignment = idOrAlignment ?? StatusBarAlignment.Left;

			priority = alignmentOrPriority as number | undefined;

			// affinity not applicable with this overload directly
		}

		this._logWarnOnce(
			`vscode.window.createStatusBarItem STUB: (id: ${id}, align: ${StatusBarAlignment[alignment]}, prio: ${priority}, affinity: ${affinity})`,
		);

		// Implement a NOP StatusBarItem stub
		let _text = "";

		let _name: string | undefined = "Stubbed Status Item";

		let _tooltip:
			| string
			| undefined
			| {
					value: string;

					isTrusted?: boolean;

					supportThemeIcons?: boolean;
			  } = undefined;

		let _color: string | ThemeColor | undefined = undefined;

		let _backgroundColor: ThemeColor | undefined = undefined;

		let _command: string | VscodeCommand | undefined = undefined;

		let _accessibilityInformation: AccessibilityInformation | undefined =
			undefined;

		return {
			id,

			alignment,

			priority,

			// Stub property
			affinity,

			get name() {
				return _name;
			},

			set name(value: string | undefined) {
				this._logWarnOnce(`StatusBarItem(${id}).name set STUB`);

				_name = value;
			},

			get text() {
				return _text;
			},

			set text(value: string) {
				this._logWarnOnce(`StatusBarItem(${id}).text set STUB`);

				_text = value;
			},

			get tooltip() {
				return _tooltip;
			},

			set tooltip(value) {
				this._logWarnOnce(`StatusBarItem(${id}).tooltip set STUB`);

				_tooltip = value;
			},

			get color() {
				return _color;
			},

			set color(value) {
				this._logWarnOnce(`StatusBarItem(${id}).color set STUB`);

				_color = value;
			},

			get backgroundColor() {
				return _backgroundColor;
			},

			set backgroundColor(value) {
				this._logWarnOnce(
					`StatusBarItem(${id}).backgroundColor set STUB`,
				);

				_backgroundColor = value;
			},

			get command() {
				return _command;
			},

			set command(value) {
				this._logWarnOnce(`StatusBarItem(${id}).command set STUB`);

				_command = value;
			},

			get accessibilityInformation() {
				return _accessibilityInformation;
			},

			set accessibilityInformation(value) {
				this._logWarnOnce(
					`StatusBarItem(${id}).accessibilityInformation set STUB`,
				);

				_accessibilityInformation = value;
			},

			show: () => this._logWarnOnce(`StatusBarItem(${id}).show() STUB`),

			hide: () => this._logWarnOnce(`StatusBarItem(${id}).hide() STUB`),

			dispose: () =>
				this._logWarnOnce(`StatusBarItem(${id}).dispose() STUB`),
		};
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.setStatusBarMessage} */
	public setStatusBarMessage(
		text: string,

		hideOrPromise?: number | Promise<any>,
	): IDisposable {
		const hideAfterTimeout =
			typeof hideOrPromise === "number" ? hideOrPromise : undefined;

		const hideWhenDonePromise =
			typeof hideOrPromise !== "number" ? hideOrPromise : undefined;

		this._logWarnOnce(
			`vscode.window.setStatusBarMessage STUB: "${String(text).substring(0, 30)}...", timeout: ${hideAfterTimeout}, hideWhenDone: ${!!hideWhenDonePromise}`,
		);

		// In a real implementation, this would involve RPC to MainThread:
		// const handle = await this.#mainThreadWindowPartsProxy?.$setStatusBarMessage(text, hideAfterTimeout);

		// if (hideWhenDonePromise) { hideWhenDonePromise.finally(() => this.#mainThreadWindowPartsProxy?.$disposeStatusBarMessage(handle)); }

		// return new Disposable(() => this.#mainThreadWindowPartsProxy?.$disposeStatusBarMessage(handle));

		if (hideWhenDonePromise) {
			hideWhenDonePromise
				.then(() =>
					this._logWarnOnce(
						`StatusBarMessage (Promise based) for "${String(text).substring(0, 30)}" would hide now (success).`,
					),
				)
				.catch(() =>
					this._logWarnOnce(
						`StatusBarMessage (Promise based) for "${String(text).substring(0, 30)}" would hide now (failure).`,
					),
				);
		}

		return Disposable.None;
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.withProgress} */
	public async withProgress<R>(
		options: ProgressOptions,

		task: (
			progress: Progress<{ message?: string; increment?: number }>,

			token: import("vscode").CancellationToken,
		) => Thenable<R> | Promise<R>,
	): Promise<R> {
		const locationName =
			typeof options.location === "number"
				? ProgressLocation[options.location]
				: JSON.stringify(options.location);

		this._logWarn(
			`vscode.window.withProgress STUB: title='${options.title}', location='${locationName}', cancellable=${options.cancellable}`,
		);

		// For MVP, execute the task directly without displaying UI progress.
		// A real implementation would involve RPC calls to MainThreadProgress to show, update, and hide progress.
		const tokenSource = new CancellationTokenSource();

		const progressStub: Progress<{ message?: string; increment?: number }> =
			{
				report: (value) => {
					this._logService?.trace(
						`[Progress STUB][${options.title || "Untitled"}] Report: ${value.message ? `Msg: ${value.message}, ` : ""}Inc: ${value.increment ?? "N/A"}`,
					);
				},
			};

		try {
			// If options.cancellable is true, the task should respect the token.
			// The UI would normally provide a way to trigger cancellation, which would signal this token.
			// Here, cancellation can only happen if the token is externally cancelled.
			return await Promise.resolve(task(progressStub, tokenSource.token));
		} finally {
			// Clean up the CancellationTokenSource
			tokenSource.dispose();
		}
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.createTreeView} */
	public createTreeView<T>(
		viewId: string,

		options: TreeViewOptions<T>,
	): TreeView<T> {
		this._logError(
			`API Not Implemented: window.createTreeView(viewId: '${viewId}'). This feature is not available in Cocoon MVP.`,
		);

		throw new Error(
			`window.createTreeView ('${viewId}') is not implemented in this Cocoon version.`,
		);
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.registerTreeDataProvider} */
	public registerTreeDataProvider<T>(
		viewId: string,

		treeDataProvider: TreeDataProvider<T>,
	): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: window.registerTreeDataProvider(viewId: '${viewId}'). Returning NOP disposable.`,
		);

		return Disposable.None;
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.createWebviewPanel} */
	public createWebviewPanel(
		viewType: string,

		title: string,

		showOptions:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },

		options?: WebviewPanelOptions & WebviewOptions,
	): WebviewPanel {
		this._logError(
			`API Not Implemented: window.createWebviewPanel(viewType: '${viewType}'). This feature is not available in Cocoon MVP.`,
		);

		throw new Error(
			`window.createWebviewPanel ('${viewType}') is not implemented in this Cocoon version.`,
		);
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.registerWebviewPanelSerializer} */
	public registerWebviewPanelSerializer(
		viewType: string,

		serializer: WebviewPanelSerializer,
	): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: window.registerWebviewPanelSerializer(viewType: '${viewType}'). Returning NOP disposable.`,
		);

		return Disposable.None;
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.registerUriHandler} */
	public registerUriHandler(handler: UriHandler): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: window.registerUriHandler. Returning NOP disposable.`,
		);

		// TODO: In a real implementation, this would involve MainThreadUriHandler.$registerUriHandler(handle, scheme, ...)
		return Disposable.None;
	}

	/**
	 * Disposes of resources held by this shim instance, primarily event emitters.
	 */
	public override dispose(): void {
		// From BaseCocoonShim
		super.dispose();

		this._onDidChangeWindowStateEmitter.dispose();

		this._log("Disposed.");
	}
}
