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
			LanguageProviderRegistry.RegisterCommand(Command, Callback);
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
			LogRoute(Command, Decision);

			if (Decision === "local") {
				const LocalResult = LanguageProviderRegistry.ExecuteCommand(
					Command,
					...Arguments,
				);
				if (LocalResult !== undefined) return LocalResult;
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
				);
			} catch {
				return undefined;
			}
		},

		getCommands: async (FilterInternal?: boolean): Promise<string[]> => {
			try {
				const Response = await Context.MountainClient?.sendRequest(
					"Command.GetAll",
					[FilterInternal ?? false],
				);
				if (Array.isArray(Response)) return Response as string[];
				return [];
			} catch {
				return [];
			}
		},

		// `onDidExecuteCommand` - stock VS Code event that fires post-dispatch
		// for any `executeCommand` call. Extensions (vim, gitlens, telemetry
		// collectors) subscribe to observe user-invoked commands. Land doesn't
		// surface a post-dispatch stream yet; stub with a no-op disposable so
		// the subscription doesn't crash. Emitting real events requires a hook
		// in the Mountain Command.Execute effect to broadcast back - deferred.
		onDidExecuteCommand: (
			_Listener: (Event: {
				command: string;
				arguments: unknown[];
			}) => unknown,
		) => ({ dispose: () => {} }),

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
			LanguageProviderRegistry.RegisterCommand(Command, Callback);
			Context.SendToMountain("registerCommand", {
				commandId: Command,
				kind: "diffInformation",
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
	});

export default CreateCommandsNamespace;
