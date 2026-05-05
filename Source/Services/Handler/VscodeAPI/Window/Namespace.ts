/**
 * @module Handler/VscodeAPI/WindowNamespace
 * @description
 * Factory for the vscode.window namespace shim. Bridges extension-side VS Code
 * API calls to Mountain via SendToMountain. Subscribes to `window*` events on
 * Context.Emitter so extensions can observe editor/selection changes that
 * Mountain pushes down via gRPC notifications.
 */

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import WrapWindowNamespace from "../Wrap/Window/Namespace.js";
import CreateOutputChannel from "./CreateOutputChannel.js";
import CreateStatusBarItem from "./CreateStatusBarItem.js";
import CreateTerminal from "./CreateTerminal.js";
import CreateWebviewPanel from "./CreateWebviewPanel.js";
import CreateWebviewViewBuilder from "./CreateWebviewViewBuilder.js";

type Listener<T> = (Event: T) => unknown;

const MakeEventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(
		Callback: Listener<unknown>,
		ThisArg?: unknown,
		Disposables?: { push: (D: { dispose: () => void }) => unknown },
	) => {
		// Honour VS Code's `(listener, thisArg?, disposables?)` event
		// contract. Extensions (rust-analyzer, gitlens, ...) bind class
		// methods via ThisArg and rely on the listener being bound; an
		// unbound call surfaces as `TypeError: Cannot read properties of
		// undefined (reading '<member>')` inside the listener.
		const Bound =
			ThisArg === undefined
				? Callback
				: (Callback as (...Args: unknown[]) => unknown).bind(ThisArg);
		Context.Emitter.on(EventName, Bound as Listener<unknown>);
		const Subscription = {
			dispose: () => {
				Context.Emitter.off(EventName, Bound as Listener<unknown>);
			},
		};
		if (Disposables && typeof Disposables.push === "function") {
			Disposables.push(Subscription);
		}
		return Subscription;
	};

// Legacy `*Counter` locals replaced by the shared `NextProviderHandle()`
// from LanguageProviderRegistry. The handle MUST be a plain numeric value
// because Mountain's notification parser reads it as `u64`; a stringified
// `"terminal:1"` etc. previously fell back to `handle=0` and every new
// provider of the same type collided on the same Mountain registry key.

/**
 * Registry of locally-registered tree-data providers, keyed by the handle
 * we hand back to Mountain. Mountain calls back with `tree.getChildren`
 * or `tree.getTreeItem` and we look the provider up here. Exported so
 * `Handler/RequestRoutingHandler` can route incoming requests.
 */
export const TreeDataProviders = new Map<string, any>();

/**
 * Parallel index keyed by the viewId the extension passed to
 * `createTreeView` / `registerTreeDataProvider`. Mountain's
 * `$provideTreeChildren` lookup keys on viewId (not the ephemeral
 * `treeDataProvider:N` handle) because the u32 Mountain-side handle is
 * derived from viewId, not from the Cocoon-side counter. Kept in lockstep
 * with `TreeDataProviders` in both the register and dispose paths.
 */
export const TreeDataProvidersByViewId = new Map<string, any>();

/**
 * Per-extension-ViewType webview providers. Same lookup pattern as the
 * tree registry.
 */
export const WebviewViewProviders = new Map<string, any>();

/**
 * Per-handle factory that returns a fresh `WebviewView` proxy for the
 * extension's `resolveWebviewView(view, ctx)` callback. The proxy
 * captures `Context` (scoped at `registerWebviewViewProvider` time) so
 * `view.webview.html = X` and `view.webview.postMessage(msg)` from the
 * extension fire `webview.setHtml` / `webview.postMessage` notifications
 * back through Mountain → Sky → the parked workbench `WebviewView` in
 * `globalThis.__CEL_WEBVIEW_VIEWS__.get(viewId)`.
 *
 * Indexed by the same handle string as `WebviewViewProviders` so the
 * `webview.resolveView` request handler can look up both maps in one
 * step.
 */
export const WebviewViewBuilders = new Map<string, () => any>();
/**
 * Custom editor provider registry. Indexed by both the numeric handle
 * (for `webview.{register,unregister}CustomEditor` round-trips) and by
 * the public `viewType` string so that workbench-side reverse-RPCs
 * (`$onSaveCustomDocument`, `$onRevertCustomDocument`,
 * `$onBackupCustomDocument`, `$onWillSaveCustomDocument`,
 * `$onDidChangeCustomDocument`) can resolve the provider without
 * threading the handle through every NotificationHandler payload.
 *
 * Each entry stores both the raw provider object and a `readonly`
 * flag - readonly providers (`registerCustomReadonlyEditorProvider`)
 * never receive save participants, so the lifecycle dispatcher
 * silently no-ops save events for them rather than calling a missing
 * method on the provider.
 */
