/*---------------------------------------------------------------------------------------------
 * Cocoon Miscellaneous Window Parts Shim (window-parts-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides stub implementations for miscellaneous parts of the `vscode.window` API
 * namespace that are not covered by more specific UI shims (such as those for messages,
 * quick input, dialogs, output channels, or terminals).
 *
 * This includes functionalities like creating status bar items (`createStatusBarItem`),
 * showing transient status messages (`setStatusBarMessage`), managing progress indicators
 * (`withProgress`), and APIs for registering tree views (`createTreeView`,
 * `registerTreeDataProvider`) or webview panels (`createWebviewPanel`,
 * `registerWebviewPanelSerializer`).
 *
 * For Cocoon's MVP (Minimum Viable Product), many of these complex UI features are
 * heavily stubbed. Methods might be No-Operations (NOPs), return default placeholder
 * values, or explicitly throw "Not Implemented" errors to indicate that the
 * functionality is unavailable in the current version of Cocoon.
 *
 * Responsibilities (as a stub):
 * - Implementing a subset of the `vscode.window` API interface, specifically those parts
 *   not delegated to other dedicated UI shims.
 * - Providing NOP or default-returning stubs for methods like `createStatusBarItem`,
 *   `setStatusBarMessage`, and `withProgress`.
 * - Explicitly throwing "Not Implemented" errors for complex features like `createTreeView`
 *   and `createWebviewPanel` to clearly communicate their unavailability in Cocoon's MVP.
 * - Logging warnings when stubbed UI methods are called to inform developers.
 * - Providing a NOP `onDidChangeWindowState` event.
 *
 * Key Interactions:
 * - An instance of `ShimExtHostWindowPartsService` is typically made available as part of
 *   the `vscode.window` API object, which is composed by the main API factory provider
 *   in `Cocoon/index.ts`.
 * - In a full VS Code implementation, many of these methods would interact with
 *   corresponding `MainThread` services (e.g., `MainThreadStatusBar`, `MainThreadProgress`,
 *   `MainThreadTreeViews`, `MainThreadWebviews`) via RPC to affect the actual editor UI.
 *   This shim currently does not implement these RPC interactions.
 * - Uses `BaseCocoonShim` for standardized logging utilities.
 *
 * Last Reviewed/Updated: Based on latest extraction timestamp.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenSource } from "vs/base/common/cancellation";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the window namespace from Cocoon's bundled API definitions
import {
	// Enums
	ProgressLocation,
	StatusBarAlignment,
	ViewColumn,
	// Interfaces for API method signatures and return types
	type AccessibilityInformation,
	type Progress,
	type ProgressOptions,
	type StatusBarItem,
	type StatusBarItemAffinity, // For newer createStatusBarItem overload options
	type ThemeColor, // For StatusBarItem.color & StatusBarItem.backgroundColor
	type TreeDataProvider,
	type TreeView,
	type TreeViewOptions,
	type UriHandler,
	type Command as VscodeCommand, // For StatusBarItem.command
	type WebviewOptions,
	type WebviewPanel,
	type WebviewPanelOptions,
	type WebviewPanelSerializer,
	type WindowState,
	// Types for other window APIs (even if stubbed, good for type consistency)
	// type ExtensionTerminalOptions,
	// type InputBoxOptions,
	// type MessageItem, type MessageOptions,
	// type OutputChannel, type LogOutputChannel,
	// type QuickPick, type QuickPickItem, type QuickPickOptions,
	// type Terminal, type TerminalOptions,
	// type TextEditor, type TextEditorOptionsChangeEvent, type TextEditorRevealType,
	// type TextEditorSelectionChangeEvent, type TextEditorViewColumnChangeEvent,
	// type TextEditorVisibleRangesChangeEvent,
} from "vscode";

// Assuming this path resolves to Cocoon's shimmed 'vscode' API

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
	// type ProxyIdentifier, // Uncomment if RPC is used
} from "./_baseShim";

// If RPCing to MainThreadWindow or specific services:
// import { MainContext } from "vs/workbench/api/common/extHost.protocol";
// interface MainThreadWindowPartsProxyShape {
//     $setStatusBarMessage?(message: string, hideAfterTimeout?: number, handle?: number): Promise<void>;
//     $disposeStatusBarMessage?(handle: number): Promise<void>;
// }

/**
 * Defines the service interface for miscellaneous `vscode.window` parts that this shim implements.
 * This can be used for Dependency Injection if this service is registered.
 */
export interface IExtHostWindowPartsServiceShape {
	readonly _serviceBrand: undefined; // Standard DI mechanism for VS Code services.

	// Properties
	readonly state: WindowState; // Current state of the application window.

	// Methods for UI elements not covered by more specific UI service shims
	createStatusBarItem(
		alignment?: StatusBarAlignment,
		priority?: number,
	): StatusBarItem; // Older overload
	createStatusBarItem(
		id: string,
		alignment?: StatusBarAlignment,
		priority?: number,
	): StatusBarItem; // Newer overload with ID

	setStatusBarMessage(text: string, hideAfterTimeout?: number): IDisposable; // Timeout-based
	setStatusBarMessage(text: string, hideWhenDone?: Promise<any>): IDisposable; // Promise-based

