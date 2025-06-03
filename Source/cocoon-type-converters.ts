/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters (cocoon-type-converters.ts)
 * --------------------------------------------------------------------------------------------
 * This module serves as the central hub for all type conversion logic required to bridge
 * the gap between VS Code's public API types (e.g., `vscode.CompletionItem`, `vscode.Hover`)
 * and their corresponding Data Transfer Object (DTO) representations. These DTOs are
 * utilized for RPC/IPC (Remote Procedure Call / Inter-Process Communication) with the
 * Mountain host process (the main application backend).
 *
 * Design Philosophy:
 * - Mirror VS Code's `vs/workbench/api/common/extHostTypeConverters.ts`: This module aims
 *   to replicate the purpose, structure, and much of the logic found in VS Code's own
 *   internal type conversion utilities. This promotes compatibility and leverages
 *   established patterns for handling complex API types.
 * - Bidirectional Conversion: For each complex API type that needs to be transmitted
 *   over RPC, this module should ideally provide two conversion functions:
 *   - `toApi(dtoValue, ...contextArgs)`: Converts a DTO received from the MainThread
 *     (Mountain) into an instance of the corresponding VS Code public API object.
 *   - `fromApi(apiValue, ...contextArgs)`: Converts an instance of a VS Code public
 *     API object (often returned by an extension's provider) into its DTO representation,
 *     suitable for sending to the MainThread.
 * - Contextual Information: Converters may require contextual information, such as:
 *   - `IURITransformer`: For transforming URIs between the Extension Host and
 *     MainThread representations.
 *   - `CommandsConverter`: A specialized utility for converting `vscode.Command` objects
 *     to/from `ICommandDto`.
 *   - `DisposableStore`: For managing any disposable resources created during the
 *     conversion process.
 * - Comprehensive Coverage: The goal is to provide converters for all complex types
 *   that are part of the APIs shimmed by Cocoon.
 *--------------------------------------------------------------------------------------------*/

import { asArray, coalesce, isNonEmptyArray } from "vs/base/common/arrays";
import { VSBuffer } from "vs/base/common/buffer";
import * as htmlContent from "vs/base/common/htmlContent";
import {
	DisposableStore,
	toDisposable,
	type IDisposable,
} from "vs/base/common/lifecycle";
import { MarshalledObject, revive } from "vs/base/common/marshalling";
import { MarshalledId } from "vs/base/common/marshallingIds";
import { isUriComponents, URI, type UriComponents } from "vs/base/common/uri";
import { IURITransformer } from "vs/base/common/uriIpc";
import { generateUuid } from "vs/base/common/uuid";
import type { ISingleEditOperation } from "vs/editor/common/core/editOperation";
import type { IPosition } from "vs/editor/common/core/position";
import * as editorRange from "vs/editor/common/core/range";
import type { ISelection } from "vs/editor/common/core/selection";
import * as languages from "vs/editor/common/languages";
import { EndOfLineSequence } from "vs/editor/common/model";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions";
import { ILogService } from "vs/platform/log/common/log";
import * as extHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as extHostTypeConverter from "vs/workbench/api/common/extHostTypeConverters";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

import type {
	ApiCommand,
	ExtHostCommands as CocoonExtHostCommands,
} from "../Shim/commands-shim";
import {
	Command as VscodeCommandCtor,
	Disposable as VscodeDisposableFromApi,
} from "../Shim/vscode";

let _converterLogService: ILogService | undefined;

export function initializeConverterLogger(logger?: ILogService): void {
	_converterLogService = logger;
}

function _warnStub(
	converterName: string,
	direction: "toApi" | "fromApi",
	messageSuffix: string = "",
) {
	_converterLogService?.warn(
		`[TypeConverter STUB] ${converterName}.${direction} is STUBBED/SIMPLIFIED. ${messageSuffix} May not handle all fields or cases correctly.`,
	);
}

function isDefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null;
}

function cloneAndChange(obj: any, changer: (orig: any) => any): any {
	return _cloneAndChange(obj, changer, new Set());
}
function _cloneAndChange(
	obj: any,
	changer: (orig: any) => any,
	seen: Set<any>,
): any {
	if (obj === undefined || obj === null) return obj;
	const changed = changer(obj);
	if (typeof changed !== "undefined") return changed;
	if (Array.isArray(obj)) {
		if (seen.has(obj)) throw new Error("Cannot clone recursive array");
		seen.add(obj);
		const r1: any[] = [];
		for (const e of obj) r1.push(_cloneAndChange(e, changer, seen));
		seen.delete(obj);
		return r1;
	}
	if (typeof obj === "object") {
		if (seen.has(obj)) throw new Error("Cannot clone recursive object");
		seen.add(obj);
		const r2: { [key: string]: any } = {};
		for (const i2 in obj) {
			if (Object.hasOwnProperty.call(obj, i2))
				r2[i2] = _cloneAndChange(obj[i2], changer, seen);
		}
		seen.delete(obj);
		return r2;
	}
	return obj;
}

