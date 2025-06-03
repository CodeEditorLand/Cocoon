/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters - Completion (cocoon-type-converters-completion.ts)
 * --------------------------------------------------------------------------------------------
 * Contains converters related to code completion features.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore } from "vs/base/common/lifecycle";
import * as languages from "vs/editor/common/languages";
import * as extHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as extHostTypeConverter from "vs/workbench/api/common/extHostTypeConverters";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

// Import from the main converter file
import {
	MarkdownString,
	Position,
	Range,
	TextEdit,
	type CommandsConverter,
} from "./cocoon-type-converters-main";

function isDefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null;
}

// --- CompletionItemKind & CompletionItemTag ---
export namespace CompletionItemKind {
	export function from(
		kind?: vscode.CompletionItemKind,
	): languages.CompletionItemKind {
		return extHostTypeConverter.CompletionItemKind.from(kind);
	}
	export function to(
		kind: languages.CompletionItemKind,
	): vscode.CompletionItemKind {
		return extHostTypeConverter.CompletionItemKind.to(kind);
	}
}
export namespace CompletionItemTag {
	export function from(
		tag: vscode.CompletionItemTag,
	): languages.CompletionItemTag | undefined {
		return extHostTypeConverter.CompletionItemTag.from(tag);
	}
	export function to(
		tag: languages.CompletionItemTag,
	): vscode.CompletionItemTag | undefined {
		return extHostTypeConverter.CompletionItemTag.to(tag);
	}
}

