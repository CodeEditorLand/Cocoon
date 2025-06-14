/**
 * @module TreeView (TypeConverter)
 * @description Implements type converters for the `vscode.TreeView` and `vscode.TreeItem` APIs,
 * translating between the rich API objects and their DTOs for IPC.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import type CommandConverterDefinition from "./Command/Definition.js";
import {
	MarkdownString as MarkdownStringConverter,
	URI as URIConverter,
} from "./Main.js";

const Option = {
	FromAPI: (Option: VSCode.TreeViewOptions<any>): any => {
		return {
			showCollapseAll: !!Option.showCollapseAll,
			canSelectMany: !!Option.canSelectMany,
			hasHandleDrag: !!Option.dragAndDropController?.handleDrag,
			hasHandleDrop: !!Option.dragAndDropController?.handleDrop,
		};
	},
};

const Item = {
	FromAPI: (
		_Extension: IExtensionDescription,
		Item: VSCode.TreeItem,
		Handle: string,
		ParentHandle: string | undefined,
		CommandConverter: CommandConverterDefinition,
	): any => {
		const {
			label: Label,
			id: ID,
			iconPath: IconPath,
			resourceUri: ResourceURI,
			tooltip: Tooltip,
			collapsibleState: CollapsibleState,
			contextValue: ContextValue,
			description: Description,
			command: Command,
			accessibilityInformation: AccessibilityInformation,
		} = Item;

		let ThemeIcon: { id: string; color?: string } | undefined;
		let Icon:
			| { light: VSCode.Uri; dark: VSCode.Uri }
			| VSCode.Uri
			| undefined;

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
			handle: Handle,
			parentHandle: ParentHandle,
			label: typeof Label === "string" ? { label: Label } : Label,
			id: ID,
			description: Description,
			resourceUri: ResourceURI
				? URIConverter.FromAPI(ResourceURI)
				: undefined,
			tooltip:
				typeof Tooltip === "string"
					? Tooltip
					: Tooltip
						? MarkdownStringConverter.FromAPI(Tooltip)
						: undefined,
			command: Command
				? CommandConverter.ToInternal(Command, [])
				: undefined,
			collapsibleState:
				CollapsibleState ?? ExtHostTypes.TreeItemCollapsibleState.None,
			contextValue: ContextValue,
			themeIcon: ThemeIcon,
			icon: Icon
				? "light" in Icon && "dark" in Icon
					? {
							light: URIConverter.FromAPI(Icon.light),
							dark: URIConverter.FromAPI(Icon.dark),
						}
					: URIConverter.FromAPI(Icon as VSCode.Uri)
				: undefined,
			accessibilityInformation: AccessibilityInformation,
		};
	},

	ToAPI: (DTO: any): VSCode.TreeItem => {
		const Label = DTO.label.label;
		const Item = new ExtHostTypes.TreeItem(Label, DTO.collapsibleState);
		Item.id = DTO.id;
		Item.description = DTO.description;
		Item.resourceURI = DTO.resourceUri
			? URIConverter.ToAPI(DTO.resourceUri)
			: undefined;
		return Item;
	},
};

export default { Option, Item };
