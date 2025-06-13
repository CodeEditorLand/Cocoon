/**
 * @module Completion (TypeConverter)
 * @description Defines type converters for code completion (IntelliSense) features,
 * handling the transformation between `vscode` API types and their DTOs for IPC.
 */

import { DisposableStore, type IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as VSCode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Command as CommandConverter } from "./Command.js";
import {
	MarkdownString as MarkdownStringConverter,
	Range as RangeConverter,
	TextEdit as TextEditConverter,
} from "./Main.js";

// --- Namespace for CompletionItemKind ---
export namespace CompletionItemKind {
	export const fromAPI = (
		kind?: VSCode.CompletionItemKind,
	): Languages.CompletionItemKind => {
		// VS Code's API uses a 0-based enum, while the internal one is 1-based, but they map closely.
		// A direct cast is often sufficient, with a fallback.
		return kind ?? Languages.CompletionItemKind.Text;
	};
	export const toAPI = (
		kind: Languages.CompletionItemKind,
	): VSCode.CompletionItemKind => {
		return kind as number as VSCode.CompletionItemKind;
	};
}

// --- Namespace for CompletionItemTag ---
export namespace CompletionItemTag {
	export const fromAPI = (
		tag: VSCode.CompletionItemTag,
	): Languages.CompletionItemTag =>
		tag as number as Languages.CompletionItemTag;
	export const toAPI = (
		tag: Languages.CompletionItemTag,
	): VSCode.CompletionItemTag => tag as number as VSCode.CompletionItemTag;
}

// --- Namespace for CompletionContext ---
export namespace CompletionContext {
	export const toAPI = (
		dto: ExtHostProtocol.CompletionContextDTO,
	): VSCode.CompletionContext => ({
		triggerKind: dto.triggerKind,
		triggerCharacter: dto.triggerCharacter,
	});
}

// --- Namespace for CompletionItem ---
export namespace CompletionItem {
	export const fromAPI = (
		item: VSCode.CompletionItem,
		commandsConverter: CommandConverter.Interface,
		disposables: IDisposable[],
	): ExtHostProtocol.ISuggestDataDTO => {
		return {
			label: typeof item.label === "string" ? item.label : item.label,
			kind: CompletionItemKind.fromAPI(item.kind),
			tags: item.tags?.map(CompletionItemTag.fromAPI),
			detail: item.detail,
			documentation: item.documentation
				? MarkdownStringConverter.fromAPI(item.documentation)
				: undefined,
			sortText: item.sortText,
			filterText: item.filterText,
			preselect: item.preselect,
			insertText:
				typeof item.insertText === "string"
					? item.insertText
					: item.insertText?.value,
			insertTextRules:
				typeof item.insertText !== "string"
					? Languages.CompletionItemInsertTextRule.InsertAsSnippet
					: 0,
			range: item.range
				? RangeConverter.fromAPI(item.range as VSCode.Range)
				: undefined,
			commitCharacters: item.commitCharacters,
			additionalTextEdits: item.additionalTextEdits?.map(
				TextEditConverter.fromAPI,
			),
			command: item.command
				? commandsConverter.ToInternal(
						item.command,
						disposables as DisposableStore,
					)
				: undefined,
		};
	};

	export const toAPI = (
		dto: ExtHostProtocol.ISuggestDataDTO,
		commandsConverter: CommandConverter.Interface,
	): VSCode.CompletionItem => {
		const label =
			typeof dto.label === "string"
				? dto.label
				: {
						label: dto.label.label,
						detail: dto.label.detail,
						description: dto.label.description,
					};
		const item = new ExtHostTypes.CompletionItem(
			label,
			CompletionItemKind.toAPI(dto.kind!),
		);
		item.tags = dto.tags?.map(CompletionItemTag.toAPI);
		item.detail = dto.detail;
		item.documentation = dto.documentation
			? MarkdownStringConverter.toAPI(dto.documentation)
			: undefined;
		item.sortText = dto.sortText;
		item.filterText = dto.filterText;
		item.preselect = dto.preselect;

		if (
			dto.insertTextRules &&
			dto.insertTextRules &
				Languages.CompletionItemInsertTextRule.InsertAsSnippet
		) {
			item.insertText = new ExtHostTypes.SnippetString(
				dto.insertText as string,
			);
		} else {
			item.insertText = dto.insertText as string;
		}

		item.range = dto.range ? RangeConverter.toAPI(dto.range) : undefined;
		item.commitCharacters = dto.commitCharacters;
		item.additionalTextEdits = dto.additionalTextEdits?.map(
			TextEditConverter.toAPI,
		);
		item.command = dto.command
			? commandsConverter.FromInternal(dto.command)
			: undefined;
		return item;
	};
}

// --- Namespace for CompletionList ---
export namespace CompletionList {
	export const fromAPI = (
		list:
			| VSCode.CompletionList
			| readonly VSCode.CompletionItem[]
			| null
			| undefined,
		commandsConverter: CommandConverter.Interface,
		disposables: IDisposable[],
	): ExtHostProtocol.ISuggestResultDTO | undefined => {
		if (!list) return undefined;
		const items = Array.isArray(list) ? list : list.items;
		return {
			suggestions: items.map((item) =>
				CompletionItem.fromAPI(item, commandsConverter, disposables),
			),
			incomplete: !Array.isArray(list) ? list.isIncomplete : false,
			// duration is not part of the public API
		};
	};
}
