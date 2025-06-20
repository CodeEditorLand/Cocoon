

/**
 * @module Type (Command)
 * @description Defines types used by the Command service.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type { TextEditor, TextEditorEdit } from "vscode";

/**
 * A general-purpose command handler function.
 */
export type CommandHandler = (...args: any[]) => any;

/**
 * A command handler specifically for text editor commands, which receives the
 * active editor and an edit builder as arguments.
 */
export type TextEditorCommandHandler = (
	editor: TextEditor,
	edit: TextEditorEdit,
	...args: any[]
) => any;

/**
 * The internal representation of a registered command, holding its handler
 * and the extension that registered it.
 */
export interface CommandHandlerEntry {
	readonly Handler: CommandHandler;
	readonly ThisArgument: any;
	readonly Extension: IExtensionDescription;
	/** Indicates if the command requires an active text editor. */
	readonly IsTextEditorCommand: boolean;
}