	withProgress<R>(
		options: ProgressOptions,
		task: (
			progress: Progress<{ message?: string; increment?: number }>,
			token: import("vscode").CancellationToken,
		) => Thenable<R> | Promise<R>,
	): Promise<R>;

	// TreeView APIs (stubbed to throw)
	createTreeView<T>(viewId: string, options: TreeViewOptions<T>): TreeView<T>;
	registerTreeDataProvider<T>(
		viewId: string,
		treeDataProvider: TreeDataProvider<T>,
	): IDisposable;

	// Webview Panel APIs (stubbed to throw)
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

	// URI Handler API (stubbed)
	registerUriHandler(handler: UriHandler): IDisposable;

	// Events (those directly related to window state)
	readonly onDidChangeWindowState: VscodeEvent<WindowState>;
}

/**
 * Cocoon's stub implementation for miscellaneous `vscode.window` API parts.
 * Many complex UI features are implemented as NOPs (No-Operations) or throw errors
 * in this MVP (Minimum Viable Product) version to indicate they are not available.
 */
export class ShimExtHostWindowPartsService
	extends BaseCocoonShim
	implements IExtHostWindowPartsServiceShape
{
	public readonly _serviceBrand: undefined;
	// private _mainThreadWindowPartsProxy: MainThreadWindowPartsProxyShape | null = null;

	/**
	 * Current window state. In a real VS Code extension host, this state would be
	 * dynamically updated by the MainThread. For this MVP shim, it's a static,
	 * default value assuming an active and focused window.
	 */
	public readonly state: WindowState = Object.freeze({
		focused: true,
		active: true,
		visible: true,
	});

	private readonly _onDidChangeWindowStateEmitter =
		new VscodeEmitter<WindowState>();
	public readonly onDidChangeWindowState: VscodeEvent<WindowState> =
		this._onDidChangeWindowStateEmitter.event;

	constructor(
		rpcService: IRpcProtocolServiceAdapter | undefined,
		logService: ILogServiceForShim | undefined,
	) {
		super("ExtHostWindowPartsService", rpcService, logService);
		this._logInfo(
			"Initialized (STUBBED implementation for miscellaneous vscode.window parts). Many features are NOPs or will throw.",
		);
		// if (this._rpcService) {
		//     this._mainThreadWindowPartsProxy = this._getProxy(
		//         MainContext.MainThreadWindowParts as ProxyIdentifier<MainThreadWindowPartsProxyShape>
		//     );
		// }
		// if (!this._mainThreadWindowPartsProxy) {
		//     this._logWarn("MainThreadWindowParts RPC proxy not available. UI features will be fully stubbed locally.");
		// }
	}

	/**
	 * This shim, in its current stubbed form, does not require RPC communication for
	 * most of its implemented (stubbed) functionality.
	 */
	protected override _requiresRpc(): boolean {
		return false;
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.createStatusBarItem} */
	public createStatusBarItem(
		idOrAlignment?: string | StatusBarAlignment,
		alignmentOrPriority?: StatusBarAlignment | number,
		priorityArg?: number,
	): StatusBarItem {
		let id: string;
		let alignment: StatusBarAlignment;
		let priority: number | undefined;
		let itemAffinity: StatusBarItemAffinity | undefined = undefined; // Newer API property

		if (typeof idOrAlignment === "string") {
			id = idOrAlignment;
			alignment =
				typeof alignmentOrPriority === "number" &&
				(alignmentOrPriority === StatusBarAlignment.Left ||
					alignmentOrPriority === StatusBarAlignment.Right)
					? (alignmentOrPriority as StatusBarAlignment)
					: StatusBarAlignment.Left; // Default alignment
			priority = priorityArg;
		} else {
			id =
				"cocoon.stubStatusBarItem." +
				Date.now() +
				"_" +
				Math.random().toString(36).substring(2, 7);
			alignment = idOrAlignment ?? StatusBarAlignment.Left;
			priority = alignmentOrPriority as number | undefined;
		}

		this._logWarnOnce(
			`API STUB: vscode.window.createStatusBarItem called (ID: ${id}, Alignment: ${StatusBarAlignment[alignment]}, Priority: ${priority}, Affinity: ${itemAffinity}). ` +
				`Returning a NOP StatusBarItem. It will not appear in any UI.`,
		);

		let _text = "";
		let _name: string | undefined = `Stubbed Status Item: ${id}`;
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

		const statusBarItemStub: StatusBarItem = {
			id,
			alignment,
			priority,
			affinity: itemAffinity,
			get name() {
				return _name;
			},
			set name(value: string | undefined) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).name set to '${value}'. No UI update.`,
				);
				_name = value;
			},
			get text() {
				return _text;
			},
			set text(value: string) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).text set to '${value.substring(0, 30)}...'. No UI update.`,
				);
				_text = value;
			},
			get tooltip() {
				return _tooltip;
			},
			set tooltip(value) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).tooltip set. No UI update.`,
				);
				_tooltip = value;
			},
			get color() {
				return _color;
			},
			set color(value) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).color set. No UI update.`,
				);
				_color = value;
			},
			get backgroundColor() {
				return _backgroundColor;
			},
			set backgroundColor(value) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).backgroundColor set. No UI update.`,
				);
				_backgroundColor = value;
			},
			get command() {
				return _command;
			},
			set command(value) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).command set. No UI update.`,
				);
				_command = value;
			},
			get accessibilityInformation() {
				return _accessibilityInformation;
			},
			set accessibilityInformation(value) {
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).accessibilityInformation set. No UI update.`,
				);
				_accessibilityInformation = value;
			},
			show: () =>
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).show() called. No UI update.`,
				),
			hide: () =>
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).hide() called. No UI update.`,
				),
			dispose: () =>
				this._logWarnOnce(
					`STUB: StatusBarItem (ID: ${id}).dispose() called. No resources to release in stub.`,
				),
		};
		return statusBarItemStub;
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
			`API STUB: vscode.window.setStatusBarMessage called: "${String(text).substring(0, 50)}...", ` +
				`Timeout: ${hideAfterTimeout ?? "N/A"}, HideWhenDonePromise: ${!!hideWhenDonePromise}. ` +
				`This is a No-Operation; no message will appear in UI.`,
		);
		// const handle = await this._mainThreadWindowPartsProxy?.$setStatusBarMessage(text, hideAfterTimeout);
		// if (hideWhenDonePromise && handle !== undefined) {
		//   hideWhenDonePromise.finally(() => this._mainThreadWindowPartsProxy?.$disposeStatusBarMessage(handle));
		// }
		// return new Disposable(() => {
		//   if (handle !== undefined) this._mainThreadWindowPartsProxy?.$disposeStatusBarMessage(handle);
		// });
		if (hideWhenDonePromise) {
			hideWhenDonePromise
				.then(() =>
					this._logWarnOnce(
						`STUB: StatusBarMessage (Promise-based) for "${String(text).substring(0, 50)}" would hide now (Promise resolved).`,
					),
				)
				.catch(() =>
					this._logWarnOnce(
						`STUB: StatusBarMessage (Promise-based) for "${String(text).substring(0, 50)}" would hide now (Promise rejected).`,
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
			`API STUB: vscode.window.withProgress called (Title: '${options.title}', Location: '${locationName}', Cancellable: ${!!options.cancellable}). ` +
				`Task will run without UI progress indication in Cocoon MVP.`,
		);
		const tokenSource = new CancellationTokenSource();
		const progressStub: Progress<{ message?: string; increment?: number }> =
			{
				report: (value) => {
					this._logService?.trace(
						`[Progress STUB][${options.title || "Untitled Progress"}] Reported: ` +
							`${value.message ? `Message: '${value.message}', ` : ""}` +
							`Increment: ${value.increment ?? "N/A"}`,
					);
				},
			};
		try {
			return await Promise.resolve(task(progressStub, tokenSource.token));
		} finally {
			tokenSource.dispose();
		}
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.createTreeView} */
	public createTreeView<T>(
		viewId: string,
		_options: TreeViewOptions<T>,
	): TreeView<T> {
		const errorMsg = `API Not Implemented: vscode.window.createTreeView(viewId: '${viewId}') is not supported in this version of Cocoon. Tree view UI is complex and not part of MVP.`;
		this._logError(errorMsg);
		throw new Error(errorMsg);
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.registerTreeDataProvider} */
	public registerTreeDataProvider<T>(
		_viewId: string,
		_treeDataProvider: TreeDataProvider<T>,
	): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: vscode.window.registerTreeDataProvider(viewId: '${_viewId}') called. This is a No-Operation. Returning NOP disposable.`,
		);
		return Disposable.None;
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.createWebviewPanel} */
	public createWebviewPanel(
		viewType: string,
		_title: string,
		_showOptions:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },
		_options?: WebviewPanelOptions & WebviewOptions,
	): WebviewPanel {
		const errorMsg = `API Not Implemented: vscode.window.createWebviewPanel(viewType: '${viewType}') is not supported in this version of Cocoon. Webview UI is complex and not part of MVP.`;
		this._logError(errorMsg);
		throw new Error(errorMsg);
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.registerWebviewPanelSerializer} */
	public registerWebviewPanelSerializer(
		_viewType: string,
		_serializer: WebviewPanelSerializer,
	): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: vscode.window.registerWebviewPanelSerializer(viewType: '${_viewType}') called. This is a No-Operation. Returning NOP disposable.`,
		);
		return Disposable.None;
	}

	/** {@inheritDoc IExtHostWindowPartsServiceShape.registerUriHandler} */
	public registerUriHandler(_handler: UriHandler): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: vscode.window.registerUriHandler called. This is a No-Operation. Returning NOP disposable.`,
		);
		// TODO (Full Implementation): This would involve RPC calls to a MainThreadUriHandler service.
		return Disposable.None;
	}

	/**
	 * Disposes of resources held by this shim instance, primarily its event emitters.
	 */
	public override dispose(): void {
		super.dispose(); // From BaseCocoonShim
		this._onDidChangeWindowStateEmitter.dispose();
		this._logInfo("Disposed.");
	}
}
