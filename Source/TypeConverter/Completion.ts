/**
 * @module Completion (TypeConverter)
 * @description Defines type converters for code completion (IntelliSense) features,
 * handling the transformation between `vscode` API types and their DTOs for IPC.
 */

import { DisposableStore, type IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import type * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as CommandConverter from "./Command.js";
import * as MarkdownStringConverter from "./Main/MarkdownString.js";
import * as RangeConverter from "./Main/Range.js";
import * as TextEditConverter from "./Main/TextEdit.js";

// --- Namespace for CompletionItemKind ---
export namespace CompletionItemKind {
	export function FromAPI(
		kind?: VSCode.CompletionItemKind,
	): Languages.CompletionItemKind {
		// VS Code's API enum and internal enum are very similar.
		// A direct cast is often sufficient, with a fallback for safety.
		return kind ?? Languages.CompletionItemKind.Text;
	}
	export function ToAPI(
		kind: Languages.CompletionItemKind,
	): VSCode.CompletionItemKind {
		return kind as number as VSCode.CompletionItemKind;
	}
}

// --- Namespace for CompletionItemTag ---
export namespace CompletionItemTag {
	export function FromAPI(
		tag: VSCode.CompletionItemTag,
	): Languages.CompletionItemTag {
		return tag as number as Languages.CompletionItemTag;
	}
	export function ToAPI(
		tag: Languages.CompletionItemTag,
	): VSCode.CompletionItemTag {
		return tag as number as VSCode.CompletionItemTag;
	}
}

// --- Namespace for CompletionContext ---
export namespace CompletionContext {
	export function ToAPI(
		DTO: ExtHostProtocol.CompletionContextDto,
	): VSCode.CompletionContext {
		return {
			triggerKind: DTO.triggerKind,
			triggerCharacter: DTO.triggerCharacter,
		};
	}
}

// --- Namespace for CompletionItem ---
export namespace CompletionItem {
	export function FromAPI(
		Item: VSCode.CompletionItem,
		CommandsConverter: CommandConverter.Interface,
		Disposables: IDisposable[],
	): ExtHostProtocol.ISuggestDataDto {
		return {
			label: typeof Item.label === "string" ? Item.label : Item.label,
			kind: CompletionItemKind.FromAPI(Item.kind),
			tags: Item.tags?.map(CompletionItemTag.FromAPI),
			detail: Item.detail,
			documentation: Item.documentation
				? MarkdownStringConverter.FromAPI(Item.documentation)
				: undefined,
			sortText: Item.sortText,
			filterText: Item.filterText,
			preselect: Item.preselect,
			insertText:
				typeof Item.insertText === "string"
					? Item.insertText
					: Item.insertText?.value,
			insertTextRules:
				typeof Item.insertText !== "string"
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
	}

	export function ToAPI(
		DTO: ExtHostProtocol.ISuggestDataDto,
		CommandsConverter: CommandConverter.Interface,
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
			CompletionItemKind.ToAPI(DTO.kind!),
		);
		item.tags = DTO.tags?.map(CompletionItemTag.ToAPI);
		item.detail = DTO.detail;
		item.documentation = DTO.documentation
			? MarkdownStringConverter.ToAPI(DTO.documentation)
			: undefined;
		item.sortText = DTO.sortText;
		item.filterText = DTO.filterText;
		item.preselect = DTO.preselect;

		if (
			DTO.insertTextRules &&
			DTO.insertTextRules &
				Languages.CompletionItemInsertTextRule.InsertAsSnippet
		) {
			item.insertText = new ExtHostTypes.SnippetString(
				DTO.insertText as string,
			);
		} else {
			item.insertText = DTO.insertText as string;
		}

		item.range = DTO.range ? RangeConverter.ToAPI(DTO.range) : undefined;
		item.commitCharacters = DTO.commitCharacters;
		item.additionalTextEdits = DTO.additionalTextEdits?.map(
			TextEditConverter.ToAPI,
		);
		item.command = DTO.command
			? CommandsConverter.FromInternal(DTO.command)
			: undefined;
		return item;
	}
}

// --- Namespace for CompletionList ---
export namespace CompletionList {
	export function FromAPI(
		List:
			| VSCode.CompletionList
			| readonly VSCode.CompletionItem[]
			| null
			| undefined,
		CommandsConverter: CommandConverter.Interface,
		Disposables: IDisposable[],
	): ExtHostProtocol.ISuggestResultDto | undefined {
		if (!List) {
			return undefined;
		}
		const items = Array.isArray(List) ? List : List.items;
		return {
			suggestions: items.map((item) =>
				CompletionItem.FromAPI(item, CommandsConverter, Disposables),
			),
			incomplete: !Array.isArray(List) ? List.isIncomplete : false,
			// duration is an internal property and not part of the public API
		};
	}
}
