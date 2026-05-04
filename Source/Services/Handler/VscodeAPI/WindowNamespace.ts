/**
 * @module Handler/VscodeAPI/WindowNamespace
 * @description
 * Factory for the vscode.window namespace shim. Bridges extension-side VS Code
 * API calls to Mountain via SendToMountain. Subscribes to `window*` events on
 * Context.Emitter so extensions can observe editor/selection changes that
 * Mountain pushes down via gRPC notifications.
 */

import { NextProviderHandle } from "../../LanguageProviderRegistry.js";
import type { HandlerContext } from "../HandlerContext.js";
import WrapWindowNamespace from "./WrapWindowNamespace.js";

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

		createTerminal: (Options?: { name?: string; [k: string]: unknown }) => {
			const Handle = NextProviderHandle();
			const Name = Options?.name ?? `Terminal ${Handle}`;
			Context.SendToMountain("window.createTerminal", {
				handle: Handle,
				name: Name,
				options: Options ?? {},
			}).catch(() => {});
			// Extensions (task runners, debuggers, test harnesses) query
			// `terminal.processId` to track the PTY shell process. Resolve it
			// via a Mountain round-trip the first time it's awaited - cache
			// the promise so repeated reads return the same value without a
			// new RPC every call.
			let ProcessIdPromise: Promise<number | undefined> | undefined;
			const ResolveProcessId = () => {
				if (ProcessIdPromise !== undefined) return ProcessIdPromise;
				ProcessIdPromise = (async () => {
					try {
						const Response =
							await Context.MountainClient?.sendRequest(
								"Terminal.GetProcessId",
								[Handle],
							);
						if (typeof Response === "number") return Response;
						if (
							Response &&
							typeof (Response as { pid?: unknown }).pid ===
								"number"
						) {
							return (Response as { pid: number }).pid;
						}
						return undefined;
					} catch {
						return undefined;
					}
				})();
				return ProcessIdPromise;
			};
			return {
				name: Name,
				get processId() {
					return ResolveProcessId();
				},
				sendText: async (Text: string, _AddNewLine?: boolean) => {
					Context.SendToMountain("terminal.sendText", {
						handle: Handle,
						text: Text,
					}).catch(() => {});
				},
				show: (PreserveFocus?: boolean) => {
					Context.SendToMountain("terminal.show", {
						handle: Handle,
						preserveFocus: PreserveFocus,
					}).catch(() => {});
				},
				hide: () => {
					Context.SendToMountain("terminal.hide", {
						handle: Handle,
					}).catch(() => {});
				},
				dispose: () => {
					Context.SendToMountain("terminal.dispose", {
						handle: Handle,
					}).catch(() => {});
				},
				// vscode.window.Terminal.resize(columns, rows) → Mountain
				// PTY master receives SIGWINCH; shell redraws line editor.
				resize: async (Columns: number, Rows: number) => {
					try {
						await Context.MountainClient?.sendRequest(
							"Terminal.Resize",
							[Handle, Columns, Rows],
						);
					} catch {
						// Silent - best-effort UI adaptation.
					}
				},
			};
		},

		createStatusBarItem: (
			AlignmentOrId?: unknown,
			Priority?: number,
		): Record<string, unknown> => {
			const Handle = NextProviderHandle();
			const Item = {
				id: Handle,
				alignment:
					typeof AlignmentOrId === "number" ? AlignmentOrId : 1,
				priority: Priority,
				text: "",
				tooltip: "",
				command: undefined as string | undefined,
				show: () => {
					Context.SendToMountain("statusBar.update", {
						handle: Handle,
						text: Item.text,
						tooltip: Item.tooltip,
						command: Item.command,
						visible: true,
					}).catch(() => {});
				},
				hide: () => {
					Context.SendToMountain("statusBar.update", {
						handle: Handle,
						visible: false,
					}).catch(() => {});
				},
				dispose: () => {
					Context.SendToMountain("statusBar.dispose", {
						handle: Handle,
					}).catch(() => {});
				},
			};
			return Item as Record<string, unknown>;
		},

		createOutputChannel: (
			Name: string,
			Options?: string | { log?: boolean },
		) => {
			const Handle = NextProviderHandle();
			const IsLog =
				typeof Options === "object" && Options !== null
					? Options.log === true
					: false;
			Context.SendToMountain("outputChannel.create", {
				handle: Handle,
				name: Name,
				log: IsLog,
			}).catch(() => {});
			const Channel = {
				name: Name,
				append: (Value: string) => {
					// Pass `name` alongside `handle` so Mountain's
					// OutputChannelAppend handler can route `Git` /
					// `Source Control` / `SCM` traffic to a visible
					// dev_log tag - the F6 diagnostic depends on
					// vscode.git's `logger.info('[Model][doInitialScan]
					// …')` lines being readable in `Trace=short`
					// runs.
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: Value,
					}).catch(() => {});
				},
				appendLine: (Value: string) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: `${Value}\n`,
					}).catch(() => {});
				},
				clear: () => {
					Context.SendToMountain("outputChannel.clear", {
						handle: Handle,
					}).catch(() => {});
				},
				show: () => {
					Context.SendToMountain("outputChannel.show", {
						handle: Handle,
					}).catch(() => {});
				},
				hide: () => {
					Context.SendToMountain("outputChannel.hide", {
						handle: Handle,
					}).catch(() => {});
				},
				replace: (Value: string) => {
					Context.SendToMountain("outputChannel.clear", {
						handle: Handle,
					}).catch(() => {});
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: Value,
					}).catch(() => {});
				},
				dispose: () => {
					Context.SendToMountain("outputChannel.dispose", {
						handle: Handle,
					}).catch(() => {});
				},
				// LogOutputChannel additions - returned when the caller passes
				// `{ log: true }`. Kept on the base channel for simplicity;
				// these are inert on non-log channels.
				logLevel: 2, // LogLevel.Info
				onDidChangeLogLevel: (_Listener: Listener<unknown>) => ({
					dispose: () => {},
				}),
				trace: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: `[trace] ${Message}\n`,
					}).catch(() => {});
				},
				debug: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: `[debug] ${Message}\n`,
					}).catch(() => {});
				},
				info: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: `[info] ${Message}\n`,
					}).catch(() => {});
				},
				warn: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: `[warn] ${Message}\n`,
					}).catch(() => {});
				},
				error: (MessageOrError: unknown, ..._Arguments: unknown[]) => {
					const Text =
						MessageOrError instanceof Error
							? (MessageOrError.stack ?? MessageOrError.message)
							: String(MessageOrError);
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						name: Name,
						value: `[error] ${Text}\n`,
					}).catch(() => {});
				},
			};
			void IsLog;
			return Channel;
		},

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
			let CurrentHtml = "";
			let CurrentOptions = (Options ?? {}) as Record<string, unknown>;
			// Named-key payload bypasses Mountain's positional-to-named
			// canonicalisation entirely - SkyBridge's `sky://webview/create`
			// listener can read `Payload.viewType`, `Payload.title`,
			// `Payload.showOptions`, `Payload.options` directly without
			// depending on the per-method alias mapping in
			// `Webview.rs::CreateEffect`. The `args` array is still
			// preserved by the canonicalisation for any consumer that
			// reads positional slots.
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
						// Named-key payload bypasses Mountain's positional
						// canonicalisation entirely (`Webview.rs` case 1
						// passes objects through verbatim) so SkyBridge's
						// listener finds `Payload.options` directly without
						// relying on the per-method alias mapping.
						Context.MountainClient?.sendRequest(
							"webview.setOptions",
							{
								handle: Handle,
								options: Value,
							},
						).catch(() => {});
					},
					get html() {
						return CurrentHtml;
					},
					set html(Value: string) {
						CurrentHtml = Value;
						// Named-key payload (object) - Mountain's case 1
						// passes through verbatim so SkyBridge sees
						// `Payload.html` regardless of any future drift in
						// the positional-arg canonicalisation. Belt-and-
						// braces with the `webview.rs` html-alias mapping.
						Context.MountainClient?.sendRequest("webview.setHtml", {
							handle: Handle,
							html: Value,
						}).catch(() => {});
					},
					cspSource:
						"vscode-file: vscode-resource: vscode-webview-resource: https:",
					asWebviewUri: (Uri: unknown) => Uri,
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
					onDidReceiveMessage: (
						Listener: (Message: unknown) => any,
					) => {
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
					// Named-key payload so SkyBridge can read
					// `Payload.viewColumn` / `Payload.preserveFocus` without
					// the alias mapping. Positional `args` array is still
					// preserved by Mountain's canonicalisation.
					Context.MountainClient?.sendRequest("webview.reveal", {
						handle: Handle,
						viewColumn: Column,
						preserveFocus: PreserveFocus,
					}).catch(() => {});
				},
				dispose: () => {
					WebviewPanels.delete(String(Handle));
					Context.Emitter.removeAllListeners(
						`webview.message:${Handle}`,
					);
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
				let CurrentHtml = "";
				const VisibilityListeners = new Set<
					(visible: boolean) => void
				>();
				const DisposeListeners = new Set<() => void>();
				const NoopDisposable = { dispose: () => {} };
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
					Context.Emitter?.off?.(
						ChannelVisibility,
						VisibilityForward,
					);
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
							Context.SendToMountain("webview.setHtml", {
								handle: Handle,
								viewId: ViewId,
								html: CurrentHtml,
							}).catch(() => {});
						},
						options: {} as any,
						cspSource: "https://*",
						asWebviewUri: (Uri: any) => Uri,
						postMessage: async (Message: unknown) => {
							await Context.SendToMountain(
								"webview.postMessage",
								{
									handle: Handle,
									viewId: ViewId,
									message: Message,
								},
							).catch(() => {});
							return true;
						},
						onDidReceiveMessage: (
							Listener: (msg: unknown) => void,
						) => {
							const Channel = `webview.message:${Handle}`;
							Context.Emitter?.on?.(Channel, Listener);
							return {
								dispose: () =>
									Context.Emitter?.off?.(Channel, Listener),
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
					onDidChangeVisibility: (
						Listener: (visible: boolean) => void,
					) => {
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
					dispose: () => {
						// Dispose forwarded to the channel-driven path
						// so listeners + Emitter subscriptions are
						// uniformly cleaned. `DisposeForward` handles
						// firing all `DisposeListeners` and dropping
						// the channel subscriptions.
						DisposeForward();
					},
				};
				return View;
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

		// Preemptive stubs for adjacent window event APIs stock VS Code
		// ships. Each is wired to a Tauri event channel Mountain may
		// populate later; until then the subscribe is a safe no-op.
		// Added in bulk because the `vscode.git` failure above is the
		// third whack-a-mole on the `vscode.window` namespace in this
		// session, and extensions subscribe to these events defensively
		// at activation time.
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
		onDidChangeActiveNotebookEditor: MakeEventSubscriber(
			Context,
			"window.didChangeActiveNotebookEditor",
		),
		onDidChangeVisibleNotebookEditors: MakeEventSubscriber(
			Context,
			"window.didChangeVisibleNotebookEditors",
		),
		onDidChangeNotebookEditorSelection: MakeEventSubscriber(
			Context,
			"window.didChangeNotebookEditorSelection",
		),
		onDidChangeNotebookEditorVisibleRanges: MakeEventSubscriber(
			Context,
			"window.didChangeNotebookEditorVisibleRanges",
		),
		onDidChangeActiveColorTheme: MakeEventSubscriber(
			Context,
			"window.didChangeActiveColorTheme",
		),
		onDidChangeTerminalState: MakeEventSubscriber(
			Context,
			"window.didChangeTerminalState",
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
		onDidWriteTerminalData: MakeEventSubscriber(
			Context,
			"window.didWriteTerminalData",
		),
		onDidExecuteTerminalCommand: MakeEventSubscriber(
			Context,
			"window.didExecuteTerminalCommand",
		),
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

		activeTextEditor: undefined,
		activeColorTheme: { kind: 2 /* Dark */ },
		visibleTextEditors: [] as unknown[],
		visibleNotebookEditors: [] as unknown[],
		activeNotebookEditor: undefined,
		notebookEditors: [] as unknown[],
		tabGroups: {
			all: [] as unknown[],
			activeTabGroup: { tabs: [] as unknown[] },
			onDidChangeTabGroups: (() => ({ dispose: () => {} })) as unknown,
			onDidChangeTabs: (() => ({ dispose: () => {} })) as unknown,
			close: async () => false,
		},
		terminals: [] as unknown[],
		activeTerminal: undefined,
		state: { focused: true, active: true },
	};
	return WrapWindowNamespace(Concrete);
};

export default CreateWindowNamespace;