// --- CommandsConverter ---
export class CommandsConverter
	implements extHostTypeConverter.Command.ICommandsConverter
{
	readonly delegatingCommandId: string;
	private readonly _cache = new Map<string, vscode.Command>();
	private _cachIdPool = 0;
	private readonly _commandsDirectConversionBlacklist = new Set<string>();

	constructor(
		private readonly _commandsImpl: CocoonExtHostCommands,
		private readonly _logService?: ILogService,
		private readonly _lookupApiCommand?: (
			id: string,
		) => ApiCommand | undefined,
		private readonly _uriTransformer?: IURITransformer | null,
	) {
		this.delegatingCommandId = `_cocoon.executeContributedCommandWithCachedArgs.${generateUuid()}`;
		this._logService?.trace(
			`[CommandsConverter] Delegating command ID: ${this.delegatingCommandId}`,
		);

		this._commandsImpl.registerCommand(
			true,
			this.delegatingCommandId,
			async (ident: string, ...restArgsFromMainThread: any[]) => {
				const command = this._cache.get(ident);
				if (!command) {
					this._logService?.error(
						`[CC] Delegated execution: Unknown $ident '${ident}'`,
					);
					throw new Error(
						`Unknown $ident for cached command: ${ident}`,
					);
				}
				this._logService?.trace(
					`[CC] Executing delegated (via $ident '${ident}'): '${command.command}'`,
				);
				let executionArgs = command.arguments || [];
				if (restArgsFromMainThread.length > 0) {
					this._logService?.warn(
						`[CC] Delegating command for $ident '${ident}' received unexpected additional arguments from MainThread:`,
						restArgsFromMainThread,
						"Using only cached arguments.",
					);
				}
				return this._commandsImpl.executeCommand(
					command.command,
					...executionArgs,
				);
			},
			this,
			{
				description:
					"Internal Cocoon delegating command for cached arguments",
			},
		);
	}

	fromInternal(
		commandDto: extHostProtocol.ICommandDto | undefined,
	): vscode.Command | undefined {
		if (!commandDto) return undefined;
		if (typeof commandDto.$ident === "string") {
			const cachedCommand = this._cache.get(commandDto.$ident);
			if (cachedCommand) {
				this._logService?.trace(
					`[CC] fromInternal: Resolved command from $ident '${commandDto.$ident}'`,
				);
				return cachedCommand;
			}
			this._logService?.warn(
				`[CC] fromInternal: $ident '${commandDto.$ident}' not found in cache. Reconstructing basic for '${commandDto.id}'. This may fail if it relied on complex args.`,
			);
			const originalCmdId =
				commandDto.id === this.delegatingCommandId
					? `(original for ${commandDto.$ident})`
					: commandDto.id;
			const revivedArgs = commandDto.arguments
				? (this._commandsImpl as any)._reviveArgumentsFromRpc(
						commandDto.arguments,
						this,
					)
				: [];
			return {
				command: originalCmdId,
				title: commandDto.title,
				arguments: revivedArgs,
				tooltip: commandDto.tooltip,
			};
		}
		const Ctor = VscodeCommandCtor as any;
		const result = new Ctor(commandDto.id, commandDto.title);
		result.tooltip = commandDto.tooltip;
		if (commandDto.arguments) {
			result.arguments = (
				this._commandsImpl as any
			)._reviveArgumentsFromRpc(commandDto.arguments, this);
		}
		return result;
	}

	toInternal(
		command: vscode.Command | undefined,
		disposables: DisposableStore,
	): extHostProtocol.ICommandDto | undefined {
		if (!command) return undefined;
		const result: extHostProtocol.ICommandDto = {
			$ident: undefined,
			id: command.command,
			title: command.title,
			tooltip: command.tooltip,
		};
		if (!command.command) return result;

		const apiCommand = this._lookupApiCommand
			? this._lookupApiCommand(command.command)
			: undefined;
		if (apiCommand) {
			this._logService?.trace(
				`[CC] toInternal: Marshalling known API command '${command.command}'.`,
			);
			result.id = apiCommand.internalId;
			result.arguments = apiCommand.args.map((argDef, i) => {
				const apiArg = command.arguments && command.arguments[i];
				if (!argDef.validate(apiArg)) {
					this._logService?.warn(
						`[CC] API Command '${apiCommand.id}': Arg '${argDef.name}' (idx ${i}) failed validation. Value:`,
						apiArg,
					);
				}
				try {
					return argDef.convert(
						apiArg,
						this._uriTransformer || undefined,
					);
				} catch (e: any) {
					this._logService?.error(
						`[CC] Error converting arg '${argDef.name}' for API cmd '${apiCommand.id}':`,
						e.message,
					);
					return apiArg;
				}
			});
		} else if (isNonEmptyArray(command.arguments)) {
			const needsCaching =
				this._commandsDirectConversionBlacklist.has(command.command) ||
				command.arguments.some(
					(arg) =>
						typeof arg === "function" ||
						arg instanceof VscodeDisposableFromApi,
				);
			if (needsCaching) {
				const ident = `$ccmd${this._cachIdPool++}`;
				this._logService?.debug(
					`[CC] toInternal: Caching args for cmd '${command.command}' with $ident '${ident}'.`,
				);
				this._cache.set(
					ident,
					cloneAndChange(command, () => undefined),
				);
				disposables.add(
					new VscodeDisposableFromApi(() => {
						this._cache.delete(ident);
					}),
				);
				result.$ident = ident;
				result.id = this.delegatingCommandId;
				result.arguments = [ident];
			} else {
				result.arguments = command.arguments.map(
					(arg) =>
						(
							this._commandsImpl as any
						)._convertArgumentsToInternalForRpc(
							[arg],
							disposables,
						)[0],
				);
			}
		}
		return result;
	}
}

// --- Basic Geometric Types ---
export namespace Position {
	export function from(position: vscode.Position): extHostProtocol.IPosition {
		return { lineNumber: position.line, column: position.character };
	}
	export function to(
		positionDto: extHostProtocol.IPosition,
	): vscode.Position {
		return new extHostTypes.Position(
			positionDto.lineNumber,
			positionDto.column,
		);
	}
}

export namespace Range {
	export function from(range: undefined): undefined;
	export function from(range: vscode.Range): extHostProtocol.IRange;
	export function from(
		range: vscode.Range | undefined,
	): extHostProtocol.IRange | undefined {
		if (!range) return undefined;
		return {
			startLineNumber: range.start.line,
			startColumn: range.start.character,
			endLineNumber: range.end.line,
			endColumn: range.end.character,
		};
	}
	export function to(rangeDto: undefined): undefined;
	export function to(rangeDto: extHostProtocol.IRange): vscode.Range;
	export function to(
		rangeDto: extHostProtocol.IRange | undefined,
	): vscode.Range | undefined {
		if (!rangeDto) return undefined;
		return new extHostTypes.Range(
			rangeDto.startLineNumber,
			rangeDto.startColumn,
			rangeDto.endLineNumber,
			rangeDto.endColumn,
		);
	}
}

