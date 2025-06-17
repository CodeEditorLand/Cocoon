/*
 * File: Cocoon/Source/TypeConverter/StatusBar.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:04 UTC
 * Dependency: ../Type/ExtHostTypes.js, ./Command/Definition.js, ./Main/MarkdownString.js, vscode
 */

/**
 * @module StatusBar (TypeConverter)
 * @description Type converters for the `vscode.StatusBarItem` API.
 */

import type { Command, StatusBarItem as VscStatusBarItem } from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import type CommandConverterDefinition from "./Command/Definition.js";
import MarkdownStringConverter from "./Main/MarkdownString.js";

// Placeholder DTO
interface IStatusbarEntry {
	id: string;
	name: string | undefined;
	text: string;
	tooltip: string | any | undefined;
	command: any | undefined;
	priority: number | undefined;
	alignment: number;
	backgroundColor: string | undefined;
	color: string | undefined;
	accessibilityInformation: any | undefined;
}

const FromAPI = (
	From: VscStatusBarItem,
	EntryID: string,
	CommandConverter: CommandConverterDefinition,
): IStatusbarEntry => {
	return {
		id: EntryID,
		name: From.name,
		text: From.text,
		tooltip:
			typeof From.tooltip === "string"
				? From.tooltip
				: From.tooltip instanceof ExtHostTypes.MarkdownString
					? MarkdownStringConverter.FromAPI(From.tooltip)
					: undefined,
		command: From.command
			? CommandConverter.ToInternal(From.command as Command, [])
			: undefined,
		priority: From.priority,
		alignment:
			From.alignment === ExtHostTypes.StatusBarAlignment.Left ? 0 : 1,
		backgroundColor:
			From.backgroundColor instanceof ExtHostTypes.ThemeColor
				? From.backgroundColor.id
				: undefined,
		color:
			typeof From.color === "string"
				? From.color
				: From.color instanceof ExtHostTypes.ThemeColor
					? From.color.id
					: undefined,
		accessibilityInformation: From.accessibilityInformation,
	};
};

export default { FromAPI };
