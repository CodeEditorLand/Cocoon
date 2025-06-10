/**
 * @module Completion (TypeConverter)
 * @description Defines type converters for code completion (IntelliSense) features,
 * handling the transformation between `vscode` API types and their DTOs for IPC.
 */

import { DisposableStore, type IDisposable } from "vs/base/common/lifecycle.js";
import * as Languages from "vs/editor/common/languages.js";
import * as ExtHostProtocol from "vs/workbench/api/common/extHost.protocol.js";
import type * as Vscode from "vscode";

import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import { Commands as CommandsConverter } from "./Commands/mod.js";
import {
	MarkdownString as MarkdownStringConverter,
	Range as RangeConverter,
	TextEdit as TextEditConverter,
} from "./Main.js";

// --- Namespace for CompletionItemKind ---
export namespace CompletionItemKind {
	export const fromApi = (
		kind?: Vscode.CompletionItemKind,
	): Languages.CompletionItemKind => {
		// VS Code's API uses a 0-based enum, while the internal one is 1-based, but they map closely.
		// A direct cast is often sufficient, with a fallback.
		return kind ?? Languages.CompletionItemKind.Text;
	};
	export const toApi = (
		kind: Languages.CompletionItemKind,
	): Vscode.CompletionItemKind => {
		return kind as number as Vscode.CompletionItemKind;
	};
}

// --- Namespace for CompletionItemTag ---
export namespace CompletionItemTag {
	export const fromApi = (
		tag: Vscode.CompletionItemTag,
	): Languages.CompletionItemTag =>
		tag as number as Languages.CompletionItemTag;
	export const toApi = (
		tag: Languages.CompletionItemTag,
	): Vscode.CompletionItemTag => tag as number as Vscode.CompletionItemTag;
}

// --- Namespace for CompletionContext ---
export namespace CompletionContext {
	export const toApi = (
		dto: ExtHostProtocol.CompletionContextDto,
	): Vscode.CompletionContext => ({
		triggerKind: dto.triggerKind,
		triggerCharacter: dto.triggerCharacter,
	});
}

// --- Namespace for CompletionItem ---
export namespace CompletionItem {
	export const fromApi = (
		item: Vscode.CompletionItem,
		commandsConverter: CommandsConverter.Interface,
		disposables: IDisposable[],
	): ExtHostProtocol.ISuggestDataDto => {
		return {
			label: typeof item.label === "string" ? item.label : item.label,
			kind: CompletionItemKind.fromApi(item.kind),
			tags: item.tags?.map(CompletionItemTag.fromApi),
			detail: item.detail,
			documentation: item.documentation
				? MarkdownStringConverter.fromApi(item.documentation)
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
				? RangeConverter.fromApi(item.range as Vscode.Range)
				: undefined,
			commitCharacters: item.commitCharacters,
			additionalTextEdits: item.additionalTextEdits?.map(
				TextEditConverter.fromApi,
			),
			command: item.command
				? commandsConverter.ToInternal(
						item.command,
						disposables as DisposableStore,
					)
				: undefined,
		};
	};

	export const toApi = (
		dto: ExtHostProtocol.ISuggestDataDto,
		commandsConverter: CommandsConverter.Interface,
	): Vscode.CompletionItem => {
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
			CompletionItemKind.toApi(dto.kind!),
		);
		item.tags = dto.tags?.map(CompletionItemTag.toApi);
		item.detail = dto.detail;
		item.documentation = dto.documentation
			? MarkdownStringConverter.toApi(dto.documentation)
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

		item.range = dto.range ? RangeConverter.toApi(dto.range) : undefined;
		item.commitCharacters = dto.commitCharacters;
		item.additionalTextEdits = dto.additionalTextEdits?.map(
			TextEditConverter.toApi,
		);
		item.command = dto.command
			? commandsConverter.FromInternal(dto.command)
			: undefined;
		return item;
	};
}

// --- Namespace for CompletionList ---
export namespace CompletionList {
	export const fromApi = (
		list:
			| Vscode.CompletionList
			| readonly Vscode.CompletionItem[]
			| null
			| undefined,
		commandsConverter: CommandsConverter.Interface,
		disposables: IDisposable[],
	): ExtHostProtocol.ISuggestResultDto | undefined => {
		if (!list) return undefined;
		const items = Array.isArray(list) ? list : list.items;
		return {
			suggestions: items.map((item) =>
				CompletionItem.fromApi(item, commandsConverter, disposables),
			),
			incomplete: !Array.isArray(list) ? list.isIncomplete : false,
			// duration is not part of the public API
		};
	};
}