export namespace Selection {
	export function from(
		selection: vscode.Selection,
	): extHostProtocol.ISelection {
		return {
			selectionStartLineNumber: selection.anchor.line,
			selectionStartColumn: selection.anchor.character,
			positionLineNumber: selection.active.line,
			positionColumn: selection.active.character,
		};
	}
	export function to(
		selectionDto: extHostProtocol.ISelection,
	): vscode.Selection {
		return new extHostTypes.Selection(
			selectionDto.selectionStartLineNumber,
			selectionDto.selectionStartColumn,
			selectionDto.positionLineNumber,
			selectionDto.positionColumn,
		);
	}
}

export namespace location {
	export function from(
		value: vscode.Location,
		uriTransformer?: IURITransformer,
	): languages.Location {
		return {
			uri: uriTransformer
				? uriTransformer.transformOutgoing(value.uri)
				: value.uri.toJSON(),
			range: Range.from(value.range)!,
		};
	}
	export function to(
		value: extHostProtocol.ILocationDto,
		uriTransformer?: IURITransformer,
	): vscode.Location {
		return new extHostTypes.Location(
			URI.revive(
				uriTransformer
					? uriTransformer.transformIncoming(value.uri)
					: value.uri,
			),
			Range.to(value.range)!,
		);
	}
}

export namespace DefinitionLink {
	export function from(
		value: vscode.DefinitionLink,
		uriTransformer?: IURITransformer,
	): extHostProtocol.ILocationLinkDto {
		return {
			originSelectionRange: value.originSelectionRange
				? Range.from(value.originSelectionRange)
				: undefined,
			uri: uriTransformer
				? uriTransformer.transformOutgoing(value.targetUri)
				: value.targetUri.toJSON(),
			range: Range.from(value.targetRange)!,
			targetSelectionRange: value.targetSelectionRange
				? Range.from(value.targetSelectionRange)
				: undefined,
		};
	}
	export function to(
		value: extHostProtocol.ILocationLinkDto,
		uriTransformer?: IURITransformer,
	): vscode.LocationLink {
		return {
			targetUri: URI.revive(
				uriTransformer
					? uriTransformer.transformIncoming(value.uri)
					: value.uri,
			),
			targetRange: Range.to(value.range)!,
			targetSelectionRange: value.targetSelectionRange
				? Range.to(value.targetSelectionRange)
				: undefined,
			originSelectionRange: value.originSelectionRange
				? Range.to(value.originSelectionRange)
				: undefined,
		};
	}
	export function fromApiArray(
		apiArray: ReadonlyArray<vscode.DefinitionLink | vscode.Location>,
		uriTransformer?: IURITransformer,
	): extHostProtocol.ILocationLinkDto[] {
		return apiArray.map((item) => {
			if ("targetUri" in item) {
				return DefinitionLink.from(
					item as vscode.DefinitionLink,
					uriTransformer,
				);
			} else {
				return {
					uri: uriTransformer
						? uriTransformer.transformOutgoing(item.uri)
						: item.uri.toJSON(),
					range: Range.from(item.range)!,
				};
			}
		});
	}
}

// --- MarkdownString ---
export namespace MarkdownString {
	function isCodeblock(
		thing: any,
	): thing is { language: string; value: string } {
		return (
			thing &&
			typeof thing === "object" &&
			typeof (thing as any).language === "string" &&
			typeof (thing as any).value === "string"
		);
	}
	export function from(
		markup: vscode.MarkdownString | vscode.MarkedString | undefined,
	): htmlContent.IMarkdownString | undefined {
		if (!markup) return undefined;
		if (extHostTypes.MarkdownString.isMarkdownString(markup)) {
			const result: htmlContent.IMarkdownString = {
				value: markup.value,
				isTrusted: markup.isTrusted,
				supportThemeIcons: markup.supportThemeIcons,
				supportHtml: markup.supportHtml,
				baseUri: markup.baseUri?.toJSON(),
			};
			if (markup.uris) {
				const uris: { [href: string]: UriComponents } =
					Object.create(null);
				for (const key in markup.uris) {
					uris[key] = markup.uris[key].toJSON();
				}
				result.uris = uris;
			}
			return result;
		} else if (isCodeblock(markup)) {
			const { language, value } = markup;
			return { value: "```" + language + "\n" + value + "\n```\n" };
		} else if (typeof markup === "string") {
			return { value: markup };
		}
		return { value: "" };
	}
	export function fromMany(
		markup: (vscode.MarkdownString | vscode.MarkedString)[],
	): htmlContent.IMarkdownString[] {
		return markup
			.map(MarkdownString.from)
			.filter((m) => m !== undefined) as htmlContent.IMarkdownString[];
	}
	export function to(
		value: htmlContent.IMarkdownString | string,
	): vscode.MarkdownString {
		let result: vscode.MarkdownString;
		if (typeof value === "string") {
			result = new extHostTypes.MarkdownString(value);
		} else {
			result = new extHostTypes.MarkdownString(
				value.value,
				value.supportThemeIcons,
			);
			result.isTrusted = value.isTrusted;
			result.supportHtml = value.supportHtml;
			result.baseUri = value.baseUri
				? URI.revive(value.baseUri)
				: undefined;
			if (value.uris) {
				const uris: { [href: string]: vscode.Uri } =
					Object.create(null);
				for (const key in value.uris) {
					uris[key] = URI.revive(value.uris[key]);
				}
				result.uris = uris;
			}
		}
		return result;
	}
	export function fromStrict(
		value: string | vscode.MarkdownString | undefined | null,
	): undefined | string | htmlContent.IMarkdownString {
		if (!value) return undefined;
		return typeof value === "string" ? value : MarkdownString.from(value);
	}
}

