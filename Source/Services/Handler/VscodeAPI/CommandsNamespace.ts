/**
 * @module Handler/VscodeAPI/CommandsNamespace
 * @description
 * Factory for the vscode.commands namespace shim.
 * Provides: registerCommand, executeCommand, getCommands.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateCommandsNamespace = (
	Context: HandlerContext,
	LanguageProviderRegistry: typeof import("../../LanguageProviderRegistry.js"),
) => ({
	registerCommand: (Command: string, Callback: Function) => {
		LanguageProviderRegistry.RegisterCommand(Command, Callback);
		Context.SendToMountain("registerCommand", { commandId: Command }).catch(() => {});
		return { dispose: () => {} };
	},
	executeCommand: async (Command: string, ...Arguments: unknown[]) => {
		// Try local handler first, then forward to Mountain
		const LocalResult = LanguageProviderRegistry.ExecuteCommand(Command, ...Arguments);
		if (LocalResult !== undefined) return LocalResult;
		try {
			return await Context.MountainClient?.sendRequest("executeCommand", { commandId: Command, arguments: Arguments });
		} catch { return undefined; }
	},
	getCommands: async () => [] as string[],
});

export default CreateCommandsNamespace;