// --- CompletionConverter (Suggest) ---
export namespace Suggest {
	export function from(
		item: vscode.CompletionItem,
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
	): extHostProtocol.ISuggestDataDto {
		const resultDto: extHostProtocol.ISuggestDataDto = Object.create(null);
		resultDto[extHostProtocol.ISuggestDataDtoField.label] =
			typeof item.label === "string" ? item.label : item.label;
		resultDto[extHostProtocol.ISuggestDataDtoField.kind] =
			CompletionItemKind.from(item.kind);
		if (item.tags)
			resultDto[extHostProtocol.ISuggestDataDtoField.kindModifier] =
				item.tags.map(CompletionItemTag.from).filter(isDefined);
		resultDto[extHostProtocol.ISuggestDataDtoField.detail] = item.detail;
		resultDto[extHostProtocol.ISuggestDataDtoField.documentation] =
			MarkdownString.fromStrict(item.documentation);
		resultDto[extHostProtocol.ISuggestDataDtoField.sortText] =
			item.sortText;
		resultDto[extHostProtocol.ISuggestDataDtoField.filterText] =
			item.filterText;
		resultDto[extHostProtocol.ISuggestDataDtoField.preselect] =
			item.preselect;
		let insertTextRules = languages.CompletionItemInsertTextRule.None;
		if (item.insertText) {
			if (typeof item.insertText === "string")
				resultDto[extHostProtocol.ISuggestDataDtoField.insertText] =
					item.insertText;
			else {
				resultDto[extHostProtocol.ISuggestDataDtoField.insertText] =
					item.insertText.value;
				insertTextRules |=
					languages.CompletionItemInsertTextRule.InsertAsSnippet;
			}
		}
		if (item.keepWhitespace)
			insertTextRules |=
				languages.CompletionItemInsertTextRule.KeepWhitespace;
		resultDto[extHostProtocol.ISuggestDataDtoField.insertTextRules] =
			insertTextRules;
		if (item.range) {
			const range = item.range;
			if (extHostTypes.Range.isRange(range))
				resultDto[extHostProtocol.ISuggestDataDtoField.range] =
					Range.from(range);
			else
				resultDto[extHostProtocol.ISuggestDataDtoField.range] = {
					insert: Range.from(range.inserting)!,
					replace: Range.from(range.replacing)!,
				};
		}
		if (item.commitCharacters)
			resultDto[extHostProtocol.ISuggestDataDtoField.commitCharacters] =
				item.commitCharacters.join("");
		if (item.additionalTextEdits)
			resultDto[
				extHostProtocol.ISuggestDataDtoField.additionalTextEdits
			] = item.additionalTextEdits.map(TextEdit.from);
		if (item.command) {
			const commandDto = commandsConverter.toInternal(
				item.command,
				disposables,
			);
			if (commandDto) {
				resultDto[extHostProtocol.ISuggestDataDtoField.commandId] =
					commandDto.id;
				resultDto[
					extHostProtocol.ISuggestDataDtoField.commandArguments
				] = commandDto.arguments;
				resultDto[extHostProtocol.ISuggestDataDtoField.commandIdent] =
					commandDto.$ident;
			}
		}
		return resultDto;
	}
	export function to(
		suggestion: extHostProtocol.ISuggestDataDto,
		commandsConverter: CommandsConverter,
	): vscode.CompletionItem {
		const labelArg = suggestion[extHostProtocol.ISuggestDataDtoField.label];
		const result = new extHostTypes.CompletionItem(
			typeof labelArg === "string"
				? labelArg
				: (labelArg as languages.CompletionItemLabel).label,
			CompletionItemKind.to(
				suggestion[extHostProtocol.ISuggestDataDtoField.kind]!,
			),
		);
		if (typeof labelArg !== "string") {
			result.label = labelArg as vscode.CompletionItemLabel;
		}
		result.tags = suggestion[
			extHostProtocol.ISuggestDataDtoField.kindModifier
		]
			?.map(CompletionItemTag.to)
			.filter(isDefined);
		result.detail = suggestion[extHostProtocol.ISuggestDataDtoField.detail];
		const docDto =
			suggestion[extHostProtocol.ISuggestDataDtoField.documentation];
		result.documentation =
			typeof docDto === "string"
				? docDto
				: docDto
					? MarkdownString.to(docDto)
					: undefined;
		result.sortText =
			suggestion[extHostProtocol.ISuggestDataDtoField.sortText];
		result.filterText =
			suggestion[extHostProtocol.ISuggestDataDtoField.filterText];
		result.preselect =
			suggestion[extHostProtocol.ISuggestDataDtoField.preselect];
		const insertTextVal =
			suggestion[extHostProtocol.ISuggestDataDtoField.insertText];
		if (insertTextVal) {
			if (
				(suggestion[
					extHostProtocol.ISuggestDataDtoField.insertTextRules
				] || 0) & languages.CompletionItemInsertTextRule.InsertAsSnippet
			)
				result.insertText = new extHostTypes.SnippetString(
					insertTextVal,
				);
			else result.insertText = insertTextVal;
		}
		result.keepWhitespace = !!(
			(suggestion[extHostProtocol.ISuggestDataDtoField.insertTextRules] ||
				0) & languages.CompletionItemInsertTextRule.KeepWhitespace
		);
		const rangeDto = suggestion[extHostProtocol.ISuggestDataDtoField.range];
		if (rangeDto) {
			if ("insert" in rangeDto && "replace" in rangeDto)
				result.range = {
					inserting: Range.to(rangeDto.insert)!,
					replacing: Range.to(rangeDto.replace)!,
				};
			else result.range = Range.to(rangeDto as extHostProtocol.IRange);
		}
		result.commitCharacters =
			suggestion[
				extHostProtocol.ISuggestDataDtoField.commitCharacters
			]?.split("");
		result.additionalTextEdits = suggestion[
			extHostProtocol.ISuggestDataDtoField.additionalTextEdits
		]?.map((te) => TextEdit.to(te as languages.TextEdit));
		if (
			suggestion[extHostProtocol.ISuggestDataDtoField.commandId] ||
			suggestion[extHostProtocol.ISuggestDataDtoField.commandIdent]
		) {
			result.command = commandsConverter.fromInternal({
				id: suggestion[extHostProtocol.ISuggestDataDtoField.commandId]!,
				title: "",
				arguments:
					suggestion[
						extHostProtocol.ISuggestDataDtoField.commandArguments
					],
				$ident: suggestion[
					extHostProtocol.ISuggestDataDtoField.commandIdent
				],
				tooltip: undefined,
			} as extHostProtocol.ICommandDto);
		}
		return result;
	}
	export function fromList(
		list:
			| vscode.CompletionList
			| readonly vscode.CompletionItem[]
			| null
			| undefined,
		pid: number,
		defaultRanges: { replace: vscode.Range; insert: vscode.Range },
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
	): extHostProtocol.ISuggestResultDto | undefined {
		if (!list) return undefined;
		const suggestionsFromApi = Array.isArray(list) ? list : list.items;
		const suggestionsDto: extHostProtocol.ISuggestDataDto[] = [];
		for (let i = 0; i < suggestionsFromApi.length; i++) {
			const item = suggestionsFromApi[i];
			if (!item) continue;
			const dto = Suggest.from(item, commandsConverter, disposables);
			dto.x = [pid, i];
			suggestionsDto.push(dto);
		}
		return {
			x: pid,
			[extHostProtocol.ISuggestResultDtoField.completions]:
				suggestionsDto,
			[extHostProtocol.ISuggestResultDtoField.isIncomplete]:
				Array.isArray(list) ? undefined : list.isIncomplete,
			[extHostProtocol.ISuggestResultDtoField.defaultRanges]: {
				replace: Range.from(defaultRanges.replace)!,
				insert: Range.from(defaultRanges.insert)!,
			},
		};
	}
}

// --- CompletionContext ---
export namespace CompletionContext {
	export function toApiType(
		dto: extHostProtocol.ExtHostCompletionContextDto,
	): vscode.CompletionContext {
		return {
			triggerKind:
				dto.triggerKind as number as vscode.CompletionTriggerKind,
			triggerCharacter: dto.triggerCharacter,
		};
	}
}
