/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters - Language Features (cocoon-type-converters-languagefeatures.ts)
 * --------------------------------------------------------------------------------------------
 * Contains converters for various language features like CodeLens, Diagnostics,
 * Formatting, Symbols, Hierarchies, SignatureHelp, InlayHints, etc.
 *--------------------------------------------------------------------------------------------*/

import { asArray, coalesce, isNonEmptyArray } from "vs/base/common/arrays";
import { DisposableStore } from "vs/base/common/lifecycle";
import { URI, type UriComponents } from "vs/base/common/uri";
import { IURITransformer } from "vs/base/common/uriIpc";
import * as languages from "vs/editor/common/languages";
import * as extHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as extHostTypeConverter from "vs/workbench/api/common/extHostTypeConverters"; // For some enums
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

// Import from other converter files
import {
	DefinitionLink,
	EndOfLine,
	Hover,
	Location,
	MarkdownString,
	Position,
	Range,
	TextEdit,
	type CommandsConverter,
} from "./cocoon-type-converters-main";

function isDefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null;
}

// --- CodeLens ---
export namespace CodeLens {
	export function from(
		lens: vscode.CodeLens,
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
	): extHostProtocol.ICodeLensDto {
		return {
			range: Range.from(lens.range)!,
			command: lens.command
				? commandsConverter.toInternal(lens.command, disposables)
				: undefined,
		};
	}
	export function to(
		dto: extHostProtocol.ICodeLensDto,
		commandsConverter: CommandsConverter,
	): vscode.CodeLens {
		const range = Range.to(dto.range)!;
		const command = commandsConverter.fromInternal(dto.command);
		return command
			? new extHostTypes.CodeLens(range, command)
			: new extHostTypes.CodeLens(range);
	}
	export function fromList(
		list: vscode.CodeLens[] | undefined | null,
		cacheId: number,
		commandsConverter: CommandsConverter,
		listDisposables: DisposableStore,
	): extHostProtocol.ICodeLensListDto | undefined {
		if (!list || list.length === 0) return undefined;
		const lensesDto: extHostProtocol.ICodeLensDto[] = [];
		for (let i = 0; i < list.length; i++) {
			const lens = list[i];
			if (!lens) continue;
			const dto = from(lens, commandsConverter, listDisposables);
			dto.cacheId = [cacheId, i];
			lensesDto.push(dto);
		}
		return { cacheId, lenses: lensesDto };
	}
}

// --- FormattingOptions ---
export namespace FormattingOptions {
	export function from(
		options: vscode.FormattingOptions,
	): languages.FormattingOptions {
		return {
			tabSize: options.tabSize,
			insertSpaces: options.insertSpaces,
			...Object.keys(options)
				.filter((key) => key !== "tabSize" && key !== "insertSpaces")
				.reduce((obj, key) => {
					(obj as any)[key] = (options as any)[key];
					return obj;
				}, {} as any),
		};
	}
	export function to(
		options: languages.FormattingOptions,
	): vscode.FormattingOptions {
		const result: vscode.FormattingOptions = {
			tabSize: options.tabSize,
			insertSpaces: options.insertSpaces,
		};
		for (const key in options) {
			if (key !== "tabSize" && key !== "insertSpaces")
				(result as any)[key] = options[key];
		}
		return result;
	}
}

// --- DocumentHighlightKind & DocumentHighlight ---
export namespace DocumentHighlightKind {
	export function from(
		kind: vscode.DocumentHighlightKind,
	): languages.DocumentHighlightKind {
		return extHostTypeConverter.DocumentHighlightKind.from(kind);
	}
	export function to(
		kind: languages.DocumentHighlightKind,
	): vscode.DocumentHighlightKind {
		return extHostTypeConverter.DocumentHighlightKind.to(kind);
	}
}
export namespace DocumentHighlight {
	export function from(
		documentHighlight: vscode.DocumentHighlight,
	): extHostProtocol.IDocumentHighlightDto {
		return {
			range: Range.from(documentHighlight.range)!,
			kind: documentHighlight.kind
				? DocumentHighlightKind.from(documentHighlight.kind)
				: undefined,
		};
	}
	export function to(
		dto: extHostProtocol.IDocumentHighlightDto,
	): vscode.DocumentHighlight {
		return new extHostTypes.DocumentHighlight(
			Range.to(dto.range)!,
			dto.kind ? DocumentHighlightKind.to(dto.kind) : undefined,
		);
	}
}

