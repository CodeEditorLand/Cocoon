/**
 * @module Handler/VscodeAPI/WindowNamespace
 * @description
 * Factory for the vscode.window namespace shim. Bridges extension-side VS Code
 * API calls to Mountain via SendToMountain. Subscribes to `window*` events on
 * Context.Emitter so extensions can observe editor/selection changes that
 * Mountain pushes down via gRPC notifications.
 */

import type { HandlerContext } from "../HandlerContext.js";

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

let OutputChannelCounter = 0;
let TerminalCounter = 0;
let TreeDataProviderCounter = 0;
let WebviewPanelCounter = 0;
let WebviewViewCounter = 0;
let CustomEditorCounter = 0;
let ProgressCounter = 0;

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
export const CustomEditorProviders = new Map<string, any>();
export const WebviewPanels = new Map<string, any>();
let StatusBarCounter = 0;

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

	return {
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
			const Handle = `terminal:${++TerminalCounter}`;
			const Name = Options?.name ?? `Terminal ${TerminalCounter}`;
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
			const Handle = `statusBar:${++StatusBarCounter}`;
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
			const Handle = `outputChannel:${++OutputChannelCounter}`;
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
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						value: Value,
					}).catch(() => {});
				},
				appendLine: (Value: string) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
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
						value: `[trace] ${Message}\n`,
					}).catch(() => {});
				},
				debug: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						value: `[debug] ${Message}\n`,
					}).catch(() => {});
				},
				info: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
						value: `[info] ${Message}\n`,
					}).catch(() => {});
				},
				warn: (Message: string, ..._Arguments: unknown[]) => {
					Context.SendToMountain("outputChannel.append", {
						handle: Handle,
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
			const Handle = `webviewPanel:${++WebviewPanelCounter}`;
			let CurrentHtml = "";
			let CurrentOptions = (Options ?? {}) as Record<string, unknown>;
			Context.MountainClient?.sendRequest("webview.create", [
				Handle,
				ViewType,
				Title,
				ShowOptions,
				CurrentOptions,
			]).catch(() => {});

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
						Context.MountainClient?.sendRequest(
							"webview.setOptions",
							[Handle, Value],
						).catch(() => {});
					},
					get html() {
						return CurrentHtml;
					},
					set html(Value: string) {
						CurrentHtml = Value;
						Context.MountainClient?.sendRequest(
							"webview.setHtml",
							[Handle, Value],
						).catch(() => {});
					},
					cspSource:
						"vscode-resource: vscode-webview-resource: https:",
					asWebviewUri: (Uri: unknown) => Uri,
					postMessage: async (Message: unknown) => {
						try {
							await Context.MountainClient?.sendRequest(
								"webview.postMessage",
								[Handle, Message],
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
								Context.Emitter.removeListener(
									Event,
									Listener,
								);
							},
						};
					},
				},
				options: CurrentOptions,
				viewColumn: 1,
				active: true,
				visible: true,
				reveal: (Column?: number, PreserveFocus?: boolean) => {
					Context.MountainClient?.sendRequest("webview.reveal", [
						Handle,
						Column,
						PreserveFocus,
					]).catch(() => {});
				},
				dispose: () => {
					WebviewPanels.delete(Handle);
					Context.Emitter.removeAllListeners(
						`webview.message:${Handle}`,
					);
					Context.MountainClient?.sendRequest("webview.dispose", [
						Handle,
					]).catch(() => {});
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
			WebviewPanels.set(Handle, Panel);
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
					await Context.MountainClient?.sendRequest("Command.Execute", [
						"workbench.action.closeActiveEditor",
						[],
					]);
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
				const Handle = `treeDataProvider:${++TreeDataProviderCounter}`;
				TreeDataProviders.set(Handle, Provider);
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
			const Handle = `treeDataProvider:${++TreeDataProviderCounter}`;
			TreeDataProviders.set(Handle, Provider);
			TreeDataProvidersByViewId.set(ViewId, Provider);
			Context.MountainClient?.sendRequest("tree.register", [
				Handle,
				ViewId,
				{},
			]).catch(() => {});
			return {
				dispose: () => {
					TreeDataProviders.delete(Handle);
					TreeDataProvidersByViewId.delete(ViewId);
					Context.MountainClient?.sendRequest("tree.unregister", [
						Handle,
					]).catch(() => {});
				},
			};
		},
		registerWebviewPanelSerializer: () => ({ dispose: () => {} }),
		registerWebviewViewProvider: (ViewId: string, Provider: any) => {
			const Handle = `webviewView:${++WebviewViewCounter}`;
			WebviewViewProviders.set(Handle, Provider);
			Context.MountainClient?.sendRequest("webview.registerView", [
				Handle,
				ViewId,
			]).catch(() => {});
			return {
				dispose: () => {
					WebviewViewProviders.delete(Handle);
					Context.MountainClient?.sendRequest(
						"webview.unregisterView",
						[Handle],
					).catch(() => {});
				},
			};
		},
		registerCustomEditorProvider: (ViewType: string, Provider: any) => {
			const Handle = `customEditor:${++CustomEditorCounter}`;
			CustomEditorProviders.set(Handle, Provider);
			Context.MountainClient?.sendRequest(
				"webview.registerCustomEditor",
				[Handle, ViewType],
			).catch(() => {});
			return {
				dispose: () => {
					CustomEditorProviders.delete(Handle);
					Context.MountainClient?.sendRequest(
						"webview.unregisterCustomEditor",
						[Handle],
					).catch(() => {});
				},
			};
		},
		registerFileDecorationProvider: (Provider: any) => {
			const Handle = `fileDecoration:${Date.now()}:${Math.random().toString(36).slice(2)}`;
			Context.SendToMountain("register_file_decoration_provider", {
				handle: Handle,
				extension_id: "",
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
			const Handle = `uriHandler:${Date.now()}`;
			Context.SendToMountain("register_uri_handler", {
				handle: Handle,
				extension_id: "",
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
			const Handle = `terminalLink:${Date.now()}`;
			Context.SendToMountain("register_terminal_link_provider", {
				handle: Handle,
				extension_id: "",
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
			const Handle = `terminalProfile:${Id}:${Date.now()}`;
			Context.SendToMountain("register_terminal_profile_provider", {
				handle: Handle,
				profile_id: Id,
				extension_id: "",
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
			const Handle = `externalUriOpener:${Id}:${Date.now()}`;
			Context.SendToMountain("register_external_uri_opener", {
				handle: Handle,
				opener_id: Id,
				extension_id: "",
			}).catch(() => {});
			return {
				dispose: () => {
					Context.SendToMountain(
						"unregister_external_uri_opener",
						{ handle: Handle },
					).catch(() => {});
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
			const Handle = `progress:${++ProgressCounter}`;
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
		onDidWriteTerminalData: MakeEventSubscriber(
			Context,
			"terminalData",
		),
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

		activeTextEditor: undefined,
		visibleTextEditors: [] as unknown[],
		terminals: [] as unknown[],
		activeTerminal: undefined,
		state: { focused: true, active: true },
	};
};

export default CreateWindowNamespace;
