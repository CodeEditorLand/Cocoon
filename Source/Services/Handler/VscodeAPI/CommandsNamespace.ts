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

import type { HandlerContext } from "../HandlerContext.js";

const CreateCommandsNamespace = (
	Context: HandlerContext,
	LanguageProviderRegistry: typeof import("../../LanguageProviderRegistry.js"),
) => ({
	registerCommand: (
		Command: string,
		Callback: (...Arguments: unknown[]) => unknown,
	) => {
		LanguageProviderRegistry.RegisterCommand(Command, Callback);
		Context.SendToMountain("registerCommand", { commandId: Command }).catch(
			() => {},
		);
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
		const LocalResult = LanguageProviderRegistry.ExecuteCommand(
			Command,
			...Arguments,
		);
		if (LocalResult !== undefined) return LocalResult;
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
});

export default CreateCommandsNamespace;
