/*
 * File: Cocoon/Source/TypeConverter/TreeView.ts
 * Responsibility:
 * Modified: 2025-06-16 14:00:34 UTC
 * Dependency: ../Type/ExtHostTypes.js, ./Command/Definition.js, ./Main.js, vs/platform/extensions/common/extensions.js, vscode
 * Export: TreeView
 */

/**
 * @module TreeView (TypeConverter)
 * @description Implements type converters for the `vscode.TreeView` and `vscode.TreeItem` APIs,
 * translating between the rich API objects and their DTOs for IPC.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import * as VSCode from "vscode";
import { TreeItemCollapsibleState } from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import type CommandConverterDefinition from "./Command/Definition.js";
import {
	MarkdownString as MarkdownStringConverter,
	URI as URIConverter,
} from "./Main.js";

const Option = {
	FromAPI: (option: VSCode.TreeViewOptions<any>): any => {
		return {
			showCollapseAll: !!option.showCollapseAll,
			canSelectMany: !!option.canSelectMany,
			hasHandleDrag: !!option.dragAndDropController?.handleDrag,
			hasHandleDrop: !!option.dragAndDropController?.handleDrop,
		};
	},
};

const Item = {
	FromAPI: (
		_extension: IExtensionDescription,
		item: VSCode.TreeItem,
		handle: string,
		parentHandle: string | undefined,
		commandConverter: CommandConverterDefinition,
	): any => {
		const {
			label: Label,
			id: ID,
			iconPath: IconPath,
			resourceUri: ResourceURI,
			tooltip: Tooltip,
			collapsibleState: CollapsibleStateValue,
			contextValue: ContextValue,
			description: Description,
			command: Command,
			accessibilityInformation: AccessibilityInformation,
		} = item;

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
			handle: handle,
			parentHandle: parentHandle,
			label: typeof Label === "string" ? { label: Label } : Label,
			id: ID,
			description: Description,
			resourceUri: ResourceURI
				? URIConverter.FromAPI(ResourceURI)
				: undefined,
			tooltip:
				typeof Tooltip === "string"
					? Tooltip
					: Tooltip instanceof ExtHostTypes.MarkdownString
						? MarkdownStringConverter.FromAPI(Tooltip)
						: undefined,
			command: Command
				? commandConverter.ToInternal(Command, [])
				: undefined,
			collapsibleState:
				CollapsibleStateValue ?? TreeItemCollapsibleState.None,
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

	ToAPI: (dto: any): VSCode.TreeItem => {
		const Label = dto.label.label;
		const Item = new ExtHostTypes.TreeItem(Label, dto.collapsibleState);
		Item.id = dto.id;
		(Item as any).description = dto.description;
		Item.resourceURI = dto.resourceUri
			? URIConverter.ToAPI(dto.resourceUri)
			: undefined;
		return Item;
	},
};

export const TreeView = { Option, Item };
