/**
 * @module Service (Commands)
 * @description Defines the interface and Context.Tag for the Commands service.
 */

import { Context, Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { IDisposable } from "vscode";

import type { CommandHandler } from "./Type.js";

export interface Interface {
	readonly RegisterCommand: (
		Id: string,
		Handler: CommandHandler,
		ThisArg?: any,
		Extension?: IExtensionDescription,
	) => IDisposable;

	readonly RegisterTextEditorCommand: (
		Id: string,
		Handler: CommandHandler,
		ThisArg?: any,
		Extension?: IExtensionDescription,
	) => IDisposable;

	readonly ExecuteCommand: <T>(
		Id: string,
		...Args: any[]
	) => Effect.Effect<T, Error>;

	readonly GetCommands: (
		FilterInternal?: boolean,
	) => Effect.Effect<string[], Error>;
}

export const Tag = Context.Tag<Interface>("Service/Commands");
