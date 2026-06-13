/**
 * @module Handler/VscodeAPI/CommandsNamespace
 * @description
 * Factory for the vscode.commands namespace shim.
 *
 * `registerCommand` keeps the callback local (so extensions can be invoked
 * without a round trip) and simultaneously registers the command ID with
 * Mountain so the command palette / keybinding layer knows it exists.
 *
 * `executeCommand` tries the local handler first, then falls back to
 * Mountain for native / cross-extension commands.
 *
 * `getCommands` asks Mountain for the full registry (native + all
 * registered extension commands).
 */

import type { HandlerContext } from "../../Handler/Context.js";

import WrapCommandsNamespace from "../Wrap/Commands/Namespace.js";

import { LogRoute, Route } from "./Route.js";

const CreateCommandsNamespace = (
	Context: HandlerContext,

	LanguageProviderRegistry: typeof import("../../../Language/Provider/Registry.js"),
) =>
	WrapCommandsNamespace({
		registerCommand: (
			Command: string,

			Callback: (...Arguments: unknown[]) => unknown,
		) => {
			LanguageProviderRegistry.RegisterCommand(Command, Callback);

			Context.SendToMountain("registerCommand", {
				commandId: Command,
			}).catch(() => {});

			return {
				dispose: () => {
					LanguageProviderRegistry.UnregisterCommand(Command);

					Context.SendToMountain("unregisterCommand", {
						commandId: Command,
					}).catch(() => {});
				},
			};
		},

		registerTextEditorCommand: (
			Command: string,

			Callback: (...Arguments: unknown[]) => unknown,
		) => {
			// VS Code contract: callback receives `(textEditor, edit, ...args)`
			// where `edit` is a TextEditorEdit that buffers `replace` / `insert`
			// / `delete` / `setEndOfLine` calls and applies them atomically when
			// the callback returns. Previously the builder was a no-op stub, so
			// every Cmd+I / refactor / sort-lines registered through this API
			// silently did nothing. Wrap the active editor's real `edit()`
			// method so collected edits actually apply.
			const WrappedCallback = async (...Arguments: unknown[]) => {
				const TextEditor = (Context as any).__activeTextEditor;

				if (!TextEditor || typeof TextEditor.edit !== "function") {
					// No active editor - upstream raises an error notification.
					// Fall back to invoking the callback with a no-op builder
					// so the extension's pre-edit setup still runs (it may
					// surface its own user-facing error).
					const NoopBuilder = {
						replace: () => {},
						insert: () => {},
						delete: () => {},
						setEndOfLine: () => {},
					};

					return Callback(undefined, NoopBuilder, ...Arguments);
				}

				// Drive the callback INSIDE `editor.edit()` so the buffered
				// builder is the real one tied to the active model. The
				// extension's return value bubbles through the outer promise
				// so command consumers can `await commands.executeCommand(...)`.
				let ExtensionResult: unknown = undefined;

				await TextEditor.edit((Builder: unknown) => {
					ExtensionResult = Callback(
						TextEditor,

						Builder,
						...Arguments,
					);
				});

				// If the callback returned a promise (e.g. async refactor that
				// awaits an LSP response BEFORE issuing edits), await it so
				// caller observes completion.
				if (
					ExtensionResult &&
					typeof (ExtensionResult as PromiseLike<unknown>).then ===
						"function"
				) {
					return await (ExtensionResult as Promise<unknown>);
				}

				return ExtensionResult;
			};

			LanguageProviderRegistry.RegisterCommand(Command, WrappedCallback);

			Context.SendToMountain("registerCommand", {
				commandId: Command,
				kind: "textEditor",
			}).catch(() => {});

			return {
				dispose: () => {
					LanguageProviderRegistry.UnregisterCommand(Command);

					Context.SendToMountain("unregisterCommand", {
						commandId: Command,
					}).catch(() => {});
				},
			};
		},

		executeCommand: async (
			Command: string,
			...Arguments: unknown[]
		): Promise<unknown> => {
			// Route decision BEFORE dispatch so `[DEV:CMD-ROUTE]` observes
			// what actually happened. `Route()` probes
			// `LanguageProviderRegistry.HasCommand(Command)` - a Map lookup -
			// and returns `"local"` when present, `"mountain"` otherwise.
			// Keeps the tier split observable per-run; same pattern as
			// `[DEV:FS-ROUTE]`.
			const Decision = Route(Command, {
				Has: LanguageProviderRegistry.HasCommand,
			});

			LogRoute(Command, Decision;

			if (Decision === "local") {
				const LocalResult = LanguageProviderRegistry.ExecuteCommand(
					Command,
					...Arguments,
				;

				if (LocalResult !== undefined) {
					// Symmetric with the Mountain branch: fire the
					// `commands.executed` event for local routes too so
					// `vscode.commands.onDidExecuteCommand` callbacks see
					// extension-to-extension executeCommand calls. The
					// Mountain branch gets this via Mountain's dual-emit;
					// the local branch never reaches Mountain so we emit
					// here directly.
					try {
						Context.Emitter.emit("commands.executed", {
							command: Command,
							arguments: Arguments,
						};
					} catch {
						/* listener threw - swallow */
					}

					return LocalResult;
				}

				// Local handler returned undefined - either the extension's
				// command legitimately has no return value, or (rare) the
				// handler was deregistered between `Has` probe and invoke.
				// Fall through to Mountain so workbench commands with the
				// same id as a legitimate extension no-op still reach their
				// native handler.
			}

			try {
				// Routed by Mountain via Track::SideCarRequest → Command.Execute effect.
				return await Context.MountainClient?.sendRequest(
					"Command.Execute",

					[Command, ...Arguments],
				;
			} catch {
				return undefined;
			}
		},

		getCommands: async (FilterInternal?: boolean): Promise<string[]> => {
			try {
				const Response = await Context.MountainClient?.sendRequest(
					"Command.GetAll",

					[FilterInternal ?? false],
				;

				if (Array.isArray(Response)) return Response as string[];

				return [];
			} catch {
				return [];
			}
		},

		// `onDidExecuteCommand` - Mountain emits `sky://commands/executed`
		// to the renderer AND dual-emits `$acceptCommandExecuted` over
		// Vine to Cocoon. `Services/Handler/Notification/Handler.ts`
		// catches the latter and forwards onto the shared Emitter channel
		// `commands.executed`. Subscribe there - the prior implementation
		// used `import("@tauri-apps/api/event").listen(...)` which never
		// fires in Node.js (no `window.__TAURI__`), so extensions that
		// hooked onDidExecuteCommand never received events.
		onDidExecuteCommand: (
			Listener: (Event: {
				command: string;

				arguments: unknown[];
			}) => unknown,
		) => {
			const Wrapped = (Payload: unknown) => {
				try {
					const E = Payload as
						| { command: string; arguments: unknown[] }

						| undefined;

					if (E?.command) Listener(E;
				} catch {
					/* swallow */
				}
			};

			Context.Emitter.on("commands.executed", Wrapped;

			return {
				dispose: () => {
					try {
						Context.Emitter.removeListener(
							"commands.executed",

							Wrapped,
							);
					} catch {
						/* swallow */
					}
				},
			};
		},

		// Proposed API (`vscode.proposed.diffCommand.d.ts`). Extensions can
		// register a command that receives `LineChange[]` alongside the usual
		// args when invoked from a diff editor's toolbar. We delegate to
		// `registerCommand` - the extension only ever sees the standard args
		// until the diff editor is wired to prepend line-change data. Still
		// returns a real disposable so subscriptions dispose cleanly.
		registerDiffInformationCommand: (
			Command: string,

			Callback: (...Arguments: unknown[]) => unknown,
		) => {
			LanguageProviderRegistry.RegisterCommand(Command, Callback;

			Context.SendToMountain("registerCommand", {
				commandId: Command,
				kind: "diffInformation",
			}).catch(() => {};

			return {
				dispose: () => {
					LanguageProviderRegistry.UnregisterCommand(Command;

					Context.SendToMountain("unregisterCommand", {
						commandId: Command,
					}).catch(() => {};
				},
			};
		},
	};

export default CreateCommandsNamespace;