// --- DocumentLink ---
export namespace DocumentLink {
	export function from(
		link: vscode.DocumentLink,
		uriTransformer?: IURITransformer,
	): extHostProtocol.ILinkDto {
		return {
			range: Range.from(link.range)!,
			url: link.target
				? uriTransformer
					? uriTransformer.transformOutgoing(link.target)
					: link.target.toJSON()
				: undefined,
			tooltip: link.tooltip,
			data: (link as any)._id,
		};
	}
	export function to(
		dto: extHostProtocol.ILinkDto,
		uriTransformer?: IURITransformer,
	): vscode.DocumentLink {
		let target: vscode.Uri | undefined = undefined;
		if (dto.url) {
			try {
				target = URI.revive(
					uriTransformer
						? uriTransformer.transformIncoming(
								dto.url as UriComponents,
							)
						: (dto.url as UriComponents),
				);
			} catch (err) {
				/* ignore */
			}
		}
		const result = new extHostTypes.DocumentLink(
			Range.to(dto.range)!,
			target,
		);
		result.tooltip = dto.tooltip;
		if (dto.data) (result as any)._id = dto.data;
		return result;
	}
	export function fromList(
		links: vscode.DocumentLink[] | undefined | null,
		uriTransformer?: IURITransformer,
	): extHostProtocol.ILinksListDto | undefined {
		if (!links) return undefined;
		return { links: links.map((l) => from(l, uriTransformer)) };
	}
}

// --- ReferenceContext & RenameConverter ---
export namespace ReferenceContextConverter {
	export function fromApi(
		context: vscode.ReferenceContext,
	): extHostProtocol.IReferenceContextDto {
		return { includeDeclaration: context.includeDeclaration };
	}
	export function toApi(
		dto: extHostProtocol.IReferenceContextDto,
	): vscode.ReferenceContext {
		return { includeDeclaration: dto.includeDeclaration };
	}
}
export namespace RenameConverter {
	export function fromApiPrepareRename(
		result:
			| vscode.Range
			| { range: vscode.Range; placeholder: string }
			| undefined
			| null,
	):
		| extHostProtocol.IRangeDto
		| extHostProtocol.IPrepareRenameResultDto
		| undefined
		| null {
		if (!result) return result;
		if (extHostTypes.Range.isRange(result)) return Range.from(result);
		else
			return {
				range: Range.from(result.range)!,
				placeholder: result.placeholder,
			};
	}
	export function toApiPrepareRename(
		dto:
			| extHostProtocol.IRangeDto
			| extHostProtocol.IPrepareRenameResultDto
			| undefined
			| null,
	): vscode.Range | { range: vscode.Range; placeholder: string } | undefined {
		if (!dto) return undefined;
		if ("placeholder" in dto && "range" in dto)
			return {
				range: Range.to(dto.range as extHostProtocol.IRange)!,
				placeholder: dto.placeholder,
			};
		else return Range.to(dto as extHostProtocol.IRange);
	}
}

// --- FoldingRangeKind & FoldingRange ---
export namespace FoldingRangeKind {
	export function from(
		kind?: vscode.FoldingRangeKind,
	): languages.FoldingRangeKind | undefined {
		return extHostTypeConverter.FoldingRangeKind.from(kind);
	}
	export function to(
		kind?: languages.FoldingRangeKind,
	): vscode.FoldingRangeKind | undefined {
		return extHostTypeConverter.FoldingRangeKind.to(kind);
	}
}
export namespace FoldingRange {
	export function fromApi(
		r: vscode.FoldingRange,
	): extHostProtocol.IFoldingRangeDto {
		return {
			startLine: r.start,
			endLine: r.end,
			kind: FoldingRangeKind.from(r.kind),
		};
	}
	export function toApi(
		r: extHostProtocol.IFoldingRangeDto,
	): vscode.FoldingRange {
		return new extHostTypes.FoldingRange(
			r.startLine,
			r.endLine,
			FoldingRangeKind.to(r.kind),
		);
	}
	export function fromApiArray(
		ranges: readonly vscode.FoldingRange[],
	): extHostProtocol.IFoldingRangeDto[] {
		return ranges.map(fromApi);
	}
}

