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
	(Callback: Listener<unknown>) => {
		Context.Emitter.on(EventName, Callback);
		return {
			dispose: () => {
				Context.Emitter.off(EventName, Callback);
			},
		};
	};

let OutputChannelCounter = 0;
let TerminalCounter = 0;
let StatusBarCounter = 0;

const CreateWindowNamespace = (Context: HandlerContext) => {
	// User-interaction prompts need a *round-trip* (sendRequest) not a
	// fire-and-forget notification (SendToMountain). Extensions like the
	// TypeScript updater, Git conflict resolver, and Azure sign-in all gate
	// behaviour on the returned selection — returning undefined unconditionally
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
			// via a Mountain round-trip the first time it's awaited — cache
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
				// LogOutputChannel additions — returned when the caller passes
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
			_ViewType: string,
			_Title: string,
			_ShowOptions: unknown,
			_Options?: unknown,
		) => ({
			viewType: _ViewType,
			title: _Title,
			iconPath: undefined,
			webview: {
				options: {},
				html: "",
				cspSource: "",
				asWebviewUri: (Uri: unknown) => Uri,
				postMessage: async () => false,
				onDidReceiveMessage: () => ({ dispose: () => {} }),
			},
			options: {},
			viewColumn: 1,
			active: true,
			visible: true,
			reveal: () => {},
			dispose: () => {},
			onDidDispose: () => ({ dispose: () => {} }),
			onDidChangeViewState: () => ({ dispose: () => {} }),
		}),

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
			onDidChangeTabs: () => ({ dispose: () => {} }),
			onDidChangeTabGroups: () => ({ dispose: () => {} }),
			close: async () => true,
		},

		activeColorTheme: {
			kind: 2, // ColorThemeKind.Dark
			onDidChange: () => ({ dispose: () => {} }),
		},
		onDidChangeActiveColorTheme: MakeEventSubscriber(
			Context,
			"window.didChangeActiveColorTheme",
		),

		createTreeView: (_Id: string, _Options: unknown) => ({
			reveal: async () => {},
			dispose: () => {},
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
		}),

		registerTreeDataProvider: () => ({ dispose: () => {} }),
		registerWebviewPanelSerializer: () => ({ dispose: () => {} }),
		registerWebviewViewProvider: () => ({ dispose: () => {} }),
		registerCustomEditorProvider: () => ({ dispose: () => {} }),
		registerFileDecorationProvider: () => ({ dispose: () => {} }),
		registerUriHandler: () => ({ dispose: () => {} }),
		registerTerminalLinkProvider: () => ({ dispose: () => {} }),
		registerTerminalProfileProvider: () => ({ dispose: () => {} }),
		registerProfileContentHandler: (_Id: string, _Handler: unknown) => ({
			dispose: () => {},
		}),
		registerExternalUriOpener: (
			_Id: string,
			_Opener: unknown,
			_Metadata?: unknown,
		) => ({ dispose: () => {} }),

		withProgress: async (_Option: unknown, Task: any) =>
			Task({ report: () => {} }),

		setStatusBarMessage: (
			Text: string,
			HideAfter?: number | Thenable<unknown>,
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
