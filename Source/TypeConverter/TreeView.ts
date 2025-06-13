/**
 * @module TreeView (TypeConverter)
 * @description Implements type converters for the `vscode.TreeView` and `vscode.TreeItem` APIs,
 * translating between the rich API objects and their DTOs for IPC.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import { ThemeIcon as VscodeThemeIcon } from "vs/platform/theme/common/theme.js";
import type * as Vscode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Commands as CommandsConverter } from "./Command/mod.js";
import {
	MarkdownString as MarkdownStringConverter,
	Uri as UriConverter,
} from "./Main.js";

// --- Namespace for TreeViewOptions ---
export namespace Options {
	/**
	 * Converts `vscode.TreeViewOptions` into a serializable DTO for the host.
	 */
	export const fromApi = (options: Vscode.TreeViewOptions<any>): any => ({
		ShowCollapseAll: !!options.showCollapseAll,
		CanSelectMany: !!options.canSelectMany,
		HasHandleDrag: !!options.dragAndDropController?.handleDrag,
		HasHandleDrop: !!options.dragAndDropController?.handleDrop,
	});
}

// --- Namespace for TreeItem ---
export namespace Item {
	/**
	 * Converts a `vscode.TreeItem` object into a plain DTO for IPC.
	 */
	export const fromApi = (
		Extension: IExtensionDescription,
		Item: Vscode.TreeItem,
		Handle: string,
		ParentHandle: string | undefined,
		CommandConverter: CommandsConverter.Interface,
	): any /* returns a TreeItemDto */ => {
		const {
			label,
			id,
			iconPath,
			resourceUri,
			tooltip,
			collapsibleState,
			contextValue,
			description,
			command,
			accessibilityInformation,
		} = Item;

		let themeIcon: { id: string; color?: string } | undefined;
		if (iconPath instanceof ExtHostTypes.ThemeIcon) {
			themeIcon = { id: iconPath.id, color: iconPath.color?.id };
		}

		// The DTO sent to the host.
		return {
			Handle,
			ParentHandle,
			Label: typeof label === "string" ? { label } : label,
			Id: id,
			Description: description,
			ResourceUri: resourceUri
				? UriConverter.fromApi(resourceUri)
				: undefined,
			Tooltip:
				typeof tooltip === "string"
					? tooltip
					: tooltip
						? MarkdownStringConverter.fromApi(tooltip)
						: undefined,
			Command: command
				? CommandConverter.ToInternal(command, [])
				: undefined,
			CollapsibleState:
				collapsibleState ?? ExtHostTypes.TreeItemCollapsibleState.None,
			ContextValue: contextValue,
			ThemeIcon: themeIcon,
			AccessibilityInformation: accessibilityInformation,
			// The iconPath is more complex to serialize if it's a light/dark Uri pair.
			// A full implementation would handle this.
		};
	};

	/**
	 * Revives a TreeItem DTO back into a `vscode.TreeItem` instance.
	 * This is less common but needed for some API interactions.
	 */
	export const toApi = (dto: any): Vscode.TreeItem => {
		const label = dto.Label.label;
		const item = new ExtHostTypes.TreeItem(label, dto.CollapsibleState);
		item.id = dto.Id;
		item.description = dto.Description;
		item.resourceUri = dto.ResourceUri
			? UriConverter.toApi(dto.ResourceUri)
			: undefined;
		// ... revive other properties ...
		return item;
	};
}