// --- SelectionRange ---
export namespace SelectionRange {
	export function fromApi(
		obj: vscode.SelectionRange,
	): extHostProtocol.ISelectionRangeDto {
		return {
			range: Range.from(obj.range)!,
			parent: obj.parent ? fromApi(obj.parent) : undefined,
		};
	}
	export function toApi(
		obj: extHostProtocol.ISelectionRangeDto,
	): vscode.SelectionRange {
		let parent: vscode.SelectionRange | undefined = undefined;
		if (obj.parent) parent = toApi(obj.parent);
		return new extHostTypes.SelectionRange(Range.to(obj.range)!, parent);
	}
	export function fromApiArray(
		selectionRanges: vscode.SelectionRange[],
	): extHostProtocol.ISelectionRangeDto[] {
		return selectionRanges.map(fromApi);
	}
}

// --- LinkedEditingRanges ---
export namespace LinkedEditingRanges {
	export function fromApi(
		obj: vscode.LinkedEditingRanges | null | undefined,
	): extHostProtocol.ILinkedEditingRangesDto | undefined {
		if (!obj) return undefined;
		return {
			ranges: obj.ranges.map((r) => Range.from(r)!),
			wordPattern: obj.wordPattern ? obj.wordPattern.source : undefined,
		};
	}
	export function toApi(
		dto: extHostProtocol.ILinkedEditingRangesDto | undefined,
	): vscode.LinkedEditingRanges | undefined {
		if (!dto) return undefined;
		return new extHostTypes.LinkedEditingRanges(
			dto.ranges.map((r) => Range.to(r)!),
			dto.wordPattern ? new RegExp(dto.wordPattern) : undefined,
		);
	}
}

// --- Semantic Tokens ---
export namespace SemanticTokensLegend {
	export function fromApi(
		legend: vscode.SemanticTokensLegend,
	): languages.SemanticTokensLegend {
		return {
			tokenTypes: legend.tokenTypes,
			tokenModifiers: legend.tokenModifiers,
		};
	}
	export function toApi(
		legendDto: languages.SemanticTokensLegend,
	): vscode.SemanticTokensLegend {
		return new extHostTypes.SemanticTokensLegend(
			legendDto.tokenTypes,
			legendDto.tokenModifiers,
		);
	}
}
export namespace SemanticTokens {
	export function fromApi(
		tokens: vscode.SemanticTokens,
	): extHostProtocol.ISemanticTokensDto {
		return { resultId: tokens.resultId, data: Array.from(tokens.data) };
	}
	export function toApi(
		dto: extHostProtocol.ISemanticTokensDto,
	): vscode.SemanticTokens {
		let dataArray: Uint32Array;
		if (dto.data instanceof Uint8Array) {
			if (dto.data.byteLength % 4 !== 0) {
				dataArray = new Uint32Array();
			} else
				dataArray = new Uint32Array(
					dto.data.buffer,
					dto.data.byteOffset,
					dto.data.byteLength / 4,
				);
		} else if (Array.isArray(dto.data)) {
			dataArray = new Uint32Array(dto.data as number[]);
		} else {
			dataArray = new Uint32Array();
		}
		return new extHostTypes.SemanticTokens(dataArray, dto.resultId);
	}
}
export namespace SemanticTokensEdit {
	export function fromApi(
		edit: vscode.SemanticTokensEdit,
	): extHostProtocol.ISemanticTokensEditDto {
		return {
			start: edit.start,
			deleteCount: edit.deleteCount,
			data: edit.data ? Array.from(edit.data.data) : undefined,
		};
	}
}
export namespace SemanticTokensEdits {
	export function fromApi(
		edits: vscode.SemanticTokensEdits,
	): extHostProtocol.ISemanticTokensEditsDto {
		return {
			resultId: edits.resultId,
			edits: edits.edits.map(SemanticTokensEdit.fromApi),
		};
	}
}

