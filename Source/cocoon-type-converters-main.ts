/*---------------------------------------------------------------------------------------------
 * Cocoon API Type Converters - Main (cocoon-type-converters-main.ts)
 * --------------------------------------------------------------------------------------------
 * Contains the CommandsConverter, basic geometric types, common content types,
 * and re-exports from other converter files.
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
import type { IPosition as VSCodeInternalIPosition } from "vs/editor/common/core/position"; // Changed to VSCodeInternalIPosition for clarity with protocol types
import type { IRange as VSCodeInternalIRange } from "vs/editor/common/core/range"; // Changed
import type { ISelection as VSCodeInternalISelection } from "vs/editor/common/core/selection"; // Changed

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

// Logger and helpers
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
		public readonly _uriTransformer?: IURITransformer | null,
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
	// Renamed to lowercase to match VS Code internal
	export function from(
		value: vscode.Location,
		uriTransformer?: IURITransformer,
	): languages.Location {
		// DTO is languages.Location
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
		// API type is vscode.LocationLink
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
				// vscode.DefinitionLink
				return DefinitionLink.from(
					item as vscode.DefinitionLink,
					uriTransformer,
				);
			} else {
				// vscode.Location
				return {
					// Convert vscode.Location to ILocationLinkDto structure
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
		// DTO is languages.TextEdit
		return {
			text: edit.newText,
			eol: edit.newEol && EndOfLine.from(edit.newEol),
			range: Range.from(edit.range)!,
		};
	}
	export function to(edit: languages.TextEdit): vscode.TextEdit {
		// DTO is languages.TextEdit
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

export const placeholderForModuleSystem = true;
console.warn(
	"[Cocoon Type Converters - Main] Initialized. Other converters are in separate files.",
);
