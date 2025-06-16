/*
 * File: Cocoon/Source/TypeConverter/Completion.ts
 * Responsibility:
 * Modified: 2025-06-15 23:33:56 UTC
 * Dependency: ../Type/ExtHostTypes.js, ./Command/Definition.js, vs/base/common/htmlContent.js, vs/base/common/lifecycle.js, vs/editor/common/core/range.js, vs/editor/common/languages.js, vs/editor/common/model.js, vscode
 */

/**
 * @module Completion (TypeConverter)
 * @description Defines type converters for code completion (IntelliSense) features,
 * handling the transformation between `vscode` API types and their DTOs for IPC.
 */

import type { IMarkdownString } from "vs/base/common/htmlContent.js";
import type { IDisposable } from "vs/base/common/lifecycle.js";
import type { IRange } from "vs/editor/common/core/range.js";
import * as Languages from "vs/editor/common/languages.js";
import type { IIdentifiedSingleEditOperation } from "vs/editor/common/model.js";
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
	label: string | VSCode.CompletionItemLabel;
	kind?: VSCode.CompletionItemKind;
	tags?: ReadonlyArray<VSCode.CompletionItemTag>;
	detail?: string;
	documentation?: string | IMarkdownString;
	sortText?: string;
	filterText?: string;
	preselect?: boolean;
	insertText?: string | VSCode.SnippetString;
	insertTextRules?: Languages.CompletionItemInsertTextRule;
	range?:
		| IRange
		| {
				insert: IRange;
				replace: IRange;
		  };
	commitCharacters?: string[];
	additionalTextEdits?: IIdentifiedSingleEditOperation[];
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
			label: Item.label,
			kind: Item.kind,
			tags: Item.tags,
			detail: Item.detail,
			documentation:
				typeof Item.documentation === "string"
					? Item.documentation
					: Item.documentation instanceof ExtHostTypes.MarkdownString
						? MarkdownStringConverter.FromAPI(Item.documentation)
						: undefined,
			sortText: Item.sortText,
			filterText: Item.filterText,
			preselect: Item.preselect,
			insertText:
				Item.insertText instanceof ExtHostTypes.SnippetString
					? Item.insertText.value
					: Item.insertText,
			insertTextRules:
				Item.insertText instanceof ExtHostTypes.SnippetString
					? Languages.CompletionItemInsertTextRule.InsertAsSnippet
					: 0,
			range:
				Item.range instanceof ExtHostTypes.Range
					? RangeConverter.FromAPI(Item.range)
					: Item.range
						? {
								insert: RangeConverter.FromAPI(
									(
										Item.range as {
											inserting: VSCode.Range;
											replacing: VSCode.Range;
										}
									).inserting,
								),
								replace: RangeConverter.FromAPI(
									(
										Item.range as {
											inserting: VSCode.Range;
											replacing: VSCode.Range;
										}
									).replacing,
								),
							}
						: undefined,
			commitCharacters: Item.commitCharacters,
			additionalTextEdits: Item.additionalTextEdits?.map((edit) =>
				TextEditConverter.FromAPI(edit),
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
		const Label = DTO.label;
		const Item = new ExtHostTypes.CompletionItem(
			Label,
			DTO.kind as unknown as VSCode.CompletionItemKind,
		);
		Item.tags = DTO.tags;
		Item.detail = DTO.detail;
		Item.documentation =
			typeof DTO.documentation === "string"
				? DTO.documentation
				: DTO.documentation
					? MarkdownStringConverter.ToAPI(DTO.documentation)
					: undefined;
		Item.sortText = DTO.sortText;
		Item.filterText = DTO.filterText;
		Item.preselect = DTO.preselect;
		Item.insertText = DTO.insertText;
		Item.range = DTO.range
			? "insert" in DTO.range
				? {
						inserting: RangeConverter.ToAPI(DTO.range.insert),
						replacing: RangeConverter.ToAPI(DTO.range.replace),
					}
				: RangeConverter.ToAPI(DTO.range)
			: undefined;
		Item.commitCharacters = DTO.commitCharacters;
		Item.additionalTextEdits = DTO.additionalTextEdits?.map((dto) =>
			TextEditConverter.ToAPI(dto),
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
		const Items = "items" in List ? List.items : List;
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