// --- CallHierarchy & TypeHierarchy ---
export namespace CallHierarchyItem {
	export function fromApi(
		item: vscode.CallHierarchyItem,
		sessionId: string,
		itemId: string,
		uriTransformer?: IURITransformer,
	): extHostProtocol.ICallHierarchyItemDto {
		return {
			_sessionId: sessionId,
			_itemId: itemId,
			name: item.name,
			detail: item.detail || "",
			kind: extHostTypeConverter.SymbolKind.from(item.kind),
			tags: item.tags
				?.map((t) => extHostTypeConverter.SymbolTag.from(t))
				.filter(isDefined),
			uri: uriTransformer
				? uriTransformer.transformOutgoing(item.uri)
				: item.uri.toJSON(),
			range: Range.from(item.range)!,
			selectionRange: Range.from(item.selectionRange)!,
		};
	}
	export function toApi(
		dto: extHostProtocol.ICallHierarchyItemDto,
		uriTransformer?: IURITransformer,
	): vscode.CallHierarchyItem {
		const result = new extHostTypes.CallHierarchyItem(
			extHostTypeConverter.SymbolKind.to(dto.kind),
			dto.name,
			dto.detail,
			URI.revive(
				uriTransformer
					? uriTransformer.transformIncoming(dto.uri)
					: dto.uri,
			),
			Range.to(dto.range)!,
			Range.to(dto.selectionRange)!,
		);
		(result as extHostTypes.internal.CallHierarchyItem)._sessionId =
			dto._sessionId;
		(result as extHostTypes.internal.CallHierarchyItem)._itemId =
			dto._itemId;
		if (dto.tags)
			result.tags = dto.tags
				.map((t) => extHostTypeConverter.SymbolTag.to(t))
				.filter(isDefined);
		return result;
	}
}
export namespace CallHierarchyIncomingCall {
	export function toApi(
		dto: extHostProtocol.IIncomingCallDto,
		uriTransformer?: IURITransformer,
	): vscode.CallHierarchyIncomingCall {
		return new extHostTypes.CallHierarchyIncomingCall(
			CallHierarchyItem.toApi(dto.from, uriTransformer),
			dto.fromRanges.map((r) => Range.to(r)!),
		);
	}
}
export namespace CallHierarchyOutgoingCall {
	export function toApi(
		dto: extHostProtocol.IOutgoingCallDto,
		uriTransformer?: IURITransformer,
	): vscode.CallHierarchyOutgoingCall {
		return new extHostTypes.CallHierarchyOutgoingCall(
			CallHierarchyItem.toApi(dto.to, uriTransformer),
			dto.fromRanges.map((r) => Range.to(r)!),
		);
	}
}
export namespace TypeHierarchyItem {
	export function fromApi(
		item: vscode.TypeHierarchyItem,
		sessionId: string,
		itemId: string,
		uriTransformer?: IURITransformer,
	): extHostProtocol.ITypeHierarchyItemDto {
		return {
			_sessionId: sessionId,
			_itemId: itemId,
			name: item.name,
			detail: item.detail || "",
			kind: extHostTypeConverter.SymbolKind.from(item.kind),
			tags: item.tags
				?.map((t) => extHostTypeConverter.SymbolTag.from(t))
				.filter(isDefined),
			uri: uriTransformer
				? uriTransformer.transformOutgoing(item.uri)
				: item.uri.toJSON(),
			range: Range.from(item.range)!,
			selectionRange: Range.from(item.selectionRange)!,
		};
	}
	export function toApi(
		dto: extHostProtocol.ITypeHierarchyItemDto,
		uriTransformer?: IURITransformer,
	): vscode.TypeHierarchyItem {
		const result = new extHostTypes.TypeHierarchyItem(
			extHostTypeConverter.SymbolKind.to(dto.kind),
			dto.name,
			dto.detail,
			URI.revive(
				uriTransformer
					? uriTransformer.transformIncoming(dto.uri)
					: dto.uri,
			),
			Range.to(dto.range)!,
			Range.to(dto.selectionRange)!,
		);
		(result as extHostTypes.internal.TypeHierarchyItem)._sessionId =
			dto._sessionId;
		(result as extHostTypes.internal.TypeHierarchyItem)._itemId =
			dto._itemId;
		if (dto.tags)
			result.tags = dto.tags
				.map((t) => extHostTypeConverter.SymbolTag.to(t))
				.filter(isDefined);
		return result;
	}
}

