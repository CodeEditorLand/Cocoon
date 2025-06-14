/**
 * @module Completion (TypeConverter)
 * @description Defines type converters for code completion (IntelliSense) features,
 * handling the transformation between `vscode` API types and their DTOs for IPC.
 */

import type { DisposableStore, IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import type CommandConverterDefinition from "./Command/Definition.js";
import * as MarkdownStringConverter from "./Main/MarkdownString.js";
import * as RangeConverter from "./Main/Range.js";
import * as TextEditConverter from "./Main/TextEdit.js";

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
	insertText?: string | ExtHostTypes.SnippetString;
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
	ToAPI(DTO: CompletionContextDto): VSCode.CompletionContext {
		return {
			triggerKind: DTO.triggerKind,
			triggerCharacter: DTO.triggerCharacter,
		};
	},
};

const CompletionItem = {
	FromAPI(
		Item: VSCode.CompletionItem,
		CommandsConverter: CommandConverterDefinition,
		Disposables: IDisposable[],
	): ISuggestDataDto {
		const result: ISuggestDataDto = {
			label: typeof Item.label === "string" ? Item.label : Item.label,
			kind: Item.kind,
			tags: Item.tags,
			detail: Item.detail,
			documentation: Item.documentation
				? MarkdownStringConverter.FromAPI(Item.documentation)
				: undefined,
			sortText: Item.sortText,
			filterText: Item.filterText,
			preselect: Item.preselect,
			insertText: Item.insertText,
			insertTextRules:
				Item.insertText instanceof ExtHostTypes.SnippetString
					? Languages.CompletionItemInsertTextRule.InsertAsSnippet
					: 0,
			range: Item.range
				? RangeConverter.FromAPI(Item.range as VSCode.Range)
				: undefined,
			commitCharacters: Item.commitCharacters,
			additionalTextEdits: Item.additionalTextEdits?.map(
				TextEditConverter.FromAPI,
			),
			command: Item.command
				? CommandsConverter.ToInternal(
						Item.command,
						Disposables as DisposableStore,
					)
				: undefined,
		};
		return result;
	},

	ToAPI(
		DTO: ISuggestDataDto,
		CommandsConverter: CommandConverterDefinition,
	): VSCode.CompletionItem {
		const label =
			typeof DTO.label === "string"
				? DTO.label
				: {
						label: DTO.label.label,
						detail: DTO.label.detail,
						description: DTO.label.description,
					};
		const item = new ExtHostTypes.CompletionItem(
			label,
			DTO.kind as VSCode.CompletionItemKind,
		);
		item.tags = DTO.tags as VSCode.CompletionItemTag[];
		item.detail = DTO.detail;
		item.documentation = DTO.documentation
			? MarkdownStringConverter.ToAPI(DTO.documentation as any)
			: undefined;
		item.sortText = DTO.sortText;
		item.filterText = DTO.filterText;
		item.preselect = DTO.preselect;
		item.insertText = DTO.insertText;
		item.range = DTO.range
			? RangeConverter.ToAPI(DTO.range as any)
			: undefined;
		item.commitCharacters = DTO.commitCharacters;
		item.additionalTextEdits = DTO.additionalTextEdits?.map(
			TextEditConverter.ToAPI,
		);
		item.command = DTO.command
			? CommandsConverter.FromInternal(DTO.command)
			: undefined;
		return item;
	},
};

const CompletionList = {
	FromAPI(
		List:
			| VSCode.CompletionList
			| readonly VSCode.CompletionItem[]
			| null
			| undefined,
		CommandsConverter: CommandConverterDefinition,
		Disposables: IDisposable[],
	): ISuggestResultDto | undefined {
		if (!List) {
			return undefined;
		}
		const items = Array.isArray(List) ? List : List.items;
		return {
			suggestions: items.map((item) =>
				CompletionItem.FromAPI(item, CommandsConverter, Disposables),
			),
			incomplete: !Array.isArray(List) ? List.isIncomplete : false,
		};
	},
};

export default {
	CompletionContext,
	CompletionItem,
	CompletionList,
};
