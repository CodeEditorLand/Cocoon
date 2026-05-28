/**
 * Factory for the extension-facing `WebviewPanel` proxy minted by
 * `vscode.window.createWebviewPanel`. Bridges Cocoon-side
 * `panel.webview.html = X` / `panel.webview.postMessage(msg)` /
 * `panel.reveal(...)` mutations into Mountain `webview.setHtml` /
 * `webview.postMessage` / `webview.reveal` requests keyed by handle.
 *
 * Distinct from `CreateWebviewViewBuilder.ts` (which mints sidebar-
 * style `WebviewView` proxies) - panels live in the editor area,
 * carry a `viewColumn`, expose `onDidChangeViewState`, and have
 * mutable options that the workbench writes back through
 * `webview.setOptions`. Matches stock VS Code's `WebviewPanel`
 * surface as documented in `vs/workbench/contrib/webviewPanel`.
 *
 * Implementation contract checked against
 * `vs/workbench/api/common/extHostWebviewPanels.ts::ExtHostWebviewPanel`
 * so extension authors who target upstream's full API surface see
 * identical behavior: setting any mutable property fires the matching
 * notification, `dispose()` is idempotent, and event listeners are
 * disposable via the standard `{ dispose() }` shape.
 */
import type { HandlerContext } from "../../Handler/Context.js";

interface ShowOptionsLike {
	readonly viewColumn?: number;

	readonly preserveFocus?: boolean;
}