// --- SignatureHelp ---
export namespace ParameterInformation {
	export function from(
		info: vscode.ParameterInformation,
	): extHostProtocol.ParameterInformationDto {
		return {
			label: info.label,
			documentation: MarkdownString.fromStrict(info.documentation),
		};
	}
	export function to(
		info: extHostProtocol.ParameterInformationDto,
	): vscode.ParameterInformation {
		return new extHostTypes.ParameterInformation(
			info.label as string | [number, number],
			info.documentation
				? MarkdownString.to(info.documentation)
				: undefined,
		);
	}
}
export namespace SignatureInformation {
	export function from(
		info: vscode.SignatureInformation,
	): extHostProtocol.SignatureInformationDto {
		return {
			label: info.label,
			documentation: MarkdownString.fromStrict(info.documentation),
			parameters: Array.isArray(info.parameters)
				? info.parameters.map(ParameterInformation.from)
				: [],
			activeParameter: info.activeParameter,
		};
	}
	export function to(
		info: extHostProtocol.SignatureInformationDto,
	): vscode.SignatureInformation {
		const result = new extHostTypes.SignatureInformation(
			info.label,
			info.documentation
				? MarkdownString.to(info.documentation)
				: undefined,
		);
		if (info.parameters)
			result.parameters = info.parameters.map(ParameterInformation.to);
		if (info.activeParameter !== undefined)
			result.activeParameter = info.activeParameter;
		return result;
	}
}
export namespace SignatureHelp {
	export function contextToApi(
		dto: extHostProtocol.SignatureHelpContextDto,
	): vscode.SignatureHelpContext {
		return {
			triggerKind: extHostTypeConverter.SignatureHelpTriggerKind.to(
				dto.triggerKind as languages.SignatureHelpTriggerKind,
			),
			triggerCharacter: dto.triggerCharacter,
			isRetrigger: dto.isRetrigger,
			activeSignatureHelp: dto.activeSignatureHelp
				? SignatureHelp.toApi(dto.activeSignatureHelp)
				: undefined,
		};
	}
	export function fromApi(
		help: vscode.SignatureHelp,
	): extHostProtocol.ISignatureHelpDto {
		return extHostTypeConverter.SignatureHelp.from(help);
	}
	export function toApi(
		dto: extHostProtocol.ISignatureHelpDto,
	): vscode.SignatureHelp {
		return extHostTypeConverter.SignatureHelp.to(dto);
	}
}