export const CustomEditorProviders = new Map<string, any>();
export const CustomEditorProvidersByViewType = new Map<
	string,
	{ Provider: any; Readonly: boolean; Handle: number }
>();
export const WebviewPanels = new Map<string, any>();

/**
 * Shared registration body for `registerCustomEditorProvider` and
 * `registerCustomReadonlyEditorProvider`. Subscribes to the
 * `customEditor.*` channels emitted by `NotificationHandler.ts` and
 * dispatches the corresponding provider method when the workbench
 * issues a reverse-RPC. The subscription lives on `Context.Emitter`
 * scoped per-handle so dispose() cleans it up without affecting
 * other registrations of the same `viewType`.
 *
 * Provider method shapes (per `vscode.d.ts`):
 *
 *   resolveCustomEditor(document, webviewPanel, token) - mandatory.
 *   resolveCustomTextEditor(document, webviewPanel, token) - text variant.
 *   saveCustomDocument(document, cancellation) - returns Thenable<void>.
 *   saveCustomDocumentAs(document, destination, cancellation).
 *   revertCustomDocument(document, cancellation).
 *   backupCustomDocument(document, context, cancellation).
 *
 * Each method receives the document object the workbench sends in the
 * reverse-RPC payload; we forward verbatim. The handler returns the
 * provider's promise so the workbench-side awaiter resolves with the
 * extension's result. Errors are caught and reported via `process.stdout`
 * so a buggy provider never crashes the host - readonly providers
 * silently skip the save participants.
 */
const RegisterCustomEditor = (
	Context: HandlerContext,
	ViewType: string,
	Provider: any,
	Options: {
		supportsMultipleEditorsPerDocument?: boolean;
		webviewOptions?: unknown;
	},
	IsReadonly: boolean,
) => {
	const Handle = NextProviderHandle();
	CustomEditorProviders.set(String(Handle), Provider);
	CustomEditorProvidersByViewType.set(ViewType, {
		Provider,
		Readonly: IsReadonly,
		Handle,
	});

	// Named-key payload so SkyBridge's `sky://webview/registerCustomEditor`
	// listener reads `Payload.viewType` / `Payload.options` directly,
	// matching the new Cocoon convention. Positional `args` is still
	// preserved by Mountain's canonicalisation for any consumer reading
	// `Args[1]` / `Args[2]`.
	Context.MountainClient?.sendRequest("webview.registerCustomEditor", {
		handle: Handle,
		viewType: ViewType,
		options: {
			readonly: IsReadonly,
			supportsMultipleEditorsPerDocument:
				Options.supportsMultipleEditorsPerDocument ?? false,
			webviewOptions: Options.webviewOptions ?? {},
		},
	}).catch(() => {});

	const SafeAwait = async (
		Channel: string,
		MethodName: string,
		Payload: any,
	): Promise<unknown> => {
		const Entry = CustomEditorProvidersByViewType.get(
			Payload?.viewType ?? ViewType,
		);
		if (!Entry || Entry.Handle !== Handle) return undefined;
		if (Entry.Readonly && MethodName !== "resolveCustomEditor")
			return undefined;
		const Method = (Entry.Provider as Record<string, unknown>)?.[
			MethodName
		];
		if (typeof Method !== "function") return undefined;
		try {
			const Result = await (Method as (...A: unknown[]) => unknown).call(
				Entry.Provider,
				Payload?.document,
				Payload?.context ?? Payload?.destination,
				Payload?.token,
			);
			return Result;
		} catch (Error) {
			try {
				process.stdout.write(
					`[CustomEditor:${Channel}] provider for "${ViewType}" threw: ${
						Error instanceof globalThis.Error
							? Error.message
							: String(Error)
					}\n`,
				);
			} catch {}
			return undefined;
		}
	};

	const Listeners: Array<{
		Channel: string;
		Listener: (P: unknown) => void;
	}> = [];
	const Subscribe = (Channel: string, MethodName: string) => {
		const Listener = (Payload: unknown) => {
			void SafeAwait(Channel, MethodName, Payload);
		};
		Context.Emitter.on(Channel, Listener);
		Listeners.push({ Channel, Listener });
	};

	Subscribe("customEditor.saveDocument", "saveCustomDocument");
	Subscribe("customEditor.saveDocumentAs", "saveCustomDocumentAs");
	Subscribe("customEditor.revertCustomDocument", "revertCustomDocument");
	Subscribe("customEditor.backupCustomDocument", "backupCustomDocument");
	Subscribe("customEditor.willSaveCustomDocument", "willSaveCustomDocument");
	Subscribe(
		"customEditor.didChangeCustomDocument",
		"didChangeCustomDocument",
	);

	return {
		dispose: () => {
			for (const { Channel, Listener } of Listeners) {
				Context.Emitter.off(
					Channel,
					Listener as (..._A: unknown[]) => void,
				);
			}
			Listeners.length = 0;
			CustomEditorProviders.delete(String(Handle));
			const ByViewType = CustomEditorProvidersByViewType.get(ViewType);
			if (ByViewType && ByViewType.Handle === Handle) {
				CustomEditorProvidersByViewType.delete(ViewType);
			}
			Context.MountainClient?.sendRequest(
				"webview.unregisterCustomEditor",
				{ handle: Handle, viewType: ViewType },
			).catch(() => {});
		},
	};
};

