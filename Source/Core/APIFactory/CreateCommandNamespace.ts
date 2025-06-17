/*
 * File: Cocoon/Source/Core/APIFactory/CreateCommandNamespace.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ../../Service/Command/Service.js, effect, vs/platform/extensions/common/extensions.js, vscode
 */

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
 * @param CommandService The central service for command management.
 * @param ExtensionDescription The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.commands` API.
 */
const CreateCommandNamespace = (
	CommandService: CommandService["Type"],
	ExtensionDescription: IExtensionDescription,
): typeof VSCode.commands => {
	return {
		registerCommand: (ID, Handler, ThisArgument) =>
			CommandService.RegisterCommand(
				ID,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),

		registerTextEditorCommand: (ID, Handler, ThisArgument) =>
			CommandService.RegisterTextEditorCommand(
				ID,
				Handler,
				ThisArgument,
				ExtensionDescription,
			),

		registerDiffInformationCommand: (ID, Handler, ThisArgument) => {
			// Stub: Delegate to the generic command registration
			return CommandService.RegisterCommand(
				ID,
				Handler,
				ThisArgument,
				ExtensionDescription,
			);
		},

		executeCommand: <T>(ID: string, ...Argument: any[]) =>
			Effect.runPromise(
				CommandService.ExecuteCommand<T>(ID, ...Argument),
			),

		getCommands: (FilterInternal?: boolean) =>
			Effect.runPromise(CommandService.GetCommands(FilterInternal)),
	};
};

export default CreateCommandNamespace;
