/**
 * @module Handler/VscodeAPI/WindowNamespace
 * @description
 * Factory for the vscode.window namespace shim. Bridges extension-side VS Code
 * API calls to Mountain via SendToMountain. Subscribes to `window*` events on
 * Context.Emitter so extensions can observe editor/selection changes that
 * Mountain pushes down via gRPC notifications.
 */

import { EventEmitter as NodeEventEmitter } from "node:events";

import { NextProviderHandle } from "../../../Language/Provider/Registry.js";
import type { HandlerContext } from "../../Handler/Context.js";
import WrapWindowNamespace from "../Wrap/Window/Namespace.js";
import CreateOutputChannel from "./CreateOutputChannel.js";
import CreateStatusBarItem from "./CreateStatusBarItem.js";
import CreateTerminal from "./CreateTerminal.js";
import CreateWebviewPanel from "./CreateWebviewPanel.js";
import CreateWebviewViewBuilder from "./CreateWebviewViewBuilder.js";
import RegisterCustomEditor from "./RegisterCustomEditor.js";
import {
	CustomEditorProviders,
	CustomEditorProvidersByViewType,
	TreeDataProviders,
	TreeDataProvidersByViewId,
	WebviewPanels,
	WebviewViewBuilders,
	WebviewViewProviders,
} from "./Registry.js";

export {
	CustomEditorProviders,
	CustomEditorProvidersByViewType,
	TreeDataProviders,
	TreeDataProvidersByViewId,
	WebviewPanels,
	WebviewViewBuilders,
	WebviewViewProviders,
} from "./Registry.js";

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

