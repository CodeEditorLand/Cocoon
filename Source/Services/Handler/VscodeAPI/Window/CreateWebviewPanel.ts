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
 */
import type { HandlerContext } from "../../Handler/Context.js";

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

	let CurrentOptions = (Options ?? {}) as Record<string, unknown>;

	// Named-key payload bypasses Mountain's positional-to-named
	// canonicalisation entirely - SkyBridge's `sky://webview/create`
	// listener can read `Payload.viewType`, `Payload.title`,
	// `Payload.showOptions`, `Payload.options` directly without
	// depending on the per-method alias mapping.
	Context.MountainClient?.sendRequest("webview.create", {
		handle: Handle,
		viewType: ViewType,
		title: Title,
		showOptions: ShowOptions,
		options: CurrentOptions,
	}).catch(() => {});

	const Panel = {
		viewType: ViewType,

		title: Title,

		iconPath: undefined,

		webview: {
			get options() {
				return CurrentOptions;
			},

			set options(Value: Record<string, unknown>) {
				CurrentOptions = Value;

				Context.MountainClient?.sendRequest("webview.setOptions", {
					handle: Handle,
					options: Value,
				}).catch(() => {});
			},

			get html() {
				return CurrentHtml;
			},

			set html(Value: string) {
				CurrentHtml = Value;

				try {
					if (process.env["Trace"]) {
						process.stdout.write(
							`[WebviewPanel] set-html-enter handle=${Handle} htmlLen=${String(Value ?? "").length} hasMountainClient=${!!Context.MountainClient}\n`,
						);
					}
				} catch {
					/* stdout may be unavailable mid-teardown */
				}

				Context.MountainClient?.sendRequest("webview.setHtml", {
					handle: Handle,
					html: Value,
				}).then(
					() => {
						try {
							if (process.env["Trace"]) {
								process.stdout.write(
									`[WebviewPanel] set-html-sent handle=${Handle}\n`,
								);
							}
						} catch {}
					},
					(Error: unknown) => {
						try {
							if (process.env["Trace"]) {
								process.stdout.write(
									`[WebviewPanel] set-html-failed handle=${Handle} error=${String((Error as { message?: string })?.message ?? Error).slice(0, 120)}\n`,
								);
							}
						} catch {}
					},
				);
			},

			cspSource: SharedCspSource,

			asWebviewUri: ToWebviewUri,

			postMessage: async (Message: unknown) => {
				try {
					await Context.MountainClient?.sendRequest(
						"webview.postMessage",

						{ handle: Handle, message: Message },
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
						Context.Emitter.removeListener(Event, Listener);
					},
				};
			},
		},

		options: CurrentOptions,

		viewColumn: 1,

		active: true,

		visible: true,

		reveal: (Column?: number, PreserveFocus?: boolean) => {
			Context.MountainClient?.sendRequest("webview.reveal", {
				handle: Handle,
				viewColumn: Column,
				preserveFocus: PreserveFocus,
			}).catch(() => {});
		},

		dispose: () => {
			Context.Emitter.removeAllListeners(`webview.message:${Handle}`);

			Context.MountainClient?.sendRequest("webview.dispose", {
				handle: Handle,
			}).catch(() => {});
		},

		onDidDispose: (Listener: () => any) => {
			const Event = `webview.dispose:${Handle}`;

			Context.Emitter.on(Event, Listener);

			return {
				dispose: () => {
					Context.Emitter.removeListener(Event, Listener);
				},
			};
		},

		onDidChangeViewState: (Listener: (State: unknown) => any) => {
			const Event = `webview.viewState:${Handle}`;

			Context.Emitter.on(Event, Listener);

			return {
				dispose: () => {
					Context.Emitter.removeListener(Event, Listener);
				},
			};
		},
	};

	return Panel;
};