const CreateWindowNamespace = (Context: HandlerContext) => {
	// User-interaction prompts need a *round-trip* (sendRequest) not a
	// fire-and-forget notification (SendToMountain). Extensions like the
	// TypeScript updater, Git conflict resolver, and Azure sign-in all gate
	// behaviour on the returned selection - returning undefined unconditionally
	// means they either hang or pick the wrong default. Fall back to undefined
	// only if Mountain hasn't routed the RPC yet; the extension code always
	// tolerates that case.
	const ShowMessage =
		(Level: "info" | "warn" | "error") =>
		async (
			Message: string,
			...Items: unknown[]
		): Promise<unknown | undefined> => {
			// Last argument may be an options object; VS Code's real signature
			// is `(message, [options], ...items)`. Detect and extract.
			let Options: unknown = undefined;
			let Actions = Items;
			if (
				Items.length > 0 &&
				Items[0] &&
				typeof Items[0] === "object" &&
				!Array.isArray(Items[0]) &&
				"modal" in (Items[0] as Record<string, unknown>)
			) {
				Options = Items[0];
				Actions = Items.slice(1);
			}
			try {
				const Selection = await Context.MountainClient?.sendRequest(
					"Window.ShowMessage",
					[
						{
							message: Message,
							level: Level,
							items: Actions,
							options: Options ?? {},
						},
					],
				);
				return Selection ?? undefined;
			} catch {
				return undefined;
			}
		};

	// Shared `asWebviewUri` implementation. Stock VS Code converts a
	// local-file `vscode.Uri` into a webview-loadable URI under the
	// webview's authority/scheme; the service worker inside the iframe
	// then intercepts requests under that scheme and rebroadcasts to
	// the workbench host. Land disables that service worker (WKWebView
	// rejects SW registration on the `vscode-webview://` custom
	// protocol - see Output `PatchWebviewIframeServiceWorker`), so we
	// instead translate to `vscode-file://vscode-app/<absPath>` which
	// Mountain's existing `VscodeFileSchemeHandler` serves directly
	// from disk with permissive CORS. The result is a URI that
	// extensions can drop into `<script src=…>` / `<link href=…>` /
	// `<img src=…>` etc. and the iframe loads them via WKWebView's
	// vscode-file:// custom-protocol handler without any SW
	// round-trip. Without this, Roo / Claude / GitLens / every
	// React-based webview ships HTML referencing
	// `file:///abs/path/to/build.js` which the iframe cannot fetch
	// (cross-origin file:// from the `vscode-webview://` shell is
	// blocked by WKWebView), so the panel renders blank even when
	// the surrounding workbench resolution chain is healthy.
	const ToWebviewUri = (Input: unknown): unknown => {
		if (Input == null) return Input;
		if (typeof Input === "string") {
			if (Input.startsWith("vscode-file://")) return Input;
			if (Input.startsWith("vscode-webview-resource://")) {
				const Match = Input.match(
					/^vscode-webview-resource:\/\/[^/]+(.*)$/,
				);
				return Match
					? `vscode-file://vscode-app${Match[1] ?? ""}`
					: Input;
			}
			if (Input.startsWith("vscode-resource://")) {
				return Input.replace(
					"vscode-resource://",
					"vscode-file://vscode-app/",
				);
			}
			if (Input.startsWith("file://")) {
				return Input.replace("file://", "vscode-file://vscode-app");
			}
			return Input;
		}
		const Anything = Input as Record<string, unknown> & {
			toString?: () => string;
		};
		const Scheme = String(Anything.scheme ?? "");
		const Path = String(Anything.path ?? "");
		if (Scheme === "file" && Path) {
			const Rewritten = {
				...Anything,
				scheme: "vscode-file",
				authority: "vscode-app",
				path: Path,
				query: String(Anything.query ?? ""),
				fragment: String(Anything.fragment ?? ""),
			};
			const SerialisedQuery = Rewritten.query
				? "?" + Rewritten.query
				: "";
			const SerialisedFragment = Rewritten.fragment
				? "#" + Rewritten.fragment
				: "";
			const Serialised = `vscode-file://vscode-app${Path}${SerialisedQuery}${SerialisedFragment}`;
			(Rewritten as Record<string, unknown>).toString = () => Serialised;
			(Rewritten as Record<string, unknown>).toJSON = () => Serialised;
			return Rewritten;
		}
		if (
			Scheme === "vscode-webview-resource" ||
			Scheme === "vscode-resource"
		) {
			const Rewritten = {
				...Anything,
				scheme: "vscode-file",
				authority: "vscode-app",
			};
			const Serialised = `vscode-file://vscode-app${Path}`;
			(Rewritten as Record<string, unknown>).toString = () => Serialised;
			(Rewritten as Record<string, unknown>).toJSON = () => Serialised;
			return Rewritten;
		}
		return Input;
	};

	// Shared `cspSource` value. Both panel-mode and webview-view proxies
	// expose this so extensions interpolate it into their `<meta http-equiv
	// "Content-Security-Policy">` directives. Includes `vscode-file:` so
	// the assets emitted by `ToWebviewUri` survive the CSP gate, plus the
	// legacy schemes (`vscode-resource:`, `vscode-webview-resource:`) for
	// extensions that hard-code those, plus `https:` for marketplace
	// remote assets.
	const SharedCspSource =
		"vscode-file: vscode-resource: vscode-webview-resource: blob: data: https:";

	const Concrete = {
		showInformationMessage: ShowMessage("info"),
		showErrorMessage: ShowMessage("error"),
		showWarningMessage: ShowMessage("warn"),

		showQuickPick: async (Items: unknown, Options?: unknown) => {
			try {
				return await Context.MountainClient?.sendRequest(
					"Window.ShowQuickPick",
					[Items, Options ?? {}],
				);
			} catch {
				return undefined;
			}
		},
		showInputBox: async (Options?: unknown) => {
			try {
				return await Context.MountainClient?.sendRequest(
					"Window.ShowInputBox",
					[Options ?? {}],
				);
			} catch {
				return undefined;
			}
		},
		showOpenDialog: async (Options?: unknown): Promise<unknown[]> => {
			try {
				const Selected = await Context.MountainClient?.sendRequest(
					"Window.ShowOpenDialog",
					[Options ?? {}],
				);
				return Array.isArray(Selected) ? (Selected as unknown[]) : [];
			} catch {
				return [];
			}
		},
		showSaveDialog: async (
			Options?: unknown,
		): Promise<unknown | undefined> => {
			try {
				return await Context.MountainClient?.sendRequest(
					"Window.ShowSaveDialog",
					[Options ?? {}],
				);
			} catch {
				return undefined;
			}
		},

		createTerminal: (Options?: { name?: string; [k: string]: unknown }) =>
			CreateTerminal(Context, NextProviderHandle(), Options),

		createStatusBarItem: (
			AlignmentOrId?: unknown,
			Priority?: number,
		): Record<string, unknown> =>
			CreateStatusBarItem(
				Context,
				NextProviderHandle(),
				AlignmentOrId,
				Priority,
			),

		createOutputChannel: (
			Name: string,
			Options?: string | { log?: boolean },
		) => CreateOutputChannel(Context, NextProviderHandle(), Name, Options),

		createTextEditorDecorationType: (Options?: Record<string, unknown>) => {
			const Key = `decoration:${Math.random().toString(36).slice(2)}`;
			Context.SendToMountain("window.createTextEditorDecorationType", {
				key: Key,
				options: Options ?? {},
			}).catch(() => {});
			return {
				key: Key,
				dispose: () => {
					Context.SendToMountain(
						"window.disposeTextEditorDecorationType",
						{
							key: Key,
						},
					).catch(() => {});
				},
			};
		},

		registerTerminalQuickFixProvider: (
			_Id: string,
			_Provider: unknown,
		) => ({ dispose: () => {} }),

		registerTerminalCompletionProvider: (
			_Id: string,
			_Provider: unknown,
			..._TriggerCharacters: string[]
		) => ({ dispose: () => {} }),

		createQuickPick: () => ({
			value: "",
			placeholder: undefined as string | undefined,
			items: [] as unknown[],
			activeItems: [] as unknown[],
			selectedItems: [] as unknown[],
			canSelectMany: false,
			matchOnDescription: false,
			matchOnDetail: false,
			busy: false,
			enabled: true,
			ignoreFocusOut: false,
			step: undefined,
			totalSteps: undefined,
			title: undefined,
			buttons: [] as unknown[],
			show: () => {},
			hide: () => {},
			dispose: () => {},
			onDidAccept: () => ({ dispose: () => {} }),
			onDidChangeValue: () => ({ dispose: () => {} }),
			onDidChangeActive: () => ({ dispose: () => {} }),
			onDidChangeSelection: () => ({ dispose: () => {} }),
			onDidTriggerButton: () => ({ dispose: () => {} }),
			onDidTriggerItemButton: () => ({ dispose: () => {} }),
			onDidHide: () => ({ dispose: () => {} }),
		}),

		createInputBox: () => ({
			value: "",
			valueSelection: undefined,
			placeholder: undefined,
			password: false,
			busy: false,
			enabled: true,
			ignoreFocusOut: false,
			prompt: undefined,
			validationMessage: undefined,
			step: undefined,
			totalSteps: undefined,
			title: undefined,
			buttons: [] as unknown[],
			show: () => {},
			hide: () => {},
			dispose: () => {},
			onDidAccept: () => ({ dispose: () => {} }),
			onDidChangeValue: () => ({ dispose: () => {} }),
			onDidTriggerButton: () => ({ dispose: () => {} }),
			onDidHide: () => ({ dispose: () => {} }),
		}),

		createWebviewPanel: (
			ViewType: string,
			Title: string,
			ShowOptions: unknown,
			Options?: unknown,
		) => {
			const Handle = NextProviderHandle();
			const Panel = CreateWebviewPanel(
				Context,
				Handle,
				ViewType,
				Title,
				ShowOptions,
				Options as Record<string, unknown> | undefined,
				ToWebviewUri,
				SharedCspSource,
			);
			WebviewPanels.set(String(Handle), Panel);
			return Panel;
		},

		showTextDocument: async (
			_Document: unknown,
			_Column?: unknown,
			_PreserveFocus?: boolean,
		) => {
			Context.SendToMountain("window.showTextDocument", {
				document: _Document,
				column: _Column,
				preserveFocus: _PreserveFocus,
			}).catch(() => {});
			return undefined;
		},

		showNotebookDocument: async (_Document: unknown, _Options?: unknown) =>
			undefined,

		tabGroups: {
			all: [] as unknown[],
			activeTabGroup: {
				tabs: [] as unknown[],
				isActive: true,
				viewColumn: 1,
				activeTab: undefined,
			},
			onDidChangeTabs: MakeEventSubscriber(
				Context,
				"window.didChangeTabs",
			),
			onDidChangeTabGroups: MakeEventSubscriber(
				Context,
				"window.didChangeTabGroups",
			),
			close: async (_Tab: unknown, _PreserveFocus?: boolean) => {
				// Extensions call `tabGroups.close(tab)` to dismiss an editor.
				// Forward through Mountain's existing command dispatcher -
				// the workbench command `workbench.action.closeActiveEditor`
				// covers the default case and is a registered native command.
				try {
					await Context.MountainClient?.sendRequest(
						"Command.Execute",
						["workbench.action.closeActiveEditor", []],
					);
					return true;
				} catch {
					return false;
				}
			},
		},

		activeColorTheme: {
			kind: 2, // ColorThemeKind.Dark
			onDidChange: MakeEventSubscriber(
				Context,
				"window.didChangeActiveColorTheme",
			),
		},
		onDidChangeActiveColorTheme: MakeEventSubscriber(
			Context,
			"window.didChangeActiveColorTheme",
		),

		createTreeView: (
			Id: string,
			Options: { treeDataProvider?: any } & Record<string, unknown>,
		) => {
			const Provider = Options?.treeDataProvider;
			if (Provider) {
				const Handle = NextProviderHandle();
				TreeDataProviders.set(String(Handle), Provider);
				TreeDataProvidersByViewId.set(Id, Provider);
				// Send ONLY the serialisable primitive options to Mountain.
				// The previous version forwarded `Options` verbatim, which
				// included the `treeDataProvider` itself - the provider's
				// `.context` field cycles through the whole ExtensionContext
				// (environmentVariableCollection, nested Uri objects, the
				// full packageJSON), pushing a 50-200 KB payload per
				// activation and starving the gRPC channel.
				const SerializableOptions = {
					showCollapseAll: Options?.showCollapseAll === true,
					canSelectMany: Options?.canSelectMany === true,
					manageCheckboxStateManually:
						Options?.manageCheckboxStateManually === true,
				};
				Context.MountainClient?.sendRequest("tree.register", [
					Handle,
					Id,
					SerializableOptions,
				]).catch(() => {});
			}
			return {
				reveal: async () => {},
				dispose: () => {
					TreeDataProvidersByViewId.delete(Id);
					Context.MountainClient?.sendRequest("tree.dispose", [
						Id,
					]).catch(() => {});
				},
				selection: [],
				visible: true,
				title: undefined as string | undefined,
				description: undefined as string | undefined,
				message: undefined as string | undefined,
				badge: undefined,
				onDidChangeSelection: () => ({ dispose: () => {} }),
				onDidChangeVisibility: () => ({ dispose: () => {} }),
				onDidCollapseElement: () => ({ dispose: () => {} }),
				onDidExpandElement: () => ({ dispose: () => {} }),
				onDidChangeCheckboxState: () => ({ dispose: () => {} }),
			};
		},

		registerTreeDataProvider: (ViewId: string, Provider: any) => {
			const Handle = NextProviderHandle();
			TreeDataProviders.set(String(Handle), Provider);
			TreeDataProvidersByViewId.set(ViewId, Provider);
			Context.MountainClient?.sendRequest("tree.register", [
				Handle,
				ViewId,
				{},
			]).catch(() => {});
			return {
				dispose: () => {
					TreeDataProviders.delete(String(Handle));
					TreeDataProvidersByViewId.delete(ViewId);
					Context.MountainClient?.sendRequest("tree.unregister", [
						Handle,
					]).catch(() => {});
				},
			};
		},
		registerWebviewPanelSerializer: () => ({ dispose: () => {} }),
		registerWebviewViewProvider: (ViewId: string, Provider: any) => {
			const Handle = NextProviderHandle();
			WebviewViewProviders.set(String(Handle), Provider);
			// Builder factory for the extension-facing `WebviewView`
			// proxy. The proxy bridges Cocoon-side `view.webview.html =
			// X` / `view.webview.postMessage(msg)` calls into Mountain
			// notifications (`webview.setHtml`, `webview.postMessage`)
			// keyed by the handle so Sky's `sky://webview/set-html`
			// listener can apply the html to the parked workbench
			// `WebviewView` in `__CEL_WEBVIEW_VIEWS__`.
			//
			// Each `resolveWebviewView` call gets a fresh proxy so
			// per-call event subscriptions don't leak across resolves.
			WebviewViewBuilders.set(String(Handle), () => {
				return CreateWebviewViewBuilder(
					Context,
					Handle,
					ViewId,
					ToWebviewUri,
					SharedCspSource,
				);
			});
			// Named-key payload so Mountain's `Webview.rs` case 1 passes
			// through verbatim and SkyBridge's `sky://webview/registerView`
			// listener sees `Payload.viewId` directly without depending on
			// the per-method positional-to-named alias mapping. Belt-and-
			// braces with the `webview.rs` registerView alias.
			Context.MountainClient?.sendRequest("webview.registerView", {
				handle: Handle,
				viewId: ViewId,
			}).catch(() => {});
			return {
				dispose: () => {
					WebviewViewProviders.delete(String(Handle));
					WebviewViewBuilders.delete(String(Handle));
					Context.MountainClient?.sendRequest(
						"webview.unregisterView",
						{ handle: Handle, viewId: ViewId },
					).catch(() => {});
				},
			};
		},
		registerCustomEditorProvider: (
			ViewType: string,
			Provider: any,
			Options?: {
				supportsMultipleEditorsPerDocument?: boolean;
				webviewOptions?: unknown;
			},
		) =>
			RegisterCustomEditor(
				Context,
				ViewType,
				Provider,
				Options ?? {},
				false,
			),

		// `vscode.window.registerCustomReadonlyEditorProvider(ViewType, Provider)`
		// is the read-only variant: extensions implementing media viewers
		// (image previews, hex dumps) register here. The wire flow is the
		// same as `registerCustomEditorProvider`; only the
		// `readonly: true` flag and the absence of `OnSave*` participants
		// distinguishes them. We set the same `customEditor.*` listener
		// registrations so the workbench-side lifecycle still runs the
		// resolveCustomTextEditor / resolveCustomEditor path correctly.
		registerCustomReadonlyEditorProvider: (
			ViewType: string,
			Provider: any,
			Options?: {
				supportsMultipleEditorsPerDocument?: boolean;
				webviewOptions?: unknown;
			},
		) =>
			RegisterCustomEditor(
				Context,
				ViewType,
				Provider,
				Options ?? {},
				true,
			),
		registerFileDecorationProvider: (Provider: any) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_file_decoration_provider", {
				handle: Handle,
				extensionId: "",
			}).catch(() => {});
			// Stash locally so `FileDecorationProvider$provideFileDecoration`
			// from Mountain can look up by handle.
			Context.ExtensionRegistry.set(
				`__fileDecorationProvider:${Handle}`,
				Provider,
			);
			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(
						`__fileDecorationProvider:${Handle}`,
					);
					Context.SendToMountain(
						"unregister_file_decoration_provider",
						{ handle: Handle },
					).catch(() => {});
				},
			};
		},
		registerUriHandler: (Handler: any) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_uri_handler", {
				handle: Handle,
				extensionId: "",
			}).catch(() => {});
			Context.ExtensionRegistry.set(`__uriHandler:${Handle}`, Handler);
			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(`__uriHandler:${Handle}`);
					Context.SendToMountain("unregister_uri_handler", {
						handle: Handle,
					}).catch(() => {});
				},
			};
		},
		registerTerminalLinkProvider: (Provider: any) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_terminal_link_provider", {
				handle: Handle,
				extensionId: "",
			}).catch(() => {});
			Context.ExtensionRegistry.set(
				`__terminalLinkProvider:${Handle}`,
				Provider,
			);
			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(
						`__terminalLinkProvider:${Handle}`,
					);
					Context.SendToMountain(
						"unregister_terminal_link_provider",
						{ handle: Handle },
					).catch(() => {});
				},
			};
		},
		registerTerminalProfileProvider: (Id: string, Provider: any) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_terminal_profile_provider", {
				handle: Handle,
				profileId: Id,
				extensionId: "",
			}).catch(() => {});
			Context.ExtensionRegistry.set(
				`__terminalProfileProvider:${Handle}`,
				Provider,
			);
			return {
				dispose: () => {
					Context.ExtensionRegistry.delete(
						`__terminalProfileProvider:${Handle}`,
					);
					Context.SendToMountain(
						"unregister_terminal_profile_provider",
						{ handle: Handle },
					).catch(() => {});
				},
			};
		},
		registerProfileContentHandler: (_Id: string, _Handler: unknown) => ({
			dispose: () => {},
		}),
		registerExternalUriOpener: (
			Id: string,
			_Opener: unknown,
			_Metadata?: unknown,
		) => {
			const Handle = NextProviderHandle();
			Context.SendToMountain("register_external_uri_opener", {
				handle: Handle,
				openerId: Id,
				extensionId: "",
			}).catch(() => {});
			return {
				dispose: () => {
					Context.SendToMountain("unregister_external_uri_opener", {
						handle: Handle,
					}).catch(() => {});
				},
			};
		},

		// Runs a Task with a progress object that reports to Mountain, which
		// in turn updates the status-bar progress indicator in Sky.
		// VS Code's contract: `Task(progress, cancellationToken) -> Thenable<R>`.
		// We provide a real `report({ message, increment })` path and a
		// no-op CancellationToken (no cancellation plumbing yet). The
		// Task's return value is forwarded verbatim.
		withProgress: async (Options: any, Task: any) => {
			const Handle = NextProviderHandle();
			const Title =
				(Options && typeof Options === "object" && Options.title) ||
				"Progress";
			const Location =
				(Options && typeof Options === "object" && Options.location) ??
				15; // ProgressLocation.Window
			let Increment = 0;
			const Progress = {
				report: (Value?: { message?: string; increment?: number }) => {
					if (Value?.increment) Increment += Value.increment;
					Context.SendToMountain("progress.report", {
						handle: Handle,
						title: Title,
						location: Location,
						message: Value?.message,
						increment: Increment,
					}).catch(() => {});
				},
			};
			const CancellationToken = {
				isCancellationRequested: false,
				onCancellationRequested: () => ({ dispose: () => {} }),
			};
			Context.SendToMountain("progress.start", {
				handle: Handle,
				title: Title,
				location: Location,
			}).catch(() => {});
			try {
				return await Task(Progress, CancellationToken);
			} finally {
				Context.SendToMountain("progress.end", {
					handle: Handle,
				}).catch(() => {});
			}
		},

		setStatusBarMessage: (
			Text: string,
			HideAfter?: number | PromiseLike<unknown>,
		) => {
			Context.SendToMountain("statusBar.message", {
				text: Text,
				hideAfter:
					typeof HideAfter === "number" ? HideAfter : undefined,
			}).catch(() => {});
			return { dispose: () => {} };
		},

		// `showWorkspaceFolderPick` - stable API. Stock routes through
		// `MainThreadMessageService` to open a quick pick seeded with the
		// current `workspace.workspaceFolders`. Land's folder list lives
		// in `ExtensionHostInitData.workspace.folders`; pick the first by
		// default (no picker UI yet). Extensions only use this when a
		// command has to choose a folder for multi-root; degrading to
		// "auto-pick first folder" keeps those flows functional until the
		// picker is wired to Sky.
		showWorkspaceFolderPick: async (
			_Options?: unknown,
		): Promise<unknown | undefined> => {
			const Folders =
				(
					Context.ExtensionHostInitData?.workspace as
						| {
								folders?: unknown[];
						  }
						| undefined
				)?.folders ?? [];
			return Folders[0];
		},

		// `withScmProgress` - deprecated in `vscode.d.ts` but still present
		// for extensions that never migrated to `withProgress`. Run the
		// task with a no-op number-progress channel and surface its return
		// value. Stock extHost implementation does the same degradation
		// path.
		withScmProgress: async <R>(
			Task: (Progress: {
				report: (Value: number) => void;
			}) => PromiseLike<R>,
		): Promise<R> =>
			Task({
				report: () => {},
			}),

		// `registerQuickDiffProvider` - proposed API used by SCM-adjacent
		// extensions to overlay a diff gutter. Stub-as-disposable lets
		// opt-in extensions activate until Land wires a real quick-diff
		// channel to Mountain's git surface.
		registerQuickDiffProvider: (
			_Selector: unknown,
			_Provider: unknown,
			_Id: string,
			_Label: string,
			_RootUri?: unknown,
		) => ({ dispose: () => {} }),

		// Events sourced from Mountain gRPC notifications → Context.Emitter
		onDidChangeActiveTextEditor: MakeEventSubscriber(
			Context,
			"window.didChangeActiveTextEditor",
		),
		onDidChangeVisibleTextEditors: MakeEventSubscriber(
			Context,
			"window.didChangeVisibleTextEditors",
		),
		onDidChangeTextEditorSelection: MakeEventSubscriber(
			Context,
			"window.didChangeTextEditorSelection",
		),
		onDidChangeTextEditorVisibleRanges: MakeEventSubscriber(
			Context,
			"window.didChangeTextEditorVisibleRanges",
		),
		onDidChangeTextEditorOptions: MakeEventSubscriber(
			Context,
			"window.didChangeTextEditorOptions",
		),
		onDidChangeTextEditorViewColumn: MakeEventSubscriber(
			Context,
			"window.didChangeTextEditorViewColumn",
		),
		onDidOpenTerminal: MakeEventSubscriber(
			Context,
			"window.didOpenTerminal",
		),
		onDidCloseTerminal: MakeEventSubscriber(
			Context,
			"window.didCloseTerminal",
		),
		onDidChangeActiveTerminal: MakeEventSubscriber(
			Context,
			"window.didChangeActiveTerminal",
		),
		onDidChangeTerminalState: MakeEventSubscriber(
			Context,
			"window.didChangeTerminalState",
		),
		onDidWriteTerminalData: MakeEventSubscriber(Context, "terminalData"),
		// Shell-integration events added for openai.chatgpt activation;
		// Land doesn't track shell integration yet so these fire never.
		// Must be a subscribable function, not a plain object.
		onDidChangeTerminalShellIntegration: MakeEventSubscriber(
			Context,
			"window.didChangeTerminalShellIntegration",
		),
		onDidStartTerminalShellExecution: MakeEventSubscriber(
			Context,
			"window.didStartTerminalShellExecution",
		),
		onDidEndTerminalShellExecution: MakeEventSubscriber(
			Context,
			"window.didEndTerminalShellExecution",
		),
		onDidChangeWindowState: MakeEventSubscriber(
			Context,
			"window.didChangeWindowState",
		),

		// `vscode.git`'s `init()` subscribes to this at
		// `extensions/git/out/main.js` (via the diff decoration pipeline
		// it registers post-activation). Stock `extHostWindow.ts`
		// exposes this event; our shim didn't, so git activate() threw
		// `TypeError: …onDidChangeTextEditorDiffInformation is not a
		// function` and never reached `scm.createSourceControl`, leaving
		// the Source Control panel showing "No source control providers
		// registered". No Mountain-side event source yet; stub with the
		// disposable contract so subscription is a no-op. Real wiring
		// would route Mountain's diff-decoration change stream into a
		// `window.didChangeTextEditorDiffInformation` emit.
		onDidChangeTextEditorDiffInformation: MakeEventSubscriber(
			Context,
			"window.didChangeTextEditorDiffInformation",
		),

		onDidExecuteTerminalCommand: MakeEventSubscriber(
			Context,
			"window.didExecuteTerminalCommand",
		),

		activeTextEditor: undefined,
		// `activeColorTheme` and `tabGroups` already defined earlier in
		// this object literal (lines ~614 and ~581) - leaving the
		// fuller event-aware definitions intact and only mirroring the
		// remaining state placeholders here.
		visibleTextEditors: [] as unknown[],
		visibleNotebookEditors: [] as unknown[],
		activeNotebookEditor: undefined,
		notebookEditors: [] as unknown[],
		terminals: [] as unknown[],
		activeTerminal: undefined,
		state: { focused: true, active: true },
	};
	return WrapWindowNamespace(Concrete);
};

export default CreateWindowNamespace;