// Registry maps are canonical in Registry.ts and re-exported from this
// module so existing imports (e.g. Notification/Handler.ts) remain unchanged.

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

			// When there are action buttons, route through Window.ShowQuickPick
			// (a round-trip) so the user's selection propagates back.
			// Without this, showInformationMessage("msg", "OK", "Cancel") always
			// resolves `undefined` and extensions never see which button was clicked.
			if (Actions.length > 0) {
				try {
					const QuickItems = Actions.map((A: unknown) => ({
						label:
							typeof A === "string"
								? A
								: ((A as any)?.title ?? String(A)),
					}));
					const Picked = await Context.MountainClient?.sendRequest(
						"Window.ShowQuickPick",
						[
							QuickItems,
							{
								placeHolder: Message,
								title: `[${Level.toUpperCase()}] ${Message}`,
							},
						],
					);
					if (Picked == null) return undefined;
					const PickedLabel =
						typeof Picked === "string"
							? Picked
							: ((Picked as any)?.label ?? String(Picked));
					return (
						Actions.find((A: unknown) => {
							const Label =
								typeof A === "string"
									? A
									: ((A as any)?.title ?? String(A));
							return Label === PickedLabel;
						}) ??
						PickedLabel ??
						undefined
					);
				} catch {
					return undefined;
				}
			}

			// No action buttons: fire-and-forget notification.
			try {
				await Context.MountainClient?.sendRequest(
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
				return undefined;
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

		createTerminal: (Options?: { name?: string; [k: string]: unknown }) => {
			const Stub = CreateTerminal(Context, NextProviderHandle(), Options);
			if (!Array.isArray((Context as any).__terminals)) {
				(Context as any).__terminals = [];
			}
			(Context as any).__terminals.push(Stub);
			(Context as any).__activeTerminal = Stub;
			// Fire onDidOpenTerminal and onDidChangeActiveTerminal events.
			setImmediate(() => {
				Context.Emitter.emit("window.didOpenTerminal", Stub);
				Context.Emitter.emit("window.didChangeActiveTerminal", Stub);
			});
			const OrigDispose = Stub.dispose.bind(Stub);
			Stub.dispose = () => {
				(Context as any).__terminals = (
					(Context as any).__terminals ?? []
				).filter((T: unknown) => T !== Stub);
				if ((Context as any).__activeTerminal === Stub) {
					(Context as any).__activeTerminal = undefined;
					Context.Emitter.emit(
						"window.didChangeActiveTerminal",
						undefined,
					);
				}
				Context.Emitter.emit("window.didCloseTerminal", Stub);
				OrigDispose();
			};
			return Stub;
		},

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

		createQuickPick: () => {
			// Live QuickPick: when `show()` is called, routes through
			// `Window.ShowQuickPick` (round-trip Mountain→Sky) with the
			// current items. On selection, fires `onDidAccept` /
			// `onDidChangeSelection`. On dismiss, fires `onDidHide`.
			const AcceptListeners: Array<() => void> = [];
			const SelectionListeners: Array<(items: unknown[]) => void> = [];
			const HideListeners: Array<() => void> = [];
			const ValueListeners: Array<(value: string) => void> = [];
			const State = {
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
				step: undefined as number | undefined,
				totalSteps: undefined as number | undefined,
				title: undefined as string | undefined,
				buttons: [] as unknown[],
			};
			let IsShown = false;
			const Show = () => {
				if (IsShown) return;
				IsShown = true;
				void (async () => {
					try {
						const Picked =
							await Context.MountainClient?.sendRequest(
								"Window.ShowQuickPick",
								[
									State.items,
									{
										placeHolder: State.placeholder,
										title: State.title,
										canPickMany: State.canSelectMany,
										matchOnDescription:
											State.matchOnDescription,
										matchOnDetail: State.matchOnDetail,
										ignoreFocusOut: State.ignoreFocusOut,
										step: State.step,
										totalSteps: State.totalSteps,
									},
								],
							);
						if (Picked != null) {
							const PickedArr = Array.isArray(Picked)
								? Picked
								: [Picked];
							State.selectedItems = PickedArr;
							for (const L of SelectionListeners) {
								try {
									L(PickedArr);
								} catch {}
							}
							for (const L of AcceptListeners) {
								try {
									L();
								} catch {}
							}
						}
					} finally {
						IsShown = false;
						for (const L of HideListeners) {
							try {
								L();
							} catch {}
						}
					}
				})();
			};
			const MakeEvent =
				<T>(Listeners: Array<(e: T) => void>) =>
				(
					Listener: (e: T) => void,
					_ThisArg?: unknown,
					Disposables?: {
						push: (D: { dispose: () => void }) => void;
					},
				) => {
					const Bound = _ThisArg
						? (Listener as any).bind(_ThisArg)
						: Listener;
					Listeners.push(Bound as (e: T) => void);
					const Sub = {
						dispose: () => {
							const I = Listeners.indexOf(
								Bound as (e: T) => void,
							);
							if (I !== -1) Listeners.splice(I, 1);
						},
					};
					Disposables?.push(Sub);
					return Sub;
				};
			const MakeEventNoArg =
				(Listeners: Array<() => void>) =>
				(
					Listener: () => void,
					_ThisArg?: unknown,
					Disposables?: {
						push: (D: { dispose: () => void }) => void;
					},
				) => {
					const Bound = _ThisArg
						? (Listener as any).bind(_ThisArg)
						: Listener;
					Listeners.push(Bound);
					const Sub = {
						dispose: () => {
							const I = Listeners.indexOf(Bound);
							if (I !== -1) Listeners.splice(I, 1);
						},
					};
					Disposables?.push(Sub);
					return Sub;
				};
			return Object.assign(State, {
				show: Show,
				hide: () => {
					for (const L of HideListeners) {
						try {
							L();
						} catch {}
					}
				},
				dispose: () => {},
				onDidAccept: MakeEventNoArg(AcceptListeners),
				onDidChangeValue: MakeEvent<string>(ValueListeners),
				onDidChangeActive: MakeEvent<unknown[]>(SelectionListeners),
				onDidChangeSelection: MakeEvent<unknown[]>(SelectionListeners),
				onDidTriggerButton: () => ({ dispose: () => {} }),
				onDidTriggerItemButton: () => ({ dispose: () => {} }),
				onDidHide: MakeEventNoArg(HideListeners),
			});
		},

		createInputBox: () => {
			// Live InputBox: when `show()` is called, routes through
			// `Window.ShowInputBox` (round-trip Mountain→Sky).
			const AcceptListeners: Array<() => void> = [];
			const HideListeners: Array<() => void> = [];
			const ValueListeners: Array<(value: string) => void> = [];
			const State = {
				value: "",
				valueSelection: undefined as [number, number] | undefined,
				placeholder: undefined as string | undefined,
				password: false,
				busy: false,
				enabled: true,
				ignoreFocusOut: false,
				prompt: undefined as string | undefined,
				validationMessage: undefined as string | undefined,
				step: undefined as number | undefined,
				totalSteps: undefined as number | undefined,
				title: undefined as string | undefined,
				buttons: [] as unknown[],
			};
			let IsShown = false;
			const Show = () => {
				if (IsShown) return;
				IsShown = true;
				void (async () => {
					try {
						const Result =
							await Context.MountainClient?.sendRequest(
								"Window.ShowInputBox",
								[
									{
										prompt: State.prompt,
										placeHolder: State.placeholder,
										value: State.value,
										password: State.password,
										title: State.title,
										step: State.step,
										totalSteps: State.totalSteps,
										ignoreFocusOut: State.ignoreFocusOut,
									},
								],
							);
						if (typeof Result === "string") {
							State.value = Result;
							for (const L of ValueListeners) {
								try {
									L(Result);
								} catch {}
							}
							for (const L of AcceptListeners) {
								try {
									L();
								} catch {}
							}
						}
					} finally {
						IsShown = false;
						for (const L of HideListeners) {
							try {
								L();
							} catch {}
						}
					}
				})();
			};
			const MakeEventNoArg =
				(Listeners: Array<() => void>) =>
				(
					Listener: () => void,
					_ThisArg?: unknown,
					Disposables?: {
						push: (D: { dispose: () => void }) => void;
					},
				) => {
					const Bound = _ThisArg
						? (Listener as any).bind(_ThisArg)
						: Listener;
					Listeners.push(Bound);
					const Sub = {
						dispose: () => {
							const I = Listeners.indexOf(Bound);
							if (I !== -1) Listeners.splice(I, 1);
						},
					};
					Disposables?.push(Sub);
					return Sub;
				};
			const MakeEventStr =
				(Listeners: Array<(v: string) => void>) =>
				(
					Listener: (v: string) => void,
					_ThisArg?: unknown,
					Disposables?: {
						push: (D: { dispose: () => void }) => void;
					},
				) => {
					const Bound = _ThisArg
						? (Listener as any).bind(_ThisArg)
						: Listener;
					Listeners.push(Bound);
					const Sub = {
						dispose: () => {
							const I = Listeners.indexOf(Bound);
							if (I !== -1) Listeners.splice(I, 1);
						},
					};
					Disposables?.push(Sub);
					return Sub;
				};
			return Object.assign(State, {
				show: Show,
				hide: () => {
					for (const L of HideListeners) {
						try {
							L();
						} catch {}
					}
				},
				dispose: () => {},
				onDidAccept: MakeEventNoArg(AcceptListeners),
				onDidChangeValue: MakeEventStr(ValueListeners),
				onDidTriggerButton: () => ({ dispose: () => {} }),
				onDidHide: MakeEventNoArg(HideListeners),
			});
		},

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
			// Round-trip via Mountain so Sky opens the editor, then return a
			// full TextEditor shim so `.edit()`, `.setDecorations()`,
			// `.revealRange()`, etc. work immediately.
			const UriRaw =
				(_Document as any)?.uri?.toString?.() ??
				(_Document as any)?.toString?.() ??
				"";
			try {
				await Context.MountainClient?.sendRequest("showTextDocument", [
					_Document,
					_Column,
					_PreserveFocus,
				]);
			} catch {
				// Mountain not yet connected or Sky rejected - no-op.
			}
			// If the active editor now matches the requested URI, return it.
			const Active = (Context as any).__activeTextEditor;
			const ActiveUri = Active?.document?.uri?.toString?.() ?? "";
			if (Active && (ActiveUri === UriRaw || !UriRaw)) {
				return Active;
			}
			// Build a live TextEditor shim that routes mutations through Mountain.
			const DocText =
				(Context as any).DocumentContentCache?.get(UriRaw) ?? "";
			const DocLines = DocText.split(/\r?\n/);
			const LiveSel = {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 0 },
				active: { line: 0, character: 0 },
				anchor: { line: 0, character: 0 },
				isEmpty: true,
				isReversed: false,
				isSingleLine: true,
			};
			return {
				document: {
					uri: {
						toString: () => UriRaw,
						fsPath: UriRaw.replace(/^file:\/\//, ""),
						scheme: "file",
					},
					fileName: UriRaw.replace(/^file:\/\//, ""),
					languageId: "plaintext",
					version: 1,
					isDirty: false,
					isClosed: false,
					isUntitled: false,
					eol: 1,
					lineCount: DocLines.length,
					getText: () => DocText,
					lineAt: (N: any) => {
						const Ln = typeof N === "number" ? N : (N?.line ?? 0);
						const T = DocLines[Ln] ?? "";
						return {
							text: T,
							lineNumber: Ln,
							range: {
								start: { line: Ln, character: 0 },
								end: { line: Ln, character: T.length },
							},
							firstNonWhitespaceCharacterIndex: Math.max(
								0,
								T.search(/\S/),
							),
							isEmptyOrWhitespace: T.trim().length === 0,
						};
					},
					positionAt: (Off: number) => {
						let R = Off;
						for (let I = 0; I < DocLines.length; I++) {
							const L = (DocLines[I]?.length ?? 0) + 1;
							if (R < L) return { line: I, character: R };
							R -= L;
						}
						return {
							line: DocLines.length - 1,
							character:
								DocLines[DocLines.length - 1]?.length ?? 0,
						};
					},
					offsetAt: (P: any) => {
						let O = 0;
						for (let I = 0; I < (P?.line ?? 0); I++)
							O += (DocLines[I]?.length ?? 0) + 1;
						return O + (P?.character ?? 0);
					},
					save: async () => true,
					getWordRangeAtPosition: () => undefined,
					validateRange: (R: any) => R,
					validatePosition: (P: any) => P,
				},
				get selection() {
					return LiveSel;
				},
				set selection(S: any) {
					Object.assign(LiveSel, S);
				},
				selections: [LiveSel],
				visibleRanges: [],
				viewColumn:
					(typeof _Column === "number"
						? _Column
						: (_Column as any)?.viewColumn) ?? 1,
				options: { tabSize: 4, insertSpaces: true },
				setDecorations: (Type: any, Ranges: any[]) => {
					const Key =
						typeof Type === "string"
							? Type
							: (Type?.key ?? Type?.id ?? String(Type));
					Context.SendToMountain("window.setTextEditorDecorations", {
						decorationTypeKey: Key,
						uri: UriRaw,
						rangesOrOptions: Ranges,
					}).catch(() => {});
				},
				edit: (Callback: (Builder: any) => void): Promise<boolean> => {
					const Collected: any[] = [];
					const Builder = {
						replace: (Range: any, Value: string) =>
							Collected.push({ range: Range, text: Value }),
						insert: (Position: any, Value: string) =>
							Collected.push({
								range: {
									startLineNumber: (Position?.line ?? 0) + 1,
									startColumn: (Position?.character ?? 0) + 1,
									endLineNumber: (Position?.line ?? 0) + 1,
									endColumn: (Position?.character ?? 0) + 1,
								},
								text: Value,
							}),
						delete: (Range: any) =>
							Collected.push({ range: Range, text: "" }),
						setEndOfLine: () => {},
					};
					try {
						Callback(Builder);
					} catch {
						return Promise.resolve(false);
					}
					if (!Collected.length) return Promise.resolve(true);
					return Context.SendToMountain("window.applyTextEdits", {
						uri: UriRaw,
						edits: Collected,
					})
						.then(() => true)
						.catch(() => false);
				},
				insertSnippet: async (
					Snippet: any,
					Location?: any,
				): Promise<boolean> => {
					const Text =
						typeof Snippet === "string"
							? Snippet
							: (Snippet?.value ?? "");
					await Context.SendToMountain("window.applyTextEdits", {
						uri: UriRaw,
						edits: [{ range: Location ?? LiveSel, text: Text }],
					}).catch(() => {});
					return true;
				},
				revealRange: (Range: any, RevealType?: number) => {
					void Context.MountainClient?.sendRequest(
						"window.revealRange",
						{
							uri: UriRaw,
							range: Range,
							revealType: RevealType ?? 0,
						},
					).catch(() => {});
				},
				show: (ViewColumn?: number) => {
					void Context.MountainClient?.sendRequest(
						"showTextDocument",
						[
							{ uri: UriRaw, viewColumn: ViewColumn ?? 1 },
							ViewColumn ?? 1,
						],
					).catch(() => {});
				},
				hide: () => {},
			};
		},

		showNotebookDocument: async (_Document: unknown, _Options?: unknown) =>
			undefined,

		tabGroups: {
			get all() {
				// Return a single active tab group reflecting the current visible editors.
				const Visible: unknown[] =
					(Context as any).__visibleTextEditors ?? [];
				const Tabs = Visible.map((Ed: unknown) => {
					const Uri = (Ed as any)?.document?.uri;
					const FileName =
						typeof Uri?.toString === "function"
							? Uri.toString()
							: String(Uri ?? "");
					return {
						label: FileName.split("/").pop() ?? "",
						isActive:
							(Ed as any) === (Context as any).__activeTextEditor,
						isPinned: false,
						isDirty: false,
						isPreview: false,
						group: undefined,
						input: { uri: Uri, fileName: FileName },
					};
				});
				return [
					{
						tabs: Tabs,
						isActive: true,
						viewColumn: 1,
						activeTab: Tabs.find((T: any) => T.isActive),
					},
				];
			},
			activeTabGroup: {
				get tabs() {
					const Visible: unknown[] =
						(Context as any).__visibleTextEditors ?? [];
					return Visible.map((Ed: unknown) => {
						const Uri = (Ed as any)?.document?.uri;
						const FileName =
							typeof Uri?.toString === "function"
								? Uri.toString()
								: String(Uri ?? "");
						return {
							label: FileName.split("/").pop() ?? "",
							isActive:
								(Ed as any) ===
								(Context as any).__activeTextEditor,
							isPinned: false,
							isDirty: false,
							isPreview: false,
							group: undefined,
							input: { uri: Uri, fileName: FileName },
						};
					});
				},

				isActive: true,

				viewColumn: 1,

				// Live getter: return a minimal Tab shape for the active editor.
				get activeTab() {
					const Active = (Context as any).__activeTextEditor;
					if (!Active) return undefined;
					const Uri = Active?.document?.uri;
					const FileName =
						typeof Uri?.toString === "function"
							? Uri.toString()
							: String(Uri ?? "");
					return {
						label: FileName.split("/").pop() ?? "",
						isActive: true,
						isPinned: false,
						isDirty: false,
						isPreview: false,
						group: undefined,
						input: { uri: Uri, fileName: FileName },
					};
				},
			},
			onDidChangeTabs: MakeEventSubscriber(
				Context,

				"window.didChangeTabs",
			),
			onDidChangeTabGroups: MakeEventSubscriber(
				Context,

				"window.didChangeTabGroups",
			),
			close: async (Tab: unknown, _PreserveFocus?: boolean) => {
				// Try workbench IEditorGroupsService.closeEditor() for the specific
				// tab's URI, then fall back to closeActiveEditor.
				try {
					const EditorGroups = (globalThis as any).__CEL_SERVICES__
						?.EditorGroups;
					const TabUri = (Tab as any)?.input?.uri;
					if (EditorGroups && TabUri) {
						const Group = EditorGroups.activeGroup;
						if (Group?.closeEditor) {
							const Editor = Group.findEditor?.(TabUri);
							if (Editor) {
								await Group.closeEditor(Editor, {
									preserveFocus: _PreserveFocus ?? false,
								});
								return true;
							}
						}
					}
				} catch {
					/* fall through to workbench command */
				}
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

		get activeColorTheme() {
			// Dynamically read from the workbench's IThemeService so extensions
			// that check `window.activeColorTheme.kind === ColorThemeKind.Light`
			// get the real theme rather than always-dark.
			// ColorThemeKind: 1=Light, 2=Dark, 3=HighContrast, 4=HighContrastLight
			let Kind = 2; // Dark default
			try {
				const ThemeService = (globalThis as any).__CEL_SERVICES__
					?.Theme;
				const ColorTheme = ThemeService?.getColorTheme?.();
				if (ColorTheme?.type) {
					const T = ColorTheme.type;
					if (T === "light") Kind = 1;
					else if (T === "hc-light") Kind = 4;
					else if (T === "hc-black" || T === "hc") Kind = 3;
					else Kind = 2;
				}
			} catch {
				/* workbench not ready */
			}
			return {
				kind: Kind,
				onDidChange: MakeEventSubscriber(
					Context,
					"window.didChangeActiveColorTheme",
				),
			};
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
			// Per-view event emitter so each TreeView instance gets its own
			// event streams for selection/visibility/collapse/expand.
			const ViewEmitter = new NodeEventEmitter();
			ViewEmitter.setMaxListeners(0);
			const MakeViewEvent =
				(EventName: string) => (Listener: (...A: any[]) => any) => {
					ViewEmitter.on(EventName, Listener);
					return {
						dispose: () =>
							void ViewEmitter.removeListener(
								EventName,
								Listener,
							),
					};
				};
			// Register this view's emitter on Context so Mountain notifications
			// (treeView.selectionChanged, collapseElement, expandElement) can fire it.
			const ViewEmitters: Map<string, typeof ViewEmitter> = ((
				Context as any
			).__treeViewEmitters ??= new Map());
			ViewEmitters.set(Id, ViewEmitter);

			return {
				reveal: async (
					Element: unknown,
					Options?: {
						select?: boolean;
						focus?: boolean;
						expand?: boolean | number;
					},
				) => {
					// Tell Mountain (→ Sky) to reveal this element in the tree view.
					// Sky's Bridge fires the workbench's `IViewsService.openView(Id)` +
					// scrolls to the element if it's visible in the rendered tree.
					const Handle =
						typeof (Element as any)?.handle === "string"
							? (Element as any).handle
							: typeof Element === "string"
								? Element
								: "";
					Context.MountainClient?.sendRequest("tree.reveal", [
						Id,
						Handle,
						{
							select: Options?.select ?? true,
							focus: Options?.focus ?? false,
							expand: Options?.expand ?? false,
						},
					]).catch(() => {});
				},

				dispose: () => {
					TreeDataProvidersByViewId.delete(Id);
					ViewEmitters.delete(Id);
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

				onDidChangeSelection: MakeViewEvent(
					"treeView.selectionChanged",
				),

				onDidChangeVisibility: MakeViewEvent(
					"treeView.visibilityChanged",
				),

				onDidCollapseElement: MakeViewEvent("treeView.collapseElement"),

				onDidExpandElement: MakeViewEvent("treeView.expandElement"),

				onDidChangeCheckboxState: MakeViewEvent(
					"treeView.checkboxChanged",
				),
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

		// Live getter: reflects the last `window.didChangeActiveTextEditor`
		// notification stored on Context by NotificationHandler. Extensions
		// that read `vscode.window.activeTextEditor` synchronously in
		// `activate()` see the current value rather than always `undefined`.
		get activeTextEditor() {
			return (Context as any).__activeTextEditor ?? undefined;
		},

		// `activeColorTheme` and `tabGroups` already defined earlier in
		// this object literal (lines ~614 and ~581) - leaving the
		// fuller event-aware definitions intact and only mirroring the
		// remaining state placeholders here.
		get visibleTextEditors() {
			return (Context as any).__visibleTextEditors ?? [];
		},

		visibleNotebookEditors: [] as unknown[],

		activeNotebookEditor: undefined,

		notebookEditors: [] as unknown[],

		get terminals() {
			return (Context as any).__terminals ?? [];
		},

		get activeTerminal() {
			return (Context as any).__activeTerminal ?? undefined;
		},

		get state() {
			return (
				(Context as any).__windowState ?? {
					focused: true,
					active: true,
				}
			);
		},
	};

	return WrapWindowNamespace(Concrete);
};

export default CreateWindowNamespace;
