/**
 * @module TreeView (TypeConverter)
 * @description Implements type converters for the `vscode.TreeView` and `vscode.TreeItem` APIs,
 * translating between the rich API objects and their DTOs for IPC.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Command as CommandConverter } from "./Command.js";
import {
	MarkdownString as MarkdownStringConverter,
	Uri as UriConverter,
} from "./Main.js";

// --- Namespace for TreeViewOption ---
export namespace Option {
	/**
	 * Converts `vscode.TreeViewOption` into a serializable DTO for the host.
	 */
	export const fromAPI = (options: VSCode.TreeViewOption<any>): any => ({
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
	export const fromAPI = (
		_Extension: IExtensionDescription,
		Item: VSCode.TreeItem,
		Handle: string,
		ParentHandle: string | undefined,
		CommandConverter: CommandConverter.Interface,
	): any /* returns a TreeItemDTO */ => {
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
				? UriConverter.fromAPI(resourceUri)
				: undefined,
			Tooltip:
				typeof tooltip === "string"
					? tooltip
					: tooltip
						? MarkdownStringConverter.fromAPI(tooltip)
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
	export const toAPI = (dto: any): VSCode.TreeItem => {
		const label = dto.Label.label;
		const item = new ExtHostTypes.TreeItem(label, dto.CollapsibleState);
		item.id = dto.Id;
		item.description = dto.Description;
		item.resourceUri = dto.ResourceUri
			? UriConverter.toAPI(dto.ResourceUri)
			: undefined;
		// ... revive other properties ...
		return item;
	};
}
