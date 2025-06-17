/*
 * File: Cocoon/Source/Service/Command/Service.ts
 * Responsibility:
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: ./Type.js, effect, vs/platform/extensions/common/extensions.js, vscode
 * Export: CommandService
 */

/**
 * @module Service (Command)
 * @description Defines the interface and Context.Tag for the Command service.
 * This service manages the registration and execution of all commands.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { Disposable } from "vscode";

import type { CommandHandler, TextEditorCommandHandler } from "./Type.js";

export default class CommandService extends Context.Tag("Service/Command")<
	CommandService,
	{
		/**
		 * Registers a command that can be invoked via a command ID.
		 * @param ID The command's identifier.
		 * @param Handler The command handler function.
		 * @param ThisArgument The `this` context used when invoking the handler.
		 * @param ExtensionDescription The extension registering the command.
		 * @returns A disposable which unregisters the command.
		 */
		readonly RegisterCommand: (
			ID: string,
			Handler: CommandHandler,
			ThisArgument?: any,
			ExtensionDescription?: IExtensionDescription,
		) => Disposable;

		/**
		 * Registers a command that is only active when a text editor has focus.
		 */
		readonly RegisterTextEditorCommand: (
			ID: string,
			Handler: TextEditorCommandHandler,
			ThisArgument?: any,
			ExtensionDescription?: IExtensionDescription,
		) => Disposable;

		/**
		 * Executes the command denoted by the given command identifier.
		 * @param ID Identifier of the command to execute.
		 * @param Arguments Arguments that the command handler receives.
		 * @returns An `Effect` that resolves with the command's result.
		 */
		readonly ExecuteCommand: <T>(
			ID: string,
			...Arguments: any[]
		) => Effect.Effect<T, Error>;

		/**
		 * Retreives a list of all available command identifiers.
		 * @param FilterInternal If `true`, commands starting with an underscore are excluded.
		 * @returns An `Effect` that resolves with an array of command IDs.
		 */
		readonly GetCommands: (
			FilterInternal?: boolean,
		) => Effect.Effect<string[], Error>;
	}
>() {}
