/**
 * @module CreateCommandNamespace
 * @description Constructs the `vscode.commands` namespace for the API object
 * provided to an extension.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type CommandService from "../../Service/Command/Service.js";

/**
 * Creates the `vscode.commands` namespace object.
 * @param CommandService The central service for command management.
 * @param ExtensionDescription The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.commands` API, with methods returning Effects.
 */
const CreateCommandNamespace = (
	CommandServiceInstance: CommandService,
	ExtensionDescription: IExtensionDescription,
): typeof VSCode.commands => {
	// The `register` methods in the vscode API are synchronous and return a Disposable.
	// Our underlying service method matches this signature, so no change is needed here.
	const RegisterCommand = (
		ID: string,
		Handler: (...args: any[]) => any,
		ThisArgument?: any,
	) =>
		CommandServiceInstance.RegisterCommand(
			ID,
			Handler,
			ThisArgument,
			ExtensionDescription,
		);

	const RegisterTextEditorCommand = (
		ID: string,
		Handler: (
			textEditor: VSCode.TextEditor,
			edit: VSCode.TextEditorEdit,
			...args: any[]
		) => void,
		ThisArgument?: any,
	) =>
		CommandServiceInstance.RegisterTextEditorCommand(
			ID,
			Handler,
			ThisArgument,
			ExtensionDescription,
		);

	// The `execute` and `get` methods should return a composable Effect.
	const ExecuteCommand = <T>(ID: string, ...Argument: any[]) =>
		CommandServiceInstance.ExecuteCommand<T>(ID, ...Argument);

	const GetCommands = (FilterInternal?: boolean) =>
		CommandServiceInstance.GetCommands(FilterInternal);

	return {
		registerCommand: RegisterCommand,
		registerTextEditorCommand: RegisterTextEditorCommand,
		// Alias to generic registration
		registerDiffInformationCommand: RegisterCommand,
		// Cast to `any` to satisfy the `Promise` in the vscode.d.ts, will be handled by caller
		executeCommand: ExecuteCommand as any,
		// Cast to `any` to satisfy the `Promise` in the vscode.d.ts, will be handled by caller
		getCommands: GetCommands as any,
	};
};

export default CreateCommandNamespace;
