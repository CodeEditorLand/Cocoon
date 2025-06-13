/**
 * @module CreateCommandNamespace
 * @description Constructs the `vscode.commands` namespace for the API object
 * provided to an extension.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type { Command as CommandService } from "../../Service.js";

/**
 * Creates the `vscode.commands` namespace object.
 *
 * This factory function takes the central `CommandService` and the specific
 * extension's description to create a sandboxed `commands` object. The methods
 * on this object delegate to the central service, ensuring that command
 * registration and execution are managed globally while providing the standard
 * `vscode` API to the extension.
 *
 * @param CommandService The central service for command management.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.commands` API.
 */
export const CreateCommandNamespace = (
	CommandService: CommandService.Interface,
	Extension: IExtensionDescription,
): typeof VSCode.commands => ({
	/**
	 * Registers a command.
	 */
	registerCommand: (Id, Handler, ThisArgument) =>
		CommandService.RegisterCommand(Id, Handler, ThisArgument, Extension),

	/**
	 * Registers a command that is only active when a text editor has focus.
	 */
	registerTextEditorCommand: (Id, Handler, ThisArgument) =>
		CommandService.RegisterTextEditorCommand(
			Id,
			Handler,
			ThisArgument,
			Extension,
		),

	/**
	 * Executes a command.
	 * It converts the `Effect`-based service call into a `Promise`, as
	 * expected by the `vscode` API.
	 */
	executeCommand: <T>(Id: string, ...Argument: any[]) =>
		Effect.runPromise(CommandService.ExecuteCommand<T>(Id, ...Argument)),

	/**
	 * Retrieves a list of all available command IDs.
	 * It converts the `Effect`-based service call into a `Promise`, as
	 * expected by the `vscode` API.
	 */
	getCommand: (FilterInternal?: boolean) =>
		Effect.runPromise(CommandService.GetCommand(FilterInternal)),
});
