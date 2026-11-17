/**
 * Per-handle factory for the extension-facing `WebviewView` proxy.
 * Bridges Cocoon-side `view.webview.html = X` /
 * `view.webview.postMessage(msg)` mutations into Mountain
 * notifications (`webview.setHtml`, `webview.postMessage`) keyed by
 * the handle so Sky's `sky://webview/set-html` listener can apply the
 * html to the parked workbench `WebviewView` in
 * `__CEL_WEBVIEW_VIEWS__`.
 *
 * Each `resolveWebviewView` call gets a fresh proxy so per-call event
 * subscriptions don't leak across resolves; the channel-driven
 * visibility / dispose forwarders are reaped on `dispose()` along
 * with all listener sets they bind.
 */

import type { HandlerContext } from "../../Handler/Context.js";

export default (
	Context: HandlerContext,

	Handle: string | number,

	ViewId: string,

	ToWebviewUri: (Input: unknown) => unknown,

	SharedCspSource: string,
): any => {

	let CurrentHtml = "";

	let CurrentWebviewViewOptions: Record<string, unknown> = {
		enableScripts: true,

		enableCommandUris: true,

		enableForms: true,

		localResourceRoots: [],

		portMapping: [],
	};

	// `resolveWebviewView` is invoked by the workbench at the
	// moment the pane is being resolved-into-view; stock VS Code
	// guarantees `view.visible === true` at this point. Roo's
	// React app reads `webviewView.visible` early in
	// `getHtmlContent` and short-circuits the mount entirely
	// when it's falsy, so an `undefined` getter (the previous
	// shim shape) prevented the React tree from ever being
	// rendered. Default to `true`; the visibility channel below
	// will downgrade to `false` if the workbench actually hides
	// the pane.
	let CurrentVisible = true;

	const VisibilityListeners = new Set<(visible: boolean) => void>();

	const DisposeListeners = new Set<() => void>();

	// Per-resolve subscriptions to the Cocoon-side Emitter
	// channels populated by `NotificationHandler.ts:
	// webview.viewState` and `webview.dispose`. Stored so
	// the proxy view's `dispose()` can drop them when the
	// view goes away (extension may resolve again later
	// with a fresh proxy; we don't want stale listeners
	// firing into the old proxy's listener sets).
	const ChannelVisibility = `webview.viewVisibility:${Handle}`;

	const ChannelDispose = `webview.dispose:${Handle}`;

	const VisibilityForward = (Visible: unknown) => {
		CurrentVisible = !!Visible;

		for (const L of VisibilityListeners) {
			try {
				L(!!Visible);
			} catch (_e) {
				/* swallow */
			}
		}
	};

	const DisposeForward = () => {
		for (const L of DisposeListeners) {
			try {
				L();
			} catch (_e) {
				/* swallow */
			}
		}

		DisposeListeners.clear();

		VisibilityListeners.clear();

		Context.Emitter?.off?.(ChannelVisibility, VisibilityForward);

		Context.Emitter?.off?.(ChannelDispose, DisposeForward);
	};

	Context.Emitter?.on?.(ChannelVisibility, VisibilityForward);

	Context.Emitter?.on?.(ChannelDispose, DisposeForward);

	let CurrentTitle: string | undefined;

	let CurrentDescription: string | undefined;

	let CurrentBadge: unknown;

	const FireMetadataUpdate = () => {
		Context.SendToMountain("webview.updateView", {
			handle: Handle,
			viewId: ViewId,
			title: CurrentTitle ?? null,
			description: CurrentDescription ?? null,
			badge: CurrentBadge ?? null,
		}).catch(() => {});
	};

	const View: any = {
		// `viewType` is the manifest-declared id from
		// `contributes.views[*].id` - same string as `ViewId`. Roo
		// and others log it when the view resolves and crash on
		// `undefined.toString()`.
		viewType: ViewId,

		// Stock VS Code's `WebviewView.visible: boolean` reflects
		// whether the pane is body-visible. Roo, Claude, GitLens
		// all early-return from `resolveWebviewView` /
		// `getHtmlContent` when this reads falsy - the missing
		// getter previously made every `view.visible` read produce
		// `undefined` and the React mount pipeline never kicked
		// off. Backed by `CurrentVisible` which is updated by the
		// visibility channel forwarder above.
		get visible() {
			return CurrentVisible;
		},

		// Some extensions (Continue, occasionally GitLens) cache the
		// view in their own state and reassign `view.visible = X`
		// when they think they detect external visibility changes.
		// Stock VS Code's `WebviewView.visible` is read-only - in
		// strict-mode ES modules a getter-only property would throw
		// `TypeError: Cannot set property visible` on those writes
		// and bring down the resolver chain. A no-op setter
		// (matching the read-only spirit of the spec) absorbs those
		// writes without observable behaviour change; the truth
		// still flows through the visibility channel.
		set visible(_Ignored: unknown) {
			/* no-op - workbench drives visibility via the channel */
		},

		get title() {
			return CurrentTitle;
		},

		set title(Value: string | undefined) {
			CurrentTitle = Value;

			FireMetadataUpdate();
		},

		get description() {
			return CurrentDescription;
		},

		set description(Value: string | undefined) {
			CurrentDescription = Value;

			FireMetadataUpdate();
		},

		get badge() {
			return CurrentBadge;
		},

		set badge(Value: unknown) {
			CurrentBadge = Value;

			FireMetadataUpdate();
		},

		webview: {
			get html() {
				return CurrentHtml;
			},

			set html(Value: string) {
				CurrentHtml = String(Value ?? "");

				// Diagnostic: prove the setter was reached. If we see
				// `[WebviewView] set-html-enter` in the log but no
				// `Received gRPC Notification: Method='webview.setHtml'`
				// in Mountain, the gRPC sendNotification is silently
				// dropping the payload. If we see neither, the
				// extension never assigned `view.webview.html` - the
				// bug is upstream in the extension's resolveWebviewView.
				try {
					if (process.env["Trace"]) {
						process.stdout.write(
							`[WebviewView] set-html-enter handle=${Handle} viewId=${ViewId} htmlLen=${CurrentHtml.length}
`,
						);
					}
				} catch {
					/* stdout may be unavailable mid-teardown */
				}

				Context.SendToMountain("webview.setHtml", {
					handle: Handle,
					viewId: ViewId,
					html: CurrentHtml,
				}).then(
					() => {
						try {
							if (process.env["Trace"]) {
								process.stdout.write(
									`[WebviewView] set-html-sent handle=${Handle} viewId=${ViewId}
`,
								);
							}
						} catch {}
					},

					(Error: unknown) => {
						try {
							if (process.env["Trace"]) {
								process.stdout.write(
									`[WebviewView] set-html-failed handle=${Handle} viewId=${ViewId} error=${String((Error as { message?: string })?.message ?? Error).slice(0, 120)}
`,
								);
							}
						} catch {}
					},
				);
			},

			// Stock VS Code populates `webview.options` from the
			// `WebviewOptions` passed to
			// `registerWebviewViewProvider(viewId, provider, { webviewOptions })`.
			// Roo / Claude / Continue all read
			// `view.webview.options.localResourceRoots` when composing
			// CSP and `<script nonce>` attributes - `undefined`
			// crashed those reads or produced a CSP that blocked the
			// extension's own bundle. Permissive dev-time defaults
			// keep extensions that never set options happy.
			// Unlike CreateWebviewPanel.ts which forwards options via
			// webview.setOptions, this view builder previously stored
			// options as a static object with no forwarding - meaning
			// the workbench webview never received enableScripts,
			// enableForms, etc. and the preloader's toContentHtml()
			// saw allowScripts as false/undefined, skipping the VS Code
			// API polyfill injection.
			get options(): Record<string, unknown> {
				return CurrentWebviewViewOptions;
			},

			set options(Value: Record<string, unknown>) {
				CurrentWebviewViewOptions = Value;

				Context.SendToMountain("webview.setOptions", {
					handle: Handle,
					viewId: ViewId,
					options: Value,
				}).catch(() => {});
			},

			cspSource: SharedCspSource,

			asWebviewUri: ToWebviewUri,

			postMessage: async (Message: unknown) => {
				await Context.SendToMountain("webview.postMessage", {
					handle: Handle,
					viewId: ViewId,
					message: Message,
				}).catch(() => {});

				return true;
			},

			onDidReceiveMessage: (Listener: (msg: unknown) => void) => {
				const Channel = `webview.message:${Handle}`;

				Context.Emitter?.on?.(Channel, Listener);

				return {
					dispose: () => Context.Emitter?.off?.(Channel, Listener),
				};
			},
		},

		show: (PreserveFocus?: boolean) => {
			Context.SendToMountain("webview.reveal", {
				handle: Handle,
				viewId: ViewId,
				preserveFocus: !!PreserveFocus,
			}).catch(() => {});
		},

		onDidChangeVisibility: (Listener: (visible: boolean) => void) => {
			VisibilityListeners.add(Listener);

			return {
				dispose: () => VisibilityListeners.delete(Listener),
			};
		},

		onDispose: (Listener: () => void) => {
			DisposeListeners.add(Listener);

			return {
				dispose: () => DisposeListeners.delete(Listener),
			};
		},

		// Canonical VS Code API name. Roo's `resolveWebviewView` calls
		// `webviewView.onDidDispose(() => {})`; without this alias the
		// call surfaces as `r.onDidDispose is not a function` and the
		// resolver promise rejects AFTER `webview.html` was already
		// set. VS Code spells the listener `onDidDispose: Event<void>`;
		// alias to the existing `onDispose` listener-set rather than
		// duplicate the storage.
		onDidDispose: (Listener: () => void) => {
			DisposeListeners.add(Listener);

			return {
				dispose: () => DisposeListeners.delete(Listener),
			};
		},

		dispose: () => {
			// Dispose forwarded to the channel-driven path so listeners +
			// Emitter subscriptions are uniformly cleaned. `DisposeForward`
			// handles firing all `DisposeListeners` and dropping the
			// channel subscriptions.
			DisposeForward();
		},
	};

	return View;
};
