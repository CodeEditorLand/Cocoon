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

export namespace Option {
	export function FromAPI(Option: VSCode.TreeViewOptions<any>): any {
		return {
			showCollapseAll: !!Option.showCollapseAll,
			canSelectMany: !!Option.canSelectMany,
			hasHandleDrag: !!Option.dragAndDropController?.handleDrag,
			hasHandleDrop: !!Option.dragAndDropController?.handleDrop,
		};
	}
}

export namespace Item {
	export function FromAPI(
		Extension: IExtensionDescription,
		Item: VSCode.TreeItem,
		Handle: string,
		ParentHandle: string | undefined,
		CommandConverter: CommandConverter.Interface,
	): any {
		const {
			label,
			id,
			iconPath,
			resourceURI,
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

		return {
			handle: Handle,
			parentHandle: ParentHandle,
			label: typeof label === "string" ? { label } : label,
			id: id,
			description: description,
			resourceUri: resourceURI
				? URIConverter.FromAPI(resourceURI)
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
			icon: icon
				? "light" in icon && "dark" in icon
					? {
							light: URIConverter.FromAPI(icon.light),
							dark: URIConverter.FromAPI(icon.dark),
						}
					: URIConverter.FromAPI(icon)
				: undefined,
			accessibilityInformation: accessibilityInformation,
		};
	}

	export function ToAPI(DTO: any): VSCode.TreeItem {
		const label = DTO.label.label;
		const item = new ExtHostTypes.TreeItem(label, DTO.collapsibleState);
		item.id = DTO.id;
		item.description = DTO.description;
		item.resourceURI = DTO.resourceUri
			? URIConverter.ToAPI(DTO.resourceUri)
			: undefined;
		return item;
	}
}
