/**
 * @module CreateCommandNamespace
 * @description Constructs the `vscode.commands` namespace for the API object
 * provided to an extension.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type { Command as CommandService } from "../../Service/Command.js";

/**
 * Creates the `vscode.commands` namespace object.
 */
export function CreateCommandNamespace(
	CommandService: CommandService.Interface,
	Extension: IExtensionDescription,
): typeof VSCode.commands {
	return {
		registerCommand: (ID, Handler, ThisArgument) =>
			CommandService.RegisterCommand(
				ID,
				Handler,
				ThisArgument,
				Extension,
			),

		registerTextEditorCommand: (ID, Handler, ThisArgument) =>
			CommandService.RegisterTextEditorCommand(
				ID,
				Handler,
				ThisArgument,
				Extension,
			),

		registerDiffInformationCommand: (ID, Handler, ThisArgument) => {
			// Stub: Delegate to the generic command registration
			return CommandService.RegisterCommand(
				ID,
				Handler,
				ThisArgument,
				Extension,
			);
		},

		// registerUIEditorContentCommand: (ID, Handler) => {
		// 	// Stub: Delegate to the generic command registration
		// 	return CommandService.RegisterCommand(ID, Handler);
		// },

		executeCommand: <T>(ID: string, ...Argument: any[]) =>
			Effect.runPromise(
				CommandService.ExecuteCommand<T>(ID, ...Argument),
			),

		getCommands: (FilterInternal?: boolean) =>
			Effect.runPromise(CommandService.GetCommands(FilterInternal)),
	};
}