// --- InlayHint ---
export namespace InlayHintKind {
	export function fromApi(
		kind?: vscode.InlayHintKind,
	): languages.InlayHintKind | undefined {
		return extHostTypeConverter.InlayHintKind.from(kind);
	}
	export function toApi(
		kind?: languages.InlayHintKind,
	): vscode.InlayHintKind | undefined {
		return extHostTypeConverter.InlayHintKind.to(kind);
	}
}
export namespace InlayHintLabelPart {
	export function fromApi(
		part: vscode.InlayHintLabelPart,
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IInlayHintLabelPartDto {
		return {
			value: part.value,
			tooltip: MarkdownString.fromStrict(part.tooltip),
			location: part.location
				? location.from(part.location, uriTransformer)
				: undefined,
			command: part.command
				? commandsConverter.toInternal(part.command, disposables)
				: undefined,
		};
	}
	export function toApi(
		dto: extHostProtocol.IInlayHintLabelPartDto,
		commandsConverter: CommandsConverter,
		uriTransformer?: IURITransformer,
	): vscode.InlayHintLabelPart {
		const result = new extHostTypes.InlayHintLabelPart(dto.value);
		result.tooltip = dto.tooltip
			? typeof dto.tooltip === "string"
				? dto.tooltip
				: MarkdownString.to(dto.tooltip)
			: undefined;
		result.location = dto.location
			? location.to(
					dto.location as extHostProtocol.ILocationDto,
					uriTransformer,
				)
			: undefined;
		result.command = commandsConverter.fromInternal(dto.command);
		return result;
	}
}
export namespace InlayHint {
	export function fromApi(
		hint: vscode.InlayHint,
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IInlayHintDto {
		return {
			label:
				typeof hint.label === "string"
					? hint.label
					: hint.label.map((part) =>
							InlayHintLabelPart.fromApi(
								part,
								commandsConverter,
								disposables,
								uriTransformer,
							),
						),
			position: Position.from(hint.position),
			kind: InlayHintKind.fromApi(hint.kind),
			tooltip: MarkdownString.fromStrict(hint.tooltip),
			paddingLeft: hint.paddingLeft,
			paddingRight: hint.paddingRight,
			textEdits: hint.textEdits?.map(TextEdit.from),
		};
	}
	export function toApi(
		dto: extHostProtocol.IInlayHintDto,
		commandsConverter: CommandsConverter,
		uriTransformer?: IURITransformer,
	): vscode.InlayHint {
		const label =
			typeof dto.label === "string"
				? dto.label
				: dto.label.map((partDto) =>
						InlayHintLabelPart.toApi(
							partDto as extHostProtocol.IInlayHintLabelPartDto,
							commandsConverter,
							uriTransformer,
						),
					);
		const result = new extHostTypes.InlayHint(
			Position.to(dto.position)!,
			label,
			InlayHintKind.toApi(dto.kind),
		);
		result.tooltip = dto.tooltip
			? typeof dto.tooltip === "string"
				? dto.tooltip
				: MarkdownString.to(dto.tooltip)
			: undefined;
		result.paddingLeft = dto.paddingLeft;
		result.paddingRight = dto.paddingRight;
		result.textEdits = dto.textEdits?.map((te) =>
			TextEdit.to(te as languages.TextEdit),
		);
		return result;
	}
	export function fromApiList(
		hints: readonly vscode.InlayHint[] | undefined | null,
		cacheId: number,
		commandsConverter: CommandsConverter,
		listDisposables: DisposableStore,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IInlayHintsDto | undefined {
		if (!hints) return undefined;
		const resultHints: extHostProtocol.IInlayHintDto[] = [];
		for (let i = 0; i < hints.length; i++) {
			const dto = fromApi(
				hints[i],
				commandsConverter,
				listDisposables,
				uriTransformer,
			);
			(dto as any).data = [cacheId, i];
			resultHints.push(dto);
		}
		return { hints: resultHints, cacheId };
	}
}
// --- End InlayHint ---

// --- SymbolKind & SymbolTag ---
// (Using extHostTypeConverter directly for these as they are mostly enum mappings)
// export namespace SymbolKind { /* ... from extHostTypeConverter ... */ }
// export namespace SymbolTag { /* ... from extHostTypeConverter ... */ }

// --- DocumentSymbol & WorkspaceSymbol ---
export namespace DocumentSymbol {
	export function fromApi(
		info: vscode.DocumentSymbol,
	): extHostProtocol.IDocumentSymbolDto {
		return {
			name: info.name || "!!MISSING: name!!",
			detail: info.detail,
			kind: extHostTypeConverter.SymbolKind.from(info.kind),
			tags: info.tags
				?.map((t) => extHostTypeConverter.SymbolTag.from(t))
				.filter(isDefined) as languages.SymbolTag[],
			range: Range.from(info.range)!,
			selectionRange: Range.from(info.selectionRange)!,
			children: info.children?.map(fromApi),
		};
	}
	export function toApi(
		dto: extHostProtocol.IDocumentSymbolDto,
	): vscode.DocumentSymbol {
		const result = new extHostTypes.DocumentSymbol(
			dto.name,
			dto.detail,
			extHostTypeConverter.SymbolKind.to(dto.kind),
			Range.to(dto.range)!,
			Range.to(dto.selectionRange)!,
		);
		if (isNonEmptyArray(dto.tags))
			result.tags = dto.tags
				.map((t) => extHostTypeConverter.SymbolTag.to(t))
				.filter(isDefined);
		if (dto.children) result.children = dto.children.map(toApi);
		return result;
	}
	export function fromApiArray(
		symbols: ReadonlyArray<
			vscode.DocumentSymbol | vscode.SymbolInformation
		>,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IDocumentSymbolDto[] {
		return symbols.map((s) => {
			if (extHostTypes.DocumentSymbol.isDocumentSymbol(s))
				return DocumentSymbol.fromApi(s);
			return {
				name: s.name,
				detail: s.containerName || "",
				kind: extHostTypeConverter.SymbolKind.from(s.kind),
				tags: s.tags
					?.map((t) => extHostTypeConverter.SymbolTag.from(t))
					.filter(isDefined) as languages.SymbolTag[],
				range: Range.from(s.location.range)!,
				selectionRange: Range.from(s.location.range)!,
				children: undefined,
			};
		});
	}
}
export namespace WorkspaceSymbol {
	export function fromApi(
		info: vscode.SymbolInformation,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IWorkspaceSymbolDto {
		return {
			name: info.name,
			kind: extHostTypeConverter.SymbolKind.from(info.kind),
			tags: info.tags
				?.map((t) => extHostTypeConverter.SymbolTag.from(t))
				.filter(isDefined) as languages.SymbolTag[],
			containerName: info.containerName,
			location: location.from(info.location, uriTransformer),
		};
	}
	export function toApi(
		dto: extHostProtocol.IWorkspaceSymbolDto,
		uriTransformer?: IURITransformer,
	): vscode.SymbolInformation {
		const result = new extHostTypes.SymbolInformation(
			dto.name,
			extHostTypeConverter.SymbolKind.to(dto.kind),
			dto.containerName || "",
			location.to(
				dto.location as extHostProtocol.ILocationDto,
				uriTransformer,
			),
		);
		if (isNonEmptyArray(dto.tags))
			result.tags = dto.tags
				.map((t) => extHostTypeConverter.SymbolTag.to(t))
				.filter(isDefined);
		return result;
	}
}