export default (
	Context: HandlerContext,

	Handle: string | number,

	ViewType: string,

	Title: string,

	ShowOptions: unknown,

	Options: Record<string, unknown> | undefined,

	ToWebviewUri: (Input: unknown) => unknown,

	SharedCspSource: string,
): any => {
	let CurrentHtml = "";

	let CurrentTitle: string = Title;

	let CurrentIconPath: unknown = undefined;

	let CurrentOptions = (Options ?? {}) as Record<string, unknown>;

	// `panel.viewColumn` lives on the panel itself (not under `.webview`).
	// Stock VS Code accepts `ViewColumn.Active` (-1) / `ViewColumn.Beside`
	// (-2) plus 1-based explicit columns. We default to 1 if the show
	// options don't carry a column. The active/visible flags below default
	// to true at creation since `createWebviewPanel` is documented to
	// reveal immediately unless `preserveFocus` is set.
	const ShowOptionsTyped = (ShowOptions ?? {}) as ShowOptionsLike;

	let CurrentViewColumn: number =
		typeof ShowOptionsTyped.viewColumn === "number"
			? ShowOptionsTyped.viewColumn
			: 1;

	let CurrentActive = true;

	let CurrentVisible = true;

	let Disposed = false;

	const DisposeListeners: Array<() => void> = [];

	const ViewStateListeners: Array<(state: unknown) => void> = [];

	// Named-key payload bypasses Mountain's positional-to-named
	// canonicalisation entirely - SkyBridge's `sky://webview/create`
	// listener reads `Payload.viewType`, `Payload.title`,
	// `Payload.showOptions`, `Payload.options` directly without
	// depending on the per-method alias mapping.
	Context.MountainClient?.sendRequest("webview.create", {
		handle: Handle,
		viewType: ViewType,
		title: Title,
		showOptions: ShowOptions,
		options: CurrentOptions,
	}).catch(() => {});

	// Forward reference for the ViewStateListener closure. The listener
	// dereferences `PanelRef.value` to access the live Panel object; this
	// indirection breaks the TDZ-style "use before define" cycle (listener
	// is registered BEFORE Panel is finished constructing).
	const PanelRef: { value: any } = { value: undefined };

	// Per-handle viewState bridge from Mountain. The Sky bridge's
	// `onDidActiveEditorChange` subscription emits `webview.viewState`
	// notifications keyed by handle whenever this panel becomes the
	// active editor or loses activity. Track the latest values so
	// `panel.active` / `panel.visible` getters return the live state
	// and fire `onDidChangeViewState` listeners.
	const ViewStateChannel = `webview.viewState:${Handle}`;

	const ViewStateListener = (State: {
		active?: boolean;

		visible?: boolean;

		viewColumn?: number;
	}) => {
		if (Disposed) return;

		const NextActive =
			State?.active != null ? !!State.active : CurrentActive;

		const NextVisible =
			State?.visible != null ? !!State.visible : CurrentVisible;

		const NextColumn =
			typeof State?.viewColumn === "number"
				? State.viewColumn
				: CurrentViewColumn;

		const Changed =
			NextActive !== CurrentActive ||
			NextVisible !== CurrentVisible ||
			NextColumn !== CurrentViewColumn;

		CurrentActive = NextActive;

		CurrentVisible = NextVisible;

		CurrentViewColumn = NextColumn;

		if (!Changed) return;

		// `WebviewPanelOnDidChangeViewStateEvent` shape per upstream:
		// `{ webviewPanel: WebviewPanel }`. Listeners read `event.webviewPanel
		// .active / .visible / .viewColumn`. PanelRef is just our forward
		// reference to the panel object built below; deref to send the
		// real panel through.
		const Snapshot = {
			webviewPanel: PanelRef.value,
		};

		for (const Listener of ViewStateListeners.slice()) {
			try {
				Listener(Snapshot);
			} catch {
				/* one bad listener mustn't break the chain */
			}
		}
	};

	Context.Emitter.on(ViewStateChannel, ViewStateListener);

	// Per-handle dispose bridge. Mountain fires `webview.dispose:<handle>`
	// when the workbench's WebviewInput is disposed (user closes the tab,
	// the editor group is destroyed, or the panel is replaced). Trigger
	// our local dispose path so the extension's `onDidDispose` listener
	// observes the close exactly once.
	const DisposeChannel = `webview.dispose:${Handle}`;

	const DisposeListener = () => {
		DisposeInternal();
	};

	Context.Emitter.on(DisposeChannel, DisposeListener);

	const DisposeInternal = () => {
		if (Disposed) return;

		Disposed = true;

		// Drop the per-handle emitter subscriptions BEFORE we fire the
		// listeners so a listener that disposes the panel a second time
		// doesn't re-enter.
		try {
			Context.Emitter.removeListener(ViewStateChannel, ViewStateListener);
		} catch {
			/* swallow */
		}

		try {
			Context.Emitter.removeListener(DisposeChannel, DisposeListener);
		} catch {
			/* swallow */
		}

		try {
			Context.Emitter.removeAllListeners(`webview.message:${Handle}`);
		} catch {
			/* swallow */
		}

		// Tell Mountain to clean up. Idempotent on the Sky side - the
		// handle registry entry is already gone if the dispose chain
		// originated from a tab-close. `viewId` mirrors the same
		// dual-key strategy as `setHtml`/`postMessage` so a dispose
		// emitted before the per-handle WebviewInput finishes binding
		// still finds its target via the viewType-keyed fallback.
		Context.MountainClient?.sendRequest("webview.dispose", {
			handle: Handle,
			viewId: ViewType,
		}).catch(() => {});

		for (const Listener of DisposeListeners.slice()) {
			try {
				Listener();
			} catch {
				/* swallow */
			}
		}
	};

	const Panel: any = {
		get viewType() {
			return ViewType;
		},

		get title() {
			return CurrentTitle;
		},

		set title(Value: string) {
			if (Disposed) return;

			const Next = String(Value ?? "");

			if (Next === CurrentTitle) return;

			CurrentTitle = Next;

			// `viewId` dual-key per the same rationale as setHtml below.
			Context.MountainClient?.sendRequest("webview.setTitle", {
				handle: Handle,
				viewId: ViewType,
				title: Next,
			}).catch(() => {});
		},

		get iconPath() {
			return CurrentIconPath;
		},

		set iconPath(Value: unknown) {
			if (Disposed) return;

			CurrentIconPath = Value;

			Context.MountainClient?.sendRequest("webview.setIconPath", {
				handle: Handle,
				viewId: ViewType,
				iconPath: Value,
			}).catch(() => {});
		},

		webview: {
			get options() {
				return CurrentOptions;
			},

			set options(Value: Record<string, unknown>) {
				if (Disposed) return;

				CurrentOptions = Value;

				Context.MountainClient?.sendRequest("webview.setOptions", {
					handle: Handle,
					viewId: ViewType,
					options: Value,
				}).catch(() => {});
			},

			get html() {
				return CurrentHtml;
			},

			set html(Value: string) {
				if (Disposed) return;

				CurrentHtml = Value;

				// `viewId` aliases the panel's `viewType` for Sky's
				// `InstallWebview.ts:300-302` resolution path - same
				// rationale as `postMessage` below. Without it, the
				// initial setHtml lands on a per-handle slot the
				// renderer hasn't yet bound to a WebviewInput, and the
				// 1.8 KB React-bootstrap shell parks in `ParkedHtml`
				// awaiting a late resolve (the symptom captured in
				// HANDOFF §-15 from the 2026-05-04 Pelt session).
				Context.MountainClient?.sendRequest("webview.setHtml", {
					handle: Handle,
					viewId: ViewType,
					html: Value,
				}).catch(() => {});
			},

			get cspSource() {
				return SharedCspSource;
			},

			asWebviewUri: ToWebviewUri,

			postMessage: async (Message: unknown) => {
				if (Disposed) return false;

				try {
					// `viewId` carries the panel's `viewType` so Sky's
					// `InstallWebview.ts` resolution path can fall back to a
					// viewType-keyed lookup when the per-handle WebviewInput
					// is not yet bound (race during first-paint between
					// `webview.create` ack and the workbench's
					// `IOverlayWebview` instantiation). The bridge accepts
					// either `handle` or `viewId` (`InstallWebview.ts:56-57,
					// :300-302`); sending both eliminates the asymmetry
					// against `CreateWebviewViewBuilder.ts:268`. Matches
					// `IPC-Flow-Registry` B4.
					await Context.MountainClient?.sendRequest(
						"webview.postMessage",

						{ handle: Handle, viewId: ViewType, message: Message },
					);

					return true;
				} catch {
					return false;
				}
			},

			onDidReceiveMessage: (Listener: (Message: unknown) => any) => {
				const Event = `webview.message:${Handle}`;

				Context.Emitter.on(Event, Listener);

				return {
					dispose: () => {
						try {
							Context.Emitter.removeListener(Event, Listener);
						} catch {
							/* swallow */
						}
					},
				};
			},
		},

		get options() {
			return CurrentOptions;
		},

		get viewColumn() {
			return CurrentViewColumn;
		},

		get active() {
			return CurrentActive;
		},

		get visible() {
			return CurrentVisible;
		},

		reveal: (Column?: number, PreserveFocus?: boolean) => {
			if (Disposed) return;

			if (typeof Column === "number") {
				CurrentViewColumn = Column;
			}

			// `viewId` dual-key for Sky's resolution fallback - same
			// rationale as setHtml/postMessage above. Reveal sometimes
			// fires before the workbench finishes mounting the
			// panel's IOverlayWebview, so the viewType-keyed fallback
			// matters more here than for any other mutator.
			Context.MountainClient?.sendRequest("webview.reveal", {
				handle: Handle,
				viewId: ViewType,
				viewColumn: Column,
				preserveFocus: PreserveFocus,
			}).catch(() => {});
		},

		dispose: () => {
			DisposeInternal();
		},

		onDidDispose: (Listener: () => any) => {
			DisposeListeners.push(Listener);

			return {
				dispose: () => {
					const Index = DisposeListeners.indexOf(Listener);

					if (Index >= 0) DisposeListeners.splice(Index, 1);
				},
			};
		},

		onDidChangeViewState: (Listener: (State: unknown) => any) => {
			ViewStateListeners.push(Listener);

			return {
				dispose: () => {
					const Index = ViewStateListeners.indexOf(Listener);

					if (Index >= 0) ViewStateListeners.splice(Index, 1);
				},
			};
		},
	};

	// Forward reference for the ViewStateListener closure. The listener
	// dereferences `PanelRef.value` to access the live Panel object; this
	// indirection breaks the TDZ-style "use before define" cycle (listener
	// is registered BEFORE Panel is finished constructing, but only fires
	// later when Mountain sends events).
	PanelRef.value = Panel;

	return Panel;
};