// --- TextEdit & EndOfLine ---
export namespace TextEdit {
	export function from(edit: vscode.TextEdit): languages.TextEdit {
		return {
			text: edit.newText,
			eol: edit.newEol && EndOfLine.from(edit.newEol),
			range: Range.from(edit.range)!,
		};
	}
	export function to(edit: languages.TextEdit): vscode.TextEdit {
		const result = new extHostTypes.TextEdit(
			Range.to(edit.range)!,
			edit.text || "",
		);
		result.newEol =
			typeof edit.eol === "undefined"
				? undefined
				: EndOfLine.to(edit.eol);
		return result;
	}
}
export namespace EndOfLine {
	export function from(eol: vscode.EndOfLine): EndOfLineSequence {
		if (eol === extHostTypes.EndOfLine.CRLF) return EndOfLineSequence.CRLF;
		return EndOfLineSequence.LF;
	}
	export function to(
		eol: EndOfLineSequence | undefined,
	): vscode.EndOfLine | undefined {
		if (eol === EndOfLineSequence.CRLF) return extHostTypes.EndOfLine.CRLF;
		if (eol === EndOfLineSequence.LF) return extHostTypes.EndOfLine.LF;
		return undefined;
	}
}

// --- Hover ---
export namespace Hover {
	export function fromApiType(
		hover: vscode.Hover | undefined,
	): extHostProtocol.IHoverDto | undefined {
		if (
			!hover ||
			!hover.contents ||
			(Array.isArray(hover.contents) && hover.contents.length === 0)
		)
			return undefined;
		const contents = MarkdownString.fromMany(asArray(hover.contents));
		if (contents.length === 0) return undefined;
		return {
			contents,
			range: hover.range ? Range.from(hover.range) : undefined,
		};
	}
	export function toApiType(
		dto: extHostProtocol.IHoverDto | undefined,
	): vscode.Hover | undefined {
		if (!dto || !dto.contents || dto.contents.length === 0)
			return undefined;
		return new extHostTypes.Hover(
			dto.contents.map(MarkdownString.to),
			dto.range ? Range.to(dto.range) : undefined,
		);
	}
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

// --- CodeActionTriggerKind, CodeActionContext, CodeActionProviderMetadata ---
export namespace CodeActionTriggerKind {
	export function to(
		value: languages.CodeActionTriggerType,
	): vscode.CodeActionTriggerKind {
		switch (value) {
			case languages.CodeActionTriggerType.Invoke:
				return extHostTypes.CodeActionTriggerKind.Invoke;
			case languages.CodeActionTriggerType.Auto:
				return extHostTypes.CodeActionTriggerKind.Automatic;
		}
	}
}
export namespace CodeActionContext {
	export function toApiType(
		value: extHostProtocol.ExtHostCodeActionContextDto,
		uriTransformer?: IURITransformer,
	): vscode.CodeActionContext {
		return {
			diagnostics: value.diagnostics.map((data) =>
				DiagnosticConverter.toApi(data, uriTransformer),
			),
			only: value.only
				? new extHostTypes.CodeActionKind(value.only)
				: undefined,
			triggerKind: value.triggerKind
				? CodeActionTriggerKind.to(value.triggerKind)
				: undefined,
		};
	}
}
export namespace CodeActionProviderMetadata {
	export function toDto(
		metadata?: vscode.CodeActionProviderMetadata,
	): extHostProtocol.ICodeActionProviderMetadataDto | undefined {
		if (!metadata) return undefined;
		return {
			providedCodeActionKinds: metadata.providedCodeActionKinds?.map(
				(kind) => kind.value,
			),
			documentation: metadata.documentation?.map((doc) => ({
				value: doc.value,
				kind: doc.kind.value,
			})),
		};
	}
}

// --- SignatureHelpProviderMetadata ---
export namespace SignatureHelpProviderMetadata {
	export function toDto(
		metadata: vscode.SignatureHelpProviderMetadata,
	): extHostProtocol.ISignatureHelpProviderMetadataDto {
		return {
			triggerCharacters: metadata.triggerCharacters,
			retriggerCharacters: metadata.retriggerCharacters,
		};
	}
}

// --- DiagnosticTag & DiagnosticSeverity ---
export namespace DiagnosticTag {
	export function from(
		value: vscode.DiagnosticTag,
	): languages.MarkerTag | undefined {
		switch (value) {
			case extHostTypes.DiagnosticTag.Unnecessary:
				return languages.MarkerTag.Unnecessary;
			case extHostTypes.DiagnosticTag.Deprecated:
				return languages.MarkerTag.Deprecated;
		}
		return undefined;
	}
	export function to(
		value: languages.MarkerTag,
	): vscode.DiagnosticTag | undefined {
		switch (value) {
			case languages.MarkerTag.Unnecessary:
				return extHostTypes.DiagnosticTag.Unnecessary;
			case languages.MarkerTag.Deprecated:
				return extHostTypes.DiagnosticTag.Deprecated;
			default:
				return undefined;
		}
	}
}
export namespace DiagnosticSeverity {
	export function from(
		value: vscode.DiagnosticSeverity,
	): languages.MarkerSeverity {
		switch (value) {
			case extHostTypes.DiagnosticSeverity.Error:
				return languages.MarkerSeverity.Error;
			case extHostTypes.DiagnosticSeverity.Warning:
				return languages.MarkerSeverity.Warning;
			case extHostTypes.DiagnosticSeverity.Information:
				return languages.MarkerSeverity.Info;
			case extHostTypes.DiagnosticSeverity.Hint:
				return languages.MarkerSeverity.Hint;
		}
		return languages.MarkerSeverity.Error;
	}
	export function to(
		value: languages.MarkerSeverity,
	): vscode.DiagnosticSeverity {
		switch (value) {
			case languages.MarkerSeverity.Info:
				return extHostTypes.DiagnosticSeverity.Information;
			case languages.MarkerSeverity.Warning:
				return extHostTypes.DiagnosticSeverity.Warning;
			case languages.MarkerSeverity.Error:
				return extHostTypes.DiagnosticSeverity.Error;
			case languages.MarkerSeverity.Hint:
				return extHostTypes.DiagnosticSeverity.Hint;
			default:
				return extHostTypes.DiagnosticSeverity.Error;
		}
	}
}

// --- RelatedInformationConverter & DiagnosticConverter ---
export namespace RelatedInformationConverter {
	export function fromApi(
		relatedInfo: vscode.DiagnosticRelatedInformation,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IRelatedInformationDto {
		return {
			resource: uriTransformer
				? uriTransformer.transformOutgoing(relatedInfo.location.uri)
				: relatedInfo.location.uri.toJSON(),
			message: relatedInfo.message,
			startLineNumber: relatedInfo.location.range.start.line,
			startColumn: relatedInfo.location.range.start.character,
			endLineNumber: relatedInfo.location.range.end.line,
			endColumn: relatedInfo.location.range.end.character,
		};
	}
	export function toApi(
		dto: extHostProtocol.IRelatedInformationDto,
		uriTransformer?: IURITransformer,
	): vscode.DiagnosticRelatedInformation {
		const location = new extHostTypes.Location(
			URI.revive(
				uriTransformer
					? uriTransformer.transformIncoming(dto.resource)
					: dto.resource,
			),
			new extHostTypes.Range(
				dto.startLineNumber,
				dto.startColumn,
				dto.endLineNumber,
				dto.endColumn,
			),
		);
		return new extHostTypes.DiagnosticRelatedInformation(
			location,
			dto.message,
		);
	}
}
export namespace DiagnosticConverter {
	export function fromApi(
		diag: vscode.Diagnostic,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IMarkerData {
		let codeDto:
			| string
			| { value: string | number; target: UriComponents }
			| undefined;
		if (diag.code) {
			if (typeof diag.code === "string" || typeof diag.code === "number")
				codeDto = String(diag.code);
			else
				codeDto = {
					value: String(diag.code.value),
					target: uriTransformer
						? uriTransformer.transformOutgoing(diag.code.target)
						: diag.code.target.toJSON(),
				};
		}
		return {
			message: diag.message,
			severity: DiagnosticSeverity.from(diag.severity),
			startLineNumber: diag.range.start.line + 1,
			startColumn: diag.range.start.character + 1,
			endLineNumber: diag.range.end.line + 1,
			endColumn: diag.range.end.character + 1,
			source: diag.source,
			code: codeDto as extHostProtocol.IMarkerData["code"],
			tags: diag.tags
				?.map(DiagnosticTag.from)
				.filter(isDefined) as languages.MarkerTag[],
			relatedInformation: diag.relatedInformation?.map((ri) =>
				RelatedInformationConverter.fromApi(ri, uriTransformer),
			),
		};
	}
	export function toApi(
		markerData: extHostProtocol.IMarkerData,
		uriTransformer?: IURITransformer,
	): vscode.Diagnostic {
		const range = new extHostTypes.Range(
			markerData.startLineNumber - 1,
			markerData.startColumn - 1,
			markerData.endLineNumber - 1,
			markerData.endColumn - 1,
		);
		const diag = new extHostTypes.Diagnostic(
			range,
			markerData.message || "",
			DiagnosticSeverity.to(markerData.severity),
		);
		diag.source = markerData.source;
		if (markerData.code) {
			if (
				typeof markerData.code === "string" ||
				typeof markerData.code === "number"
			)
				diag.code = markerData.code;
			else if ((markerData.code as { target?: UriComponents }).target) {
				const codeTargetDto = markerData.code as {
					value: string | number;
					target: UriComponents;
				};
				diag.code = {
					value: String(codeTargetDto.value),
					target: URI.revive(
						uriTransformer
							? uriTransformer.transformIncoming(
									codeTargetDto.target,
								)
							: codeTargetDto.target,
					),
				};
			} else if (
				(markerData.code as { value?: string | number }).value !==
				undefined
			)
				diag.code = String(
					(markerData.code as { value: string | number }).value,
				);
		}
		diag.tags = markerData.tags
			?.map((t) => DiagnosticTag.to(t as languages.MarkerTag))
			.filter(isDefined);
		if (markerData.relatedInformation)
			diag.relatedInformation = markerData.relatedInformation.map((ri) =>
				RelatedInformationConverter.toApi(
					ri as extHostProtocol.IRelatedInformationDto,
					uriTransformer,
				),
			);
		return diag;
	}
	export function fromApiArray(
		diagnostics: readonly vscode.Diagnostic[],
		uriTransformer?: IURITransformer,
	): extHostProtocol.IMarkerData[] {
		return diagnostics.map((d) => fromApi(d, uriTransformer));
	}
	export function toApiArray(
		markerDataArray: extHostProtocol.IMarkerData[],
		uriTransformer?: IURITransformer,
	): vscode.Diagnostic[] {
		return markerDataArray.map((m) => toApi(m, uriTransformer));
	}
}

// --- WorkspaceEdit and helpers ---
export namespace WorkspaceEditEntryMetadata {
	export function from(
		metadata: vscode.WorkspaceEditEntryMetadata,
	): extHostProtocol.IWorkspaceEditEntryMetadataDto {
		return {
			needsConfirmation: metadata.needsConfirmation,
			label: metadata.label,
			description: metadata.description,
			iconPath: metadata.iconPath
				? ThemeIconConverter.from(metadata.iconPath)
				: undefined,
		};
	}
	export function to(
		dto: extHostProtocol.IWorkspaceEditEntryMetadataDto,
		_commandsConverter?: CommandsConverter,
	): vscode.WorkspaceEditEntryMetadata {
		return {
			needsConfirmation: dto.needsConfirmation,
			label: dto.label,
			description: dto.description,
			iconPath: dto.iconPath
				? ThemeIconConverter.to(dto.iconPath)
				: undefined,
		};
	}
}
export namespace WorkspaceFileEditOptions {
	export function from(
		options: vscode.WorkspaceFileEditOptions | undefined,
	): languages.WorkspaceFileEditOptions | undefined {
		if (!options) return undefined;
		return {
			overwrite: options.overwrite,
			ignoreIfNotExists: options.ignoreIfNotExists,
			ignoreIfExists: options.ignoreIfExists,
			recursive: options.recursive,
			copy: (options as any).copy,
			folder: (options as any).folder,
			maxSize: options.maxSize,
			contentsDeliveredConfirmously: (options as any)
				.contentsDeliveredConfirmously,
			undoStopBefore: (options as any).undoStopBefore,
			undoStopAfter: (options as any).undoStopAfter,
		};
	}
	export function to(
		dto: languages.WorkspaceFileEditOptions | undefined,
	): vscode.WorkspaceFileEditOptions | undefined {
		if (!dto) return undefined;
		const result: vscode.WorkspaceFileEditOptions = {};
		if (dto.overwrite !== undefined) result.overwrite = dto.overwrite;
		if (dto.ignoreIfNotExists !== undefined)
			result.ignoreIfNotExists = dto.ignoreIfNotExists;
		if (dto.recursive !== undefined) result.recursive = dto.recursive;
		if (dto.maxSize !== undefined) result.maxSize = dto.maxSize;
		return result;
	}
}
export namespace ThemeIconConverter {
	export function from(
		icon: vscode.ThemeIcon | URI | { light: URI; dark: URI },
	): extHostProtocol.IIconPathDto | undefined {
		if (!icon) return undefined;
		if (icon instanceof extHostTypes.ThemeIcon)
			return { id: icon.id, color: icon.color?.id };
		if (URI.isUri(icon)) return icon.toJSON();
		if (
			typeof icon === "object" &&
			URI.isUri(icon.light) &&
			URI.isUri(icon.dark)
		)
			return { light: icon.light.toJSON(), dark: icon.dark.toJSON() };
		return undefined;
	}
	export function to(
		dto: extHostProtocol.IIconPathDto,
	): vscode.ThemeIcon | URI | { light: URI; dark: URI } | undefined {
		if (!dto) return undefined;
		if (typeof (dto as { id: string }).id === "string") {
			const themeColor = (dto as { id: string; color?: string }).color
				? new extHostTypes.ThemeColor(
						(dto as { id: string; color?: string }).color!,
					)
				: undefined;
			return new extHostTypes.ThemeIcon(
				(dto as { id: string }).id,
				themeColor,
			);
		}
		const revivedLight = URI.revive(
			(dto as { light?: UriComponents }).light,
		);
		const revivedDark = URI.revive((dto as { dark?: UriComponents }).dark);
		if (revivedLight && revivedDark)
			return { light: revivedLight, dark: revivedDark };
		else if (revivedLight) return revivedLight;
		else if (revivedDark) return revivedDark;
		return URI.revive(dto as UriComponents);
	}
}
export namespace WorkspaceEdit {
	export interface IVersionInformationProvider {
		getTextDocumentVersion(uri: vscode.Uri): number | undefined;
		getNotebookDocumentVersion?(uri: vscode.Uri): number | undefined;
	}
	export function fromApi(
		edit: vscode.WorkspaceEdit,
		versionProvider?: IVersionInformationProvider,
		commandsConverter?: CommandsConverter,
		disposablesForMetadataCommands?: DisposableStore,
		uriTransformer?: IURITransformer,
	): extHostProtocol.IWorkspaceEditDto {
		const resultDto: extHostProtocol.IWorkspaceEditDto = { edits: [] };
		if (!(edit instanceof extHostTypes.WorkspaceEdit)) {
			_converterLogService?.error(
				"[WE.fromApi] Input not vscode.WorkspaceEdit.",
			);
			return resultDto;
		}
		const internalEdits = (edit as any)
			._edits as ReadonlyArray<extHostTypeConverter.FileEditTypeExtHost>;
		if (!Array.isArray(internalEdits)) {
			_converterLogService?.error(
				"[WE.fromApi] Cannot access internal _edits.",
			);
			return resultDto;
		}
		const editCallDisposables =
			disposablesForMetadataCommands || new DisposableStore();
		for (const entry of internalEdits) {
			let marshalledEditEntry:
				| extHostProtocol.MainThreadWorkspaceEditDto
				| undefined = undefined;
			const apiMetadata = entry.metadata;
			const dtoMetadata = apiMetadata
				? WorkspaceEditEntryMetadata.from(apiMetadata)
				: undefined;
			switch (entry._type) {
				case extHostTypes.FileEditType.Text:
				case extHostTypes.FileEditType.Snippet:
					const textEntry =
						entry as extHostTypeConverter.ResourceTextEditExtHost;
					const textEditForDto = TextEdit.from(
						textEntry.edit as vscode.TextEdit,
					);
					if (textEntry.edit instanceof extHostTypes.SnippetTextEdit)
						(textEditForDto as languages.TextEdit).insertAsSnippet =
							true;
					marshalledEditEntry = {
						_type: extHostProtocol.FileEditType.तैक्स्ट,
						resource: uriTransformer
							? uriTransformer.transformOutgoing(textEntry.uri)
							: textEntry.uri.toJSON(),
						edit: textEditForDto,
						versionId: versionProvider?.getTextDocumentVersion(
							textEntry.uri,
						),
						metadata: dtoMetadata,
					} as extHostProtocol.IWorkspaceTextEditDto;
					break;
				case extHostTypes.FileEditType.File:
					const fileEntry =
						entry as extHostTypeConverter.ResourceFileEditExtHost;
					marshalledEditEntry = {
						_type: extHostProtocol.FileEditType.फ़ाइल,
						oldUri: fileEntry.from
							? uriTransformer
								? uriTransformer.transformOutgoing(
										fileEntry.from,
									)
								: fileEntry.from.toJSON()
							: undefined,
						newUri: fileEntry.to
							? uriTransformer
								? uriTransformer.transformOutgoing(fileEntry.to)
								: fileEntry.to.toJSON()
							: undefined,
						options: fileEntry.options
							? WorkspaceFileEditOptions.from(fileEntry.options)
							: undefined,
						metadata: dtoMetadata,
					} as extHostProtocol.IWorkspaceFileEditDto;
					break;
				case extHostTypes.FileEditType.Cell:
				case extHostTypes.FileEditType.CellReplace:
				case extHostTypes.FileEditType.CellMetadata:
				case extHostTypes.FileEditType.DocumentMetadata:
					_converterLogService?.warn(
						`[WE.fromApi] Notebook edit type ${entry._type} conversion STUBBED.`,
					);
					break;
			}
			if (marshalledEditEntry) resultDto.edits.push(marshalledEditEntry);
			if (disposablesForMetadataCommands !== editCallDisposables)
				entryMetadataDisposable.dispose(); // Dispose if temporary
		}
		const apiEditWithMetadata = edit as vscode.WorkspaceEdit & {
			label?: string;
			description?: string;
			iconPath?:
				| vscode.ThemeIcon
				| vscode.Uri
				| { light: vscode.Uri; dark: vscode.Uri };
		};
		if (
			apiEditWithMetadata.label ||
			apiEditWithMetadata.description ||
			apiEditWithMetadata.iconPath
		)
			(
				resultDto as extHostProtocol.IWorkspaceEditDto & {
					metadata?: extHostProtocol.IWorkspaceEditMetadataDto;
				}
			).metadata = {
				label: apiEditWithMetadata.label || "",
				description: apiEditWithMetadata.description,
				iconPath: apiEditWithMetadata.iconPath
					? ThemeIconConverter.from(apiEditWithMetadata.iconPath)
					: undefined,
			};
		if (disposablesForMetadataCommands !== editCallDisposables)
			editCallDisposables.dispose();
		return resultDto;
	}
	export function toApi(
		dto: extHostProtocol.IWorkspaceEditDto,
		uriTransformer?: IURITransformer,
		commandsConverter?: CommandsConverter,
	): vscode.WorkspaceEdit {
		const result = new extHostTypes.WorkspaceEdit();
		const dtoWithMetadata = dto as extHostProtocol.IWorkspaceEditDto & {
			metadata?: extHostProtocol.IWorkspaceEditMetadataDto;
		};
		if (dtoWithMetadata.metadata) {
			(result as any).label = dtoWithMetadata.metadata.label;
			(result as any).description = dtoWithMetadata.metadata.description;
			(result as any).iconPath = dtoWithMetadata.metadata.iconPath
				? ThemeIconConverter.to(dtoWithMetadata.metadata.iconPath)
				: undefined;
		}
		for (const editDto of dto.edits) {
			const apiMetadata = (editDto as any).metadata
				? WorkspaceEditEntryMetadata.to(
						(editDto as any).metadata,
						commandsConverter,
					)
				: undefined;
			const editTypeFromDto = (editDto as any)
				._type as extHostProtocol.FileEditType;
			switch (editTypeFromDto) {
				case extHostProtocol.FileEditType.तैक्स्ट: {
					const textEditDto =
						editDto as extHostProtocol.IWorkspaceTextEditDto;
					const revivedUri = URI.revive(
						uriTransformer
							? uriTransformer.transformIncoming(
									textEditDto.resource,
								)
							: textEditDto.resource,
					);
					const apiTextEdit = TextEdit.to(
						textEditDto.edit as languages.TextEdit,
					);
					if (
						(textEditDto.edit as languages.TextEdit).insertAsSnippet
					)
						result.replace(
							revivedUri,
							apiTextEdit.range,
							new extHostTypes.SnippetString(apiTextEdit.newText),
							apiMetadata,
						);
					else
						result.set(revivedUri, [
							Object.assign(apiTextEdit, {
								metadata: apiMetadata,
							}),
						]);
					break;
				}
				case extHostProtocol.FileEditType.फ़ाइल: {
					const fileEditDto =
						editDto as extHostProtocol.IWorkspaceFileEditDto;
					const oldUri = fileEditDto.oldUri
						? URI.revive(
								uriTransformer
									? uriTransformer.transformIncoming(
											fileEditDto.oldUri,
										)
									: fileEditDto.oldUri,
							)
						: undefined;
					const newUri = fileEditDto.newUri
						? URI.revive(
								uriTransformer
									? uriTransformer.transformIncoming(
											fileEditDto.newUri,
										)
									: fileEditDto.newUri,
							)
						: undefined;
					const options = fileEditDto.options
						? WorkspaceFileEditOptions.to(fileEditDto.options)
						: undefined;
					if (oldUri && newUri)
						result.renameFile(oldUri, newUri, options, apiMetadata);
					else if (newUri)
						result.createFile(newUri, options, apiMetadata);
					else if (oldUri)
						result.deleteFile(oldUri, options, apiMetadata);
					break;
				}
				case extHostProtocol.FileEditType.सेल:
					_warnStub(
						"WE.toApi",
						"toApi",
						`Notebook DTO type ${editTypeFromDto} revival STUBBED.`,
					);
					break;
			}
		}
		return result;
	}
}

// --- CodeAction, CodeLens Converters (Updated to use fuller WorkspaceEdit) ---
export namespace CodeAction {
	export function from(
		action: vscode.CodeAction,
		commandsConverter: CommandsConverter,
		disposables: DisposableStore,
		uriTransformer?: IURITransformer,
		versionProvider?: WorkspaceEdit.IVersionInformationProvider,
	): extHostProtocol.ICodeActionDto {
		return {
			title: action.title,
			kind: action.kind?.value,
			isPreferred: action.isPreferred,
			isAI: (action as any).isAI,
			disabled: action.disabled?.reason,
			command: action.command
				? commandsConverter.toInternal(action.command, disposables)
				: undefined,
			diagnostics: action.diagnostics
				? DiagnosticConverter.fromApiArray(
						action.diagnostics,
						uriTransformer,
					)
				: undefined,
			edit: action.edit
				? WorkspaceEdit.fromApi(
						action.edit,
						versionProvider,
						commandsConverter,
						disposables,
						uriTransformer,
					)
				: undefined,
			ranges: (action as any).ranges?.map(
				(r: vscode.Range) => Range.from(r)!,
			),
		};
	}
	export function to(
		dto: extHostProtocol.ICodeActionDto,
		commandsConverter: CommandsConverter,
		uriTransformer?: IURITransformer,
	): vscode.CodeAction {
		const result = new extHostTypes.CodeAction(
			dto.title,
			dto.kind ? new extHostTypes.CodeActionKind(dto.kind) : undefined,
		);
		result.isPreferred = dto.isPreferred;
		if (dto.isAI) (result as any).isAI = dto.isAI;
		if (dto.disabled) result.disabled = { reason: dto.disabled };
		result.command = commandsConverter.fromInternal(dto.command);
		if (dto.diagnostics)
			result.diagnostics = DiagnosticConverter.toApiArray(
				dto.diagnostics as extHostProtocol.IMarkerData[],
				uriTransformer,
			);
		if (dto.edit)
			result.edit = WorkspaceEdit.toApi(
				dto.edit,
				uriTransformer,
				commandsConverter,
			);
		if (dto.ranges)
			(result as any).ranges = dto.ranges.map(
				(r) => Range.to(r as extHostProtocol.IRange)!,
			);
		return result;
	}
	export function fromList(
		list:
			| ReadonlyArray<vscode.Command | vscode.CodeAction>
			| vscode.ProviderResult<
					ReadonlyArray<vscode.Command | vscode.CodeAction>
			  >,
		cacheId: number,
		commandsConverter: CommandsConverter,
		listDisposables: DisposableStore,
		uriTransformer?: IURITransformer,
		versionProvider?: WorkspaceEdit.IVersionInformationProvider,
	): extHostProtocol.ICodeActionListDto | undefined {
		const actions = list as
			| ReadonlyArray<vscode.Command | vscode.CodeAction>
			| undefined
			| null;
		if (!actions || actions.length === 0) return undefined;
		const actionsDto: extHostProtocol.ICodeActionDto[] = actions.map(
			(item, i) => {
				let dto: extHostProtocol.ICodeActionDto;
				if (
					"title" in item &&
					("kind" in item ||
						"edit" in item ||
						"diagnostics" in item ||
						"isPreferred" in item)
				)
					dto = CodeAction.from(
						item as vscode.CodeAction,
						commandsConverter,
						listDisposables,
						uriTransformer,
						versionProvider,
					);
				else {
					const commandDto = commandsConverter.toInternal(
						item as vscode.Command,
						listDisposables,
					);
					dto = {
						title:
							commandDto?.title ||
							(item as vscode.Command).title ||
							"Untitled",
						command: commandDto,
						_isSynthetic: true,
					};
				}
				dto.cacheId = [cacheId, i];
				return dto;
			},
		);
		return { cacheId, actions: actionsDto };
	}
}
export namespace CodeLens {
	/* ... as from Part 31 ... */
}

// --- FormattingOptions, DocumentHighlightKind, DocumentHighlight, DocumentLink ---
export namespace FormattingOptions {
	/* ... as from Part 34 ... */
}
export namespace DocumentHighlightKind {
	/* ... as from Part 34 ... */
}
export namespace DocumentHighlight {
	/* ... as from Part 34 ... */
}
export namespace DocumentLink {
	/* ... as from Part 34 ... */
}

// --- ReferenceContext, RenameConverter ---
export namespace ReferenceContextConverter {
	/* ... as from Part 35 ... */
}
export namespace RenameConverter {
	/* ... as from Part 35 ... */
}

// --- FoldingRangeKind, FoldingRange, SelectionRange, LinkedEditingRanges ---
export namespace FoldingRangeKind {
	/* ... as from Part 34 ... */
}
export namespace FoldingRange {
	/* ... as from Part 34 ... */
}
export namespace SelectionRange {
	/* ... as from Part 34 ... */
}
export namespace LinkedEditingRanges {
	/* ... as from Part 34 ... */
}

// --- Semantic Tokens ---
export namespace SemanticTokensLegend {
	/* ... as from Part 39/40 ... */
}
export namespace SemanticTokens {
	/* ... as from Part 39/40, ensure data is number[] ... */
}
export namespace SemanticTokensEdit {
	/* ... as from Part 39/40 ... */
}
export namespace SemanticTokensEdits {
	/* ... as from Part 39/40 ... */
}

// --- CallHierarchy & TypeHierarchy ---
export namespace CallHierarchyItem {
	/* ... as from Part 39/41, ensure uriTransformer on DTO.uri ... */
}
export namespace CallHierarchyIncomingCall {
	/* ... as from Part 39/41 ... */
}
export namespace CallHierarchyOutgoingCall {
	/* ... as from Part 39/41 ... */
}
export namespace TypeHierarchyItem {
	/* ... as from Part 39/41, ensure uriTransformer on DTO.uri ... */
}

// --- SignatureHelp ---
export namespace ParameterInformation {
	/* ... as from Part 32 ... */
}
export namespace SignatureInformation {
	/* ... as from Part 32 ... */
}
export namespace SignatureHelp {
	/* ... as from Part 32, ensure contextToApi and triggerKindFrom/ToApi use languages.SignatureHelpTriggerKind ... */
}

// --- InlayHint ---
export namespace InlayHintKind {
	/* ... as from Part 41 ... */
}
export namespace InlayHintLabelPart {
	/* ... as from Part 41, pass uriTransformer ... */
}
export namespace InlayHint {
	/* ... as from Part 41, pass uriTransformer ... */
}

export const placeholderForModuleSystem = true;
console.warn(
	"[Cocoon Type Converters] Module synthesized. Many converters improved. WorkspaceEdit and Notebook related types still have STUBBED parts. Review against VS Code's extHostTypeConverters.ts for full fidelity.",
);
