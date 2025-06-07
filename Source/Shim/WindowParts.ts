/*
 * File: Cocoon/Source/Shim/WindowParts.ts
 * Responsibility: Provides a stubbed implementation of the vscode.window API parts, allowing extensions to run in the Cocoon sidecar by intercepting and proxying UI-related calls to the Mountain backend via IPC.
 * Modified: 2025-06-07 00:57:34 UTC
 * Dependency: vs/base/common/cancellation, vs/base/common/lifecycle
 * Export: IExtHostWindowPartsServiceShape, ShimExtHostWindowPartsService
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon Miscellaneous Window Parts Shim
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
 * Last Reviewed/Updated: [Date of Merge or Placeholder]
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenSource } from "vs/base/common/cancellation";
import {
	Emitter as VscodeEmitter,
	Event as VscodeEvent,
} from "vs/base/common/event";
import { Disposable, type IDisposable } from "vs/base/common/lifecycle";
// Import vscode API types for the window namespace
import {
	ProgressLocation,
	StatusBarAlignment,
	ViewColumn,
	type AccessibilityInformation,
	type Progress,
	type ProgressOptions,
	type StatusBarItem,
	type StatusBarItemAffinity,
	type ThemeColor,
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
} from "vscode";

import {
	BaseCocoonShim,
	type ILogServiceForShim,
	type IRpcProtocolServiceAdapter,
} from "./_baseShim";

export interface IExtHostWindowPartsServiceShape {
	readonly _serviceBrand: undefined;
	readonly state: WindowState;
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
	readonly onDidChangeWindowState: VscodeEvent<WindowState>;
}

export class ShimExtHostWindowPartsService
	extends BaseCocoonShim
	implements IExtHostWindowPartsServiceShape
{
	public readonly _serviceBrand: undefined;
	public readonly state: WindowState = Object.freeze({
		focused: true,
		active: true,
		visible: true,
	});

	private readonly _onDidChangeWindowStateEmitter =
		this._instanceDisposables.add(new VscodeEmitter<WindowState>());
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
	}

	protected override _requiresRpc(): boolean {
		return false;
	}

	public createStatusBarItem(
		idOrAlignment?: string | StatusBarAlignment,
		alignmentOrPriority?: StatusBarAlignment | number,
		priorityArg?: number,
	): StatusBarItem {
		let id: string;
		let alignment: StatusBarAlignment;
		let priority: number | undefined;
		let itemAffinity: StatusBarItemAffinity | undefined = undefined;

		if (typeof idOrAlignment === "string") {
			id = idOrAlignment;
			alignment =
				typeof alignmentOrPriority === "number" &&
				(alignmentOrPriority === StatusBarAlignment.Left ||
					alignmentOrPriority === StatusBarAlignment.Right)
					? (alignmentOrPriority as StatusBarAlignment)
					: StatusBarAlignment.Left;
			priority = priorityArg;
			// Note: affinity is usually part of an options object with the id overload,
			// but this shim keeps it simple.
		} else {
			// Older overload: createStatusBarItem(alignment?: StatusBarAlignment, priority?: number)
			id = `cocoon.stubStatusBarItem.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
			alignment = idOrAlignment ?? StatusBarAlignment.Left;
			priority = alignmentOrPriority as number | undefined;
		}

		this._logWarnOnce(
			`API STUB: vscode.window.createStatusBarItem called (ID: ${id}, Alignment: ${StatusBarAlignment[alignment]}, Priority: ${priority}, Affinity: ${itemAffinity}). Returning a NOP StatusBarItem.`,
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

		const logSet = (propName: string, value: any) =>
			this._logWarnOnce(
				`STUB: StatusBarItem (ID: ${id}).${propName} set to '${String(value).substring(0, 30)}...'. No UI update.`,
			);

		const statusBarItemStub: StatusBarItem = {
			id,
			alignment,
			priority,
			affinity: itemAffinity, // Stubbed, modern API uses options object for this.
			get name() {
				return _name;
			},
			set name(value: string | undefined) {
				logSet("name", value);
				_name = value;
			},
			get text() {
				return _text;
			},
			set text(value: string) {
				logSet("text", value);
				_text = value;
			},
			get tooltip() {
				return _tooltip;
			},
			set tooltip(value) {
				logSet("tooltip", value);
				_tooltip = value;
			},
			get color() {
				return _color;
			},
			set color(value) {
				logSet("color", value);
				_color = value;
			},
			get backgroundColor() {
				return _backgroundColor;
			},
			set backgroundColor(value) {
				logSet("backgroundColor", value);
				_backgroundColor = value;
			},
			get command() {
				return _command;
			},
			set command(value) {
				logSet("command", value);
				_command = value;
			},
			get accessibilityInformation() {
				return _accessibilityInformation;
			},
			set accessibilityInformation(value) {
				logSet("accessibilityInformation", value);
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

	public setStatusBarMessage(
		text: string,
		hideOrPromise?: number | Promise<any>,
	): IDisposable {
		const hideAfterTimeout =
			typeof hideOrPromise === "number" ? hideOrPromise : undefined;
		const hideWhenDonePromise =
			typeof hideOrPromise !== "number" ? hideOrPromise : undefined;

		this._logWarnOnce(
			`API STUB: vscode.window.setStatusBarMessage called: "${String(text).substring(0, 50)}...", Timeout: ${hideAfterTimeout ?? "N/A"}, HideWhenDonePromise: ${!!hideWhenDonePromise}. This is a No-Operation.`,
		);
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
			`API STUB: vscode.window.withProgress called (Title: '${options.title}', Location: '${locationName}', Cancellable: ${!!options.cancellable}). Task will run without UI progress.`,
		);
		const tokenSource = new CancellationTokenSource();
		const progressStub: Progress<{ message?: string; increment?: number }> =
			{
				report: (value) => {
					this._logService?.trace(
						`[Progress STUB][${options.title || "Untitled Progress"}] Reported: Message: '${value.message ?? ""}', Increment: ${value.increment ?? "N/A"}`,
					);
				},
			};
		try {
			return await Promise.resolve(task(progressStub, tokenSource.token));
		} finally {
			tokenSource.dispose();
		}
	}

	public createTreeView<T>(
		viewId: string,
		_options: TreeViewOptions<T>,
	): TreeView<T> {
		const errorMsg = `API Not Implemented: vscode.window.createTreeView(viewId: '${viewId}') is not supported in Cocoon MVP.`;
		this._logError(errorMsg);
		throw new Error(errorMsg);
	}

	public registerTreeDataProvider<T>(
		_viewId: string,
		_treeDataProvider: TreeDataProvider<T>,
	): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: vscode.window.registerTreeDataProvider(viewId: '${_viewId}') called. NOP.`,
		);
		return Disposable.None;
	}

	public createWebviewPanel(
		viewType: string,
		_title: string,
		_showOptions:
			| ViewColumn
			| { viewColumn: ViewColumn; preserveFocus?: boolean },
		_options?: WebviewPanelOptions & WebviewOptions,
	): WebviewPanel {
		const errorMsg = `API Not Implemented: vscode.window.createWebviewPanel(viewType: '${viewType}') is not supported in Cocoon MVP.`;
		this._logError(errorMsg);
		throw new Error(errorMsg);
	}

	public registerWebviewPanelSerializer(
		_viewType: string,
		_serializer: WebviewPanelSerializer,
	): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: vscode.window.registerWebviewPanelSerializer(viewType: '${_viewType}') called. NOP.`,
		);
		return Disposable.None;
	}

	public registerUriHandler(_handler: UriHandler): IDisposable {
		this._logWarnOnce(
			`API Not Implemented: vscode.window.registerUriHandler called. NOP.`,
		);
		return Disposable.None;
	}

	public override dispose(): void {
		super.dispose(); // BaseCocoonShim handles _instanceDisposables which includes _onDidChangeWindowStateEmitter
		this._logInfo("Disposed.");
	}
}
