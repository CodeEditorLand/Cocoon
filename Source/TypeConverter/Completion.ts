/**
 * @module Completion (TypeConverter)
 * @description Defines type converters for code completion (IntelliSense) features,
 * handling the transformation between `vscode` API types and their DTOs for IPC.
 */

import type { IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import type CommandConverterDefinition from "./Command/Definition.js";
import {
	MarkdownString as MarkdownStringConverter,
	Range as RangeConverter,
	TextEdit as TextEditConverter,
} from "./Main.js";

// Placeholder DTOs based on usage
interface ISuggestDataDto {
	label: string | { label: string; detail?: string; description?: string };
	kind?: Languages.CompletionItemKind;
	tags?: ReadonlyArray<Languages.CompletionItemTag>;
	detail?: string;
	documentation?: string | VSCode.MarkdownString;
	sortText?: string;
	filterText?: string;
	preselect?: boolean;
	insertText?: string | VSCode.SnippetString;
	insertTextRules?: Languages.CompletionItemInsertTextRule;
	range?:
		| VSCode.Range
		| {
				insert: VSCode.Range;
				replace: VSCode.Range;
		  };
	commitCharacters?: string[];
	additionalTextEdits?: VSCode.TextEdit[];
	command?: any; // DTO for command
}

interface ISuggestResultDto {
	suggestions: ISuggestDataDto[];
	incomplete: boolean;
}

interface CompletionContextDto {
	triggerKind: VSCode.CompletionTriggerKind;
	triggerCharacter?: string;
}

const CompletionContext = {
	ToAPI: (DTO: CompletionContextDto): VSCode.CompletionContext => {
		return {
			triggerKind: DTO.triggerKind,
			triggerCharacter: DTO.triggerCharacter,
		};
	},
};

const CompletionItem = {
	FromAPI: (
		Item: VSCode.CompletionItem,
		CommandsConverter: CommandConverterDefinition,
		Disposables: IDisposable[],
	): ISuggestDataDto => {
		return {
			label: typeof Item.label === "string" ? Item.label : Item.label,
			kind: Item.kind as Languages.CompletionItemKind,
			tags: Item.tags as Languages.CompletionItemTag[],
			detail: Item.detail,
			documentation: Item.documentation
				? MarkdownStringConverter.FromAPI(
						Item.documentation as VSCode.MarkdownString,
					)
				: undefined,
			sortText: Item.sortText,
			filterText: Item.filterText,
			preselect: Item.preselect,
			insertText:
				Item.insertText instanceof ExtHostTypes.SnippetString
					? (Item.insertText as any)
					: Item.insertText,
			insertTextRules:
				Item.insertText instanceof ExtHostTypes.SnippetString
					? Languages.CompletionItemInsertTextRule.InsertAsSnippet
					: 0,
			range:
				Item.range instanceof ExtHostTypes.Range
					? RangeConverter.FromAPI(Item.range as VSCode.Range)
					: Item.range
						? {
								insert: RangeConverter.FromAPI(
									Item.range.insert,
								),
								replace: RangeConverter.FromAPI(
									Item.range.replace,
								),
							}
						: undefined,
			additionalTextEdits: Item.additionalTextEdits?.map(
				TextEditConverter.FromAPI,
			),
			command: Item.command
				? CommandsConverter.ToInternal(Item.command, Disposables)
				: undefined,
		};
	},

	ToAPI: (
		DTO: ISuggestDataDto,
		CommandsConverter: CommandConverterDefinition,
	): VSCode.CompletionItem => {
		const Label =
			typeof DTO.label === "string"
				? DTO.label
				: {
						label: DTO.label.label,
						detail: DTO.label.detail,
						description: DTO.label.description,
					};
		const Item = new ExtHostTypes.CompletionItem(
			Label,
			DTO.kind as VSCode.CompletionItemKind,
		);
		Item.tags = DTO.tags as VSCode.CompletionItemTag[];
		Item.detail = DTO.detail;
		Item.documentation =
			typeof DTO.documentation === "string"
				? DTO.documentation
				: MarkdownStringConverter.ToAPI(DTO.documentation as any);
		Item.sortText = DTO.sortText;
		Item.filterText = DTO.filterText;
		Item.preselect = DTO.preselect;
		Item.insertText = DTO.insertText;
		Item.range = DTO.range
			? "insert" in DTO.range
				? {
						insert: RangeConverter.ToAPI(DTO.range.insert as any),
						replace: RangeConverter.ToAPI(DTO.range.replace as any),
					}
				: RangeConverter.ToAPI(DTO.range as any)
			: undefined;
		Item.commitCharacters = DTO.commitCharacters;
		Item.additionalTextEdits = DTO.additionalTextEdits?.map(
			TextEditConverter.ToAPI,
		);
		Item.command = DTO.command
			? CommandsConverter.FromInternal(DTO.command)
			: undefined;
		return Item;
	},
};

const CompletionList = {
	FromAPI: (
		List:
			| VSCode.CompletionList
			| readonly VSCode.CompletionItem[]
			| null
			| undefined,
		CommandsConverter: CommandConverterDefinition,
		Disposables: IDisposable[],
	): ISuggestResultDto | undefined => {
		if (!List) {
			return undefined;
		}
		const Items = Array.isArray(List) ? List : List.items;
		return {
			suggestions: Items.map((Item) =>
				CompletionItem.FromAPI(Item, CommandsConverter, Disposables),
			),
			incomplete: "isIncomplete" in List ? !!List.isIncomplete : false,
		};
	},
};

export default {
	CompletionContext,
	CompletionItem,
	CompletionList,
};
