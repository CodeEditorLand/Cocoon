/*
 * File: Cocoon/Source/TypeConverter/Main.ts
 * Responsibility: Implements type conversion between VS Code API types and Land's internal types, enabling seamless communication between contributed VS Code extensions and the native Land components.
 * Modified: 2025-06-07 00:57:32 UTC
 * Dependency: vs/base/common/arrays, vs/base/common/htmlContent, vs/base/common/lifecycle, vs/base/common/uri, vs/base/common/uriIpc, vs/base/common/uuid, vs/editor/common/model, vs/platform/log/common/log, vs/workbench/api/common/extHost.protocol, vs/workbench/api/common/extHostTypes, vscode
 * Export: CommandsConverter, from, fromApiArray, fromApiType, fromMany, fromStrict, initializeConverterLogger, to, toApiType
 */

/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters - Main
 * --------------------------------------------------------------------------------------------
 * Contains the CommandsConverter, basic geometric types, common content types,
 * and other foundational converters.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArray } from "vs/base/common/arrays";
import * as htmlContent from "vs/base/common/htmlContent";
import { DisposableStore, type IDisposable } from "vs/base/common/lifecycle";
import { isUriComponents, URI, type UriComponents } from "vs/base/common/uri";
import { IURITransformer } from "vs/base/common/uriIpc";
import { generateUuid } from "vs/base/common/uuid";
import { EndOfLineSequence } from "vs/editor/common/model";
import { ILogService } from "vs/platform/log/common/log";
import * as extHostProtocol from "vs/workbench/api/common/extHost.protocol";
import * as extHostTypes from "vs/workbench/api/common/extHostTypes";
import type * as vscode from "vscode";

import type {
	ApiCommand,
	ExtHostCommands as CocoonExtHostCommands,
} from "../Shim/Commands";
import {
	Command as VscodeCommandCtor,
	Disposable as VscodeDisposableFromApi,
} from "../Shim/vscode";

// Logger and helpers
let _converterLogService: ILogService | undefined;

export function initializeConverterLogger(logger?: ILogService): void {
	_converterLogService = logger;
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
	private _cacheIdPool = 0;

	constructor(
		private readonly _commandsImpl: CocoonExtHostCommands,
		private readonly _logService?: ILogService,
		private readonly _lookupApiCommand?: (
			id: string,
		) => ApiCommand | undefined,
		public readonly _uriTransformer?: IURITransformer | null,
	) {
		this.delegatingCommandId = `_cocoon.executeContributedCommandWithCachedArgument.${generateUuid()}`;
		this._logService?.trace(
			`[CommandsConverter] Delegating command ID: ${this.delegatingCommandId}`,
		);

		this._commandsImpl.registerCommand(
			true,
			this.delegatingCommandId,
			async (ident: string, ...restArgumentFromMainThread: any[]) => {
				const command = this._cache.get(ident);
				if (!command) {
					throw new Error(
						`Unknown $ident for cached command: ${ident}`,
					);
				}
				this._logService?.trace(
					`[CC] Executing delegated (via $ident '${ident}'): '${command.command}'`,
				);
				return this._commandsImpl.executeCommand(
					command.command,
					...(command.arguments || []),
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
				return cachedCommand;
			}
		}
		const Ctor = VscodeCommandCtor as any;
		const result = new Ctor(commandDto.id, commandDto.title);
		result.tooltip = commandDto.tooltip;
		if (commandDto.arguments) {
			result.arguments = (
				this._commandsImpl as any
			)._reviveArgumentFromRpc(commandDto.arguments, this);
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
			result.id = apiCommand.internalId;
			result.arguments = apiCommand.args.map((argDef, i) => {
				const apiArg = command.arguments && command.arguments[i];
				if (!argDef.validate(apiArg)) {
					this._logService?.warn(
						`[CC] API Command '${apiCommand.id}': Arg '${argDef.name}' (idx ${i}) failed validation.`,
					);
				}
				return argDef.convert(
					apiArg,
					this._uriTransformer || undefined,
				);
			});
		} else if (isNonEmptyArray(command.arguments)) {
			const needsCaching = command.arguments.some(
				(arg) =>
					typeof arg === "function" ||
					arg instanceof VscodeDisposableFromApi,
			);
			if (needsCaching) {
				const ident = `$ccmd${this._cacheIdPool++}`;
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
				result.arguments = (
					this._commandsImpl as any
				)._convertArgumentToInternalForRpc(
					command.arguments,
					disposables,
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

export namespace Location {
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
				return from(item as vscode.DefinitionLink, uriTransformer);
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
		return markup.map(from).filter(isDefined);
	}
	export function to(
		value: htmlContent.IMarkdownString | string,
	): vscode.MarkdownString {
		const result = new extHostTypes.MarkdownString(
			typeof value === "string" ? value : value.value,
			typeof value !== "string" ? value.supportThemeIcons : undefined,
		);
		if (typeof value !== "string") {
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
		return typeof value === "string" ? value : from(value);
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
		result.newEol = EndOfLine.to(edit.eol);
		return result;
	}
}
export namespace EndOfLine {
	export function from(eol: vscode.EndOfLine): EndOfLineSequence {
		return eol === extHostTypes.EndOfLine.CRLF
			? EndOfLineSequence.CRLF
			: EndOfLineSequence.LF;
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
		) {
			return undefined;
		}
		const contents = MarkdownString.fromMany(hover.contents);
		if (contents.length === 0) return undefined;
		return {
			contents,
			range: hover.range ? Range.from(hover.range) : undefined,
		};
	}
	export function toApiType(
		dto: extHostProtocol.IHoverDto | undefined,
	): vscode.Hover | undefined {
		if (!dto || !dto.contents || dto.contents.length === 0) {
			return undefined;
		}
		return new extHostTypes.Hover(
			dto.contents.map(MarkdownString.to),
			dto.range ? Range.to(dto.range) : undefined,
		);
	}
}
