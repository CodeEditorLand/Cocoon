/**
 * @module CreateCommandNamespace
 * @description Constructs the `vscode.commands` namespace for the API object
 * provided to an extension.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type CommandService from "../../Service/Command/Service.js";

/**
 * Creates the `vscode.commands` namespace object.
 */
export default function (
	Command: CommandService,
	Extension: IExtensionDescription,
): typeof VSCode.commands {
	return {
		registerCommand: (ID, Handler, ThisArgument) =>
			Command.RegisterCommand(ID, Handler, ThisArgument, Extension),

		registerTextEditorCommand: (ID, Handler, ThisArgument) =>
			Command.RegisterTextEditorCommand(
				ID,
				Handler,
				ThisArgument,
				Extension,
			),

		registerDiffInformationCommand: (ID, Handler, ThisArgument) => {
			// Stub: Delegate to the generic command registration
			return Command.RegisterCommand(
				ID,
				Handler,
				ThisArgument,
				Extension,
			);
		},

		// registerUIEditorContentCommand: (ID, Handler) => {
		// 	// Stub: Delegate to the generic command registration
		// 	return Command.RegisterCommand(ID, Handler);
		// },

		executeCommand: <T>(ID: string, ...Argument: any[]) =>
			Effect.runPromise(Command.ExecuteCommand<T>(ID, ...Argument)),

		getCommands: (FilterInternal?: boolean) =>
			Effect.runPromise(Command.GetCommands(FilterInternal)),
	};
}
