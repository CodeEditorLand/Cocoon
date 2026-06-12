/**
 * @module StatusBar
 * @description Type converters for the `vscode.StatusBarItem` API.
 */

import type { Command, StatusBarItem as VSCodeStatusBarItem } from "vscode";

import { MarkdownString, ThemeColor } from "../../Platform/VSCode/Type.js";

import type { Command as CommandConverter } from "../Command.js";

import { FromAPI as MarkdownStringFromAPI } from "../Main/Markdown/String.js";

// Placeholder DTO, matching VS Code's internal structure.
interface IStatusbarEntry {

	id: string;

	name: string | undefined;

	text: string;

	tooltip: string | any | undefined;

	command: any | undefined;

	priority: number | undefined;

	alignment: number; // 0 for Left, 1 for Right

	backgroundColor: string | undefined;

	color: string | undefined;

	accessibilityInformation: any | undefined;
}

/**
 * @description Converts a `vscode.StatusBarItem` object into a plain DTO for IPC.
 * @param From The `vscode.StatusBarItem` instance to convert.
 * @param EntryId The internal UUID for this status bar item instance.
 * @param _ExtensionId The identifier of the extension that owns this item.
 * @param CommandConverter An instance of the command converter.
 * @returns The `IStatusbarEntry` DTO.
 */
export const FromAPI = (
	From: VSCodeStatusBarItem,

	EntryId: string,

	_ExtensionId: string,

	CommandConverter: CommandConverter,
): IStatusbarEntry => {

	return {
		id: EntryId,

		name: From.name,

		text: From.text,

		tooltip:
			typeof From.tooltip === "string"
				? From.tooltip
				: From.tooltip instanceof MarkdownString
					? MarkdownStringFromAPI(From.tooltip)

					: undefined,

		command: From.command
			? CommandConverter.ToInternal(From.command as Command, [])

			: undefined,

		priority: From.priority,

		alignment: From.alignment === 1 /* Left */ ? 0 : 1,

		backgroundColor:
			From.backgroundColor instanceof ThemeColor
				? From.backgroundColor.id
				: undefined,

		color:
			typeof From.color === "string"
				? From.color
				: From.color instanceof ThemeColor
					? From.color.id
					: undefined,

		accessibilityInformation: From.accessibilityInformation,
	};
};
