/**
 * @module Item
 * @description Implements the type converter for `vscode.TreeItem`.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import * as ExtHostTypes from "../../Platform/VSCode/Type.js";
import type { Command } from "../Command.js";
import { FromAPI as MarkdownStringFromAPI } from "../Main/MarkdownString.js";
import { FromAPI as UriFromAPI, ToAPI as UriToAPI } from "../Main/URI.js";

/**
 * @description Converts a `vscode.TreeItem` object into a plain DTO for IPC.
 * @param _extension The description of the extension owning the item.
 * @param item The `vscode.TreeItem` instance to convert.
 * @param handle A unique handle for this item instance.
 * @param parentHandle The handle of the parent item, if any.
 * @param commandConverter An instance of the command converter.
 * @returns The serializable DTO.
 */
export const FromAPI = (
	_extension: IExtensionDescription,
	item: VSCode.TreeItem,
	handle: string,
	parentHandle: string | undefined,
	commandConverter: Command,
): any => {
	const {
		label: Label,
		id: Id,
		iconPath: IconPath,
		resourceUri: ResourceUri,
		tooltip: Tooltip,
		collapsibleState: CollapsibleStateValue,
		contextValue: ContextValue,
		description: Description,
		command: Command,
		accessibilityInformation: AccessibilityInformation,
	} = item;

	let ThemeIcon: { id: string; color?: string } | undefined;
	let Icon: { light: VSCode.Uri; dark: VSCode.Uri } | VSCode.Uri | undefined;

	if (IconPath instanceof ExtHostTypes.ThemeIcon) {
		ThemeIcon = {
			id: IconPath.id,
			color: (IconPath.color as any)?.id,
		};
	} else {
		Icon = IconPath as
			| VSCode.Uri
			| { light: VSCode.Uri; dark: VSCode.Uri }
			| undefined;
	}

	return {
		handle: handle,
		parentHandle: parentHandle,
		label: typeof Label === "string" ? { label: Label } : Label,
		id: Id,
		description: Description,
		resourceUri: ResourceUri ? UriFromAPI(ResourceUri) : undefined,
		tooltip:
			typeof Tooltip === "string"
				? Tooltip
				: Tooltip instanceof ExtHostTypes.MarkdownString
					? MarkdownStringFromAPI(Tooltip)
					: undefined,
		command: Command ? commandConverter.ToInternal(Command, []) : undefined,
		collapsibleState:
			CollapsibleStateValue ?? TreeItemCollapsibleState.None,
		contextValue: ContextValue,
		themeIcon: ThemeIcon,
		icon: Icon
			? "light" in Icon && "dark" in Icon
				? {
						light: UriFromAPI(Icon.light),
						dark: UriFromAPI(Icon.dark),
					}
				: UriFromAPI(Icon as VSCode.Uri)
			: undefined,
		accessibilityInformation: AccessibilityInformation,
	};
};

/**
 * @description Revives a tree item DTO back into a `vscode.TreeItem` instance.
 * @param dto The raw DTO from IPC.
 * @returns A new `vscode.TreeItem` instance.
 */
export const ToAPI = (dto: any): VSCode.TreeItem => {
	const Label = dto.label.label;
	const Item = new ExtHostTypes.TreeItem(Label, dto.collapsibleState);
	Item.id = dto.id;
	(Item as any).description = dto.description;
	// FIX: Conditionally assign resourceUri only if it exists in the DTO.
	if (dto.resourceUri) {
		Item.resourceUri = UriToAPI(dto.resourceUri);
	}
	return Item;
};
