/**
 * @module TreeView (TypeConverter)
 * @description Implements type converters for the `vscode.TreeView` and `vscode.TreeItem` APIs,
 * translating between the rich API objects and their DTOs for IPC.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as CommandConverter from "./Command.js";
import * as MarkdownStringConverter from "./Main/MarkdownString.js";
import * as URIConverter from "./Main/URI.js";

// --- Namespace for TreeViewOption ---
export namespace Option {
	/**
	 * Converts `vscode.TreeViewOption` into a serializable DTO for the host.
	 * @param Option The `vscode.TreeViewOption` from the extension.
	 * @returns A serializable DTO for the host.
	 */
	export function FromAPI(Option: VSCode.TreeViewOption<any>): any {
		return {
			showCollapseAll: !!Option.showCollapseAll,
			canSelectMany: !!Option.canSelectMany,
			hasHandleDrag: !!Option.dragAndDropController?.handleDrag,
			hasHandleDrop: !!Option.dragAndDropController?.handleDrop,
		};
	}
}

// --- Namespace for TreeItem ---
export namespace Item {
	/**
	 * Converts a `vscode.TreeItem` object into a plain DTO for IPC.
	 * @param Extension The extension that owns this tree item.
	 * @param Item The `vscode.TreeItem` instance.
	 * @param Handle A unique handle for this item instance in the host.
	 * @param ParentHandle The handle of the parent item, if any.
	 * @param CommandConverter The command converter service.
	 * @returns A serializable TreeItem DTO.
	 */
	export function FromAPI(
		Extension: IExtensionDescription,
		Item: VSCode.TreeItem,
		Handle: string,
		ParentHandle: string | undefined,
		CommandConverter: CommandConverter.Interface,
	): any /* returns a TreeItemDTO */ {
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
		let icon:
			| { light: VSCode.Uri; dark: VSCode.Uri }
			| VSCode.Uri
			| undefined;

		if (iconPath instanceof ExtHostTypes.ThemeIcon) {
			themeIcon = { id: iconPath.id, color: iconPath.color?.id };
		} else {
			icon = iconPath;
		}

		// The DTO sent to the host.
		return {
			handle: Handle,
			parentHandle: ParentHandle,
			label: typeof label === "string" ? { label } : label,
			id: id,
			description: description,
			resourceUri: resourceUri
				? URIConverter.FromAPI(resourceUri)
				: undefined,
			tooltip:
				typeof tooltip === "string"
					? tooltip
					: tooltip
						? MarkdownStringConverter.FromAPI(tooltip)
						: undefined,
			command: command
				? CommandConverter.ToInternal(command, [])
				: undefined,
			collapsibleState:
				collapsibleState ?? ExtHostTypes.TreeItemCollapsibleState.None,
			contextValue: contextValue,
			themeIcon: themeIcon,
			icon: icon ? URIConverter.FromAPI(icon as any) : undefined,
			accessibilityInformation: accessibilityInformation,
		};
	}

	/**
	 * Revives a TreeItem DTO back into a `vscode.TreeItem` instance.
	 * This is less common but needed for some API interactions.
	 * @param DTO The TreeItem DTO from the host.
	 * @returns A `vscode.TreeItem` instance.
	 */
	export function ToAPI(DTO: any): VSCode.TreeItem {
		const label = DTO.label.label;
		const item = new ExtHostTypes.TreeItem(label, DTO.collapsibleState);
		item.id = DTO.id;
		item.description = DTO.description;
		item.resourceUri = DTO.resourceUri
			? URIConverter.ToAPI(DTO.resourceUri)
			: undefined;
		// ... revive other properties as needed ...
		return item;
	}
}
