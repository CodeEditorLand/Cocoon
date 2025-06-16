/*
 * File: Cocoon/Source/Type/ExtHostTypes.ts
 * Responsibility:
 * Modified: 2025-06-16 14:42:15 UTC
 * Dependency: vs/base/common/cancellation.js, vs/base/common/errors.js, vs/base/common/event.js, vs/base/common/lifecycle.js, vs/base/common/uri.js, vs/platform/files/common/files.js, vscode
 * Export: CancellationError, CancellationTokenSource, CompletionItem, CompletionItemKind, CompletionItemTag, ConfigurationTarget, Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, DiagnosticTag, Disposable, EndOfLine, EventEmitter, FileType, Location, MarkdownString, Position, ProcessExecution, ProgressLocation, QuickPickItemKind, Range, Selection, ShellExecution, SnippetString, StatusBarAlignment, Task, TextEdit, TextEditorCursorStyle, ThemeColor, ThemeIcon, TreeItem, URI, ViewColumn, WorkspaceEdit
 */

/**
 * @module ExtHostTypes
 * @description Provides the concrete implementations of the core `vscode` API types,
 * such as `URI`, `Range`, `Position`, `Disposable`, and all enums.
 * Synthesized from `vscode.d.ts` and VS Code's internal `extHostTypes.ts`.
 */

import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import { CancellationError as VscCancellationError } from "vs/base/common/errors.js";
import { Emitter } from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI as VscURI } from "vs/base/common/uri.js";
import { FileType as VscFileType } from "vs/platform/files/common/files.js";
import type * as VSCode from "vscode";
import {
	CompletionItemKind,
	CompletionItemTag,
	ConfigurationTarget,
	DiagnosticSeverity,
	DiagnosticTag,
	EndOfLine,
	ProgressLocation,
	QuickPickItemKind,
	SnippetString,
	StatusBarAlignment,
	TextEditorCursorStyle,
	ViewColumn,
} from "vscode";

// --- Foundational Re-exports ---
export const Disposable = Lifecycle.Disposable;
export const CancellationTokenSource = VscCancellationTokenSource;
export const CancellationError = VscCancellationError;
export const EventEmitter = Emitter;
export const URI = VscURI;

// --- Core Classes ---

export class Position implements VSCode.Position {
	readonly line: number;
	readonly character: number;

	constructor(line: number, character: number) {
		if (line < 0) {
			throw new Error("Illegal argument: line must be non-negative");
		}
		if (character < 0) {
			throw new Error("Illegal argument: character must be non-negative");
		}
		this.line = line;
		this.character = character;
	}

	isBefore(other: VSCode.Position): boolean {
		return (
			this.line < other.line ||
			(this.line === other.line && this.character < other.character)
		);
	}

	isBeforeOrEqual(other: VSCode.Position): boolean {
		return (
			this.line < other.line ||
			(this.line === other.line && this.character <= other.character)
		);
	}

	isAfter(other: VSCode.Position): boolean {
		return !this.isBeforeOrEqual(other);
	}

	isAfterOrEqual(other: VSCode.Position): boolean {
		return !this.isBefore(other);
	}

	isEqual(other: VSCode.Position): boolean {
		return this.line === other.line && this.character === other.character;
	}

	compareTo(other: VSCode.Position): number {
		if (this.line < other.line) {
			return -1;
		}
		if (this.line > other.line) {
			return 1;
		}
		if (this.character < other.character) {
			return -1;
		}
		if (this.character > other.character) {
			return 1;
		}
		return 0;
	}

	translate(lineDelta?: number, characterDelta?: number): VSCode.Position;
	translate(change: {
		lineDelta?: number;
		characterDelta?: number;
	}): VSCode.Position;
	translate(
		lineDeltaOrChange:
			| number
			| { lineDelta?: number; characterDelta?: number }
			| undefined,
		characterDelta = 0,
	): VSCode.Position {
		if (lineDeltaOrChange === null || lineDeltaOrChange === undefined) {
			return this;
		}
		if (typeof lineDeltaOrChange === "number") {
			return new Position(
				this.line + lineDeltaOrChange,
				this.character + characterDelta,
			);
		}
		return new Position(
			this.line + (lineDeltaOrChange.lineDelta ?? 0),
			this.character + (lineDeltaOrChange.characterDelta ?? 0),
		);
	}

	with(line?: number, character?: number): VSCode.Position;
	with(change: { line?: number; character?: number }): VSCode.Position;
	with(
		lineOrChange:
			| number
			| { line?: number; character?: number }
			| undefined,
		character: number = this.character,
	): VSCode.Position {
		if (lineOrChange === null || lineOrChange === undefined) {
			return this;
		}
		if (typeof lineOrChange === "number") {
			return new Position(lineOrChange, character);
		}
		return new Position(
			lineOrChange.line ?? this.line,
			lineOrChange.character ?? this.character,
		);
	}

	toJSON(): any {
		return { line: this.line, character: this.character };
	}
}

export class Range implements VSCode.Range {
	readonly start: Position;
	readonly end: Position;

	constructor(start: Position, end: Position);
	constructor(
		startLine: number,
		startCharacter: number,
		endLine: number,
		endCharacter: number,
	);
	constructor(
		startLineOrPosition: number | Position,
		startCharacterOrPosition: number | Position,
		endLine?: number,
		endCharacter?: number,
	) {
		let start: Position;
		let end: Position;

		if (
			typeof startLineOrPosition === "number" &&
			typeof startCharacterOrPosition === "number" &&
			typeof endLine === "number" &&
			typeof endCharacter === "number"
		) {
			start = new Position(startLineOrPosition, startCharacterOrPosition);
			end = new Position(endLine, endCharacter);
		} else if (
			startLineOrPosition instanceof Position &&
			startCharacterOrPosition instanceof Position
		) {
			start = startLineOrPosition;
			end = startCharacterOrPosition;
		} else {
			throw new Error("Invalid arguments");
		}

		if (start.isAfter(end)) {
			this.start = end;
			this.end = start;
		} else {
			this.start = start;
			this.end = end;
		}
	}

	get isEmpty(): boolean {
		return this.start.isEqual(this.end);
	}

	get isSingleLine(): boolean {
		return this.start.line === this.end.line;
	}

	contains(positionOrRange: Position | Range): boolean {
		if (positionOrRange instanceof Range) {
			return (
				this.contains(positionOrRange.start) &&
				this.contains(positionOrRange.end)
			);
		}
		return (
			positionOrRange.isAfterOrEqual(this.start) &&
			positionOrRange.isBeforeOrEqual(this.end)
		);
	}

	isEqual(other: Range): boolean {
		return this.start.isEqual(other.start) && this.end.isEqual(other.end);
	}

	intersection(other: Range): Range | undefined {
		const start = this.start.isAfter(other.start)
			? this.start
			: other.start;
		const end = this.end.isBefore(other.end) ? this.end : other.end;

		if (start.isAfter(end)) {
			return undefined;
		}
		return new Range(start, end);
	}

	union(other: Range): Range {
		const start = this.start.isBefore(other.start)
			? this.start
			: other.start;
		const end = this.end.isAfter(other.end) ? this.end : other.end;
		return new Range(start, end);
	}

	with(start?: Position, end?: Position): Range;
	with(change: { start?: Position; end?: Position }): Range;
	with(
		startOrChange:
			| Position
			| { start?: Position; end?: Position }
			| undefined,
		end: Position = this.end,
	): Range {
		if (startOrChange === null || startOrChange === undefined) {
			return this;
		}
		if (startOrChange instanceof Position) {
			return new Range(startOrChange, end);
		}
		return new Range(
			startOrChange.start ?? this.start,
			startOrChange.end ?? this.end,
		);
	}

	toJSON(): any {
		return [this.start.toJSON(), this.end.toJSON()];
	}
}

export class Selection extends Range implements VSCode.Selection {
	readonly anchor: Position;
	readonly active: Position;

	constructor(anchor: Position, active: Position) {
		super(anchor, active);
		this.anchor = anchor;
		this.active = active;
	}

	get isReversed(): boolean {
		return this.active.isBefore(this.anchor);
	}

	override toJSON(): any {
		return {
			start: this.start.toJSON(),
			end: this.end.toJSON(),
			active: this.active.toJSON(),
			anchor: this.anchor.toJSON(),
		};
	}
}

export class Location implements VSCode.Location {
	constructor(
		public uri: VSCode.Uri,
		public range: Range,
	) {}

	toJSON(): any {
		return {
			uri: this.uri,
			range: this.range.toJSON(),
		};
	}
}

export class Diagnostic implements VSCode.Diagnostic {
	range: Range;
	message: string;
	severity: VSCode.DiagnosticSeverity;
	source?: string;
	code?: string | number | { value: string | number; target: VSCode.Uri };
	relatedInformation?: VSCode.DiagnosticRelatedInformation[];
	tags?: VSCode.DiagnosticTag[];

	constructor(
		range: Range,
		message: string,
		severity: VSCode.DiagnosticSeverity = DiagnosticSeverity.Error,
	) {
		this.range = range;
		this.message = message;
		this.severity = severity;
	}

	toJSON(): any {
		return {
			message: this.message,
			severity: DiagnosticSeverity[this.severity],
			range: this.range.toJSON(),
		};
	}
}

export class DiagnosticRelatedInformation
	implements VSCode.DiagnosticRelatedInformation
{
	constructor(
		public location: Location,
		public message: string,
	) {}
}

function isTreeItemLabel(thing: any): thing is VSCode.TreeItemLabel {
	return (
		thing &&
		typeof thing === "object" &&
		typeof (thing as VSCode.TreeItemLabel).label === "string"
	);
}

export class TreeItem implements VSCode.TreeItem {
	label?: string | VSCode.TreeItemLabel;
	resourceURI?: VSCode.Uri;
	collapsibleState?: VSCode.TreeItemCollapsibleState;
	id?: string;
	description?: string;
	command?: VSCode.Command;

	constructor(
		labelOrUri: string | VSCode.Uri | VSCode.TreeItemLabel,
		collapsibleState?: VSCode.TreeItemCollapsibleState,
	) {
		if (typeof labelOrUri === "string" || isTreeItemLabel(labelOrUri)) {
			this.label = labelOrUri;
		} else {
			this.resourceURI = labelOrUri;
		}
		this.collapsibleState = collapsibleState;
	}
}

export class MarkdownString implements VSCode.MarkdownString {
	value: string;
	isTrusted?: boolean;
	supportThemeIcons?: boolean;
	supportHtml?: boolean;
	baseUri?: VSCode.Uri;
	constructor(value = "", isTrusted = false) {
		this.value = value;
		this.isTrusted = isTrusted;
	}

	appendText(value: string): MarkdownString {
		this.value += value;
		return this;
	}
	appendMarkdown(value: string): MarkdownString {
		this.value += value;
		return this;
	}

	appendCodeblock(value: string, language = ""): MarkdownString {
		this.value += `\n\`\`\`${language}\n${value}\n\`\`\`\n`;
		return this;
	}

	toJSON(): any {
		return {
			value: this.value,
			isTrusted: this.isTrusted,
		};
	}
}

export class ThemeColor implements VSCode.ThemeColor {
	constructor(public id: string) {}
}

export class ThemeIcon implements VSCode.ThemeIcon {
	static readonly File = new ThemeIcon("file");
	static readonly Folder = new ThemeIcon("folder");
	constructor(
		public id: string,
		public color?: ThemeColor,
	) {}
}

export class TextEdit implements VSCode.TextEdit {
	constructor(
		public range: Range,
		public newText: string,
	) {}

	static replace(range: Range, newText: string): TextEdit {
		return new TextEdit(range, newText);
	}
	static insert(position: Position, newText: string): TextEdit {
		return TextEdit.replace(new Range(position, position), newText);
	}
	static delete(range: Range): TextEdit {
		return TextEdit.replace(range, "");
	}
	static setEndOfLine(eol: VSCode.EndOfLine): TextEdit {
		const r = new TextEdit(
			new Range(new Position(0, 0), new Position(0, 0)),
			"",
		);
		r.newEol = eol;
		return r;
	}
	newEol: VSCode.EndOfLine | undefined;
}

export class CompletionItem implements VSCode.CompletionItem {
	label: string | VSCode.CompletionItemLabel;
	kind?: VSCode.CompletionItemKind;
	tags?: readonly VSCode.CompletionItemTag[];
	detail?: string;
	documentation?: string | VSCode.MarkdownString;
	sortText?: string;
	filterText?: string;
	preselect?: boolean;
	insertText?: string | VSCode.SnippetString;
	range?: VSCode.Range | { inserting: VSCode.Range; replacing: VSCode.Range };
	commitCharacters?: string[];
	additionalTextEdits?: VSCode.TextEdit[];
	command?: VSCode.Command;

	constructor(
		label: string | VSCode.CompletionItemLabel,
		kind?: VSCode.CompletionItemKind,
	) {
		this.label = label;
		this.kind = kind;
	}
}

export class ProcessExecution implements VSCode.ProcessExecution {
	public process: string;
	public args: string[];
	public options?: VSCode.ProcessExecutionOptions;

	constructor(
		process: string,
		args: string[],
		options?: VSCode.ProcessExecutionOptions,
	) {
		this.process = process;
		this.args = args;
		this.options = options;
	}
}

export class ShellExecution implements VSCode.ShellExecution {
	public commandLine: string;
	public options?: VSCode.ShellExecutionOptions;
	constructor(commandLine: string, options?: VSCode.ShellExecutionOptions) {
		this.commandLine = commandLine;
		this.options = options;
	}
	command: string | VSCode.ShellQuotedString | undefined;
	args: (string | VSCode.ShellQuotedString)[] | undefined;
}

export class Task implements VSCode.Task {
	public definition: VSCode.TaskDefinition;
	public scope:
		| VSCode.TaskScope.Global
		| VSCode.TaskScope.Workspace
		| VSCode.WorkspaceFolder;
	public name: string;
	public source: string;
	public execution?:
		| VSCode.ProcessExecution
		| VSCode.ShellExecution
		| VSCode.CustomExecution;
	public problemMatchers: string[];
	public isBackground: boolean;
	public presentationOptions: VSCode.TaskPresentationOptions;
	public group?: VSCode.TaskGroup;
	public runOptions: VSCode.RunOptions;

	constructor(
		definition: VSCode.TaskDefinition,
		scope:
			| VSCode.TaskScope.Global
			| VSCode.TaskScope.Workspace
			| VSCode.WorkspaceFolder,
		name: string,
		source: string,
		execution?:
			| VSCode.ProcessExecution
			| VSCode.ShellExecution
			| VSCode.CustomExecution,
		problemMatchers?: string[],
	) {
		this.definition = definition;
		this.scope = scope;
		this.name = name;
		this.source = source;
		this.execution = execution;
		this.problemMatchers = problemMatchers ?? [];
		this.isBackground = false;
		this.presentationOptions = {};
		this.runOptions = {};
	}
}

export class WorkspaceEdit implements VSCode.WorkspaceEdit {
	private readonly _edits = new Map<string, VSCode.TextEdit[]>();

	public set(
		uri: VSCode.Uri,
		edits: readonly (VSCode.TextEdit | any)[] | undefined,
	): void {
		this._edits.set(uri.toString(), edits ? [...edits] : []);
	}

	public entries(): [VSCode.Uri, VSCode.TextEdit[]][] {
		return Array.from(this._edits.entries()).map(([uri, edits]) => [
			URI.parse(uri),
			edits,
		]);
	}

	public get(uri: VSCode.Uri): VSCode.TextEdit[] {
		return this._edits.get(uri.toString()) ?? [];
	}

	public has(uri: VSCode.Uri): boolean {
		return this._edits.has(uri.toString());
	}

	public get size(): number {
		return this._edits.size;
	}

	public renameFile(
		_oldUri: VSCode.Uri,
		_newUri: VSCode.Uri,
		_options?: {
			readonly overwrite?: boolean;
			readonly ignoreIfExists?: boolean;
		},
	): void {
		// Not implemented in shim
	}

	public createFile(
		_uri: VSCode.Uri,
		_options?: {
			readonly overwrite?: boolean;
			readonly ignoreIfExists?: boolean;
		},
	): void {
		// Not implemented in shim
	}

	public deleteFile(
		_uri: VSCode.Uri,
		_options?: {
			readonly recursive?: boolean;
			readonly ignoreIfNotExists?: boolean;
		},
	): void {
		// Not implemented in shim
	}

	public replace(
		_uri: VSCode.Uri,
		_range: VSCode.Range,
		_newText: string,
	): void {
		// Not implemented in shim
	}

	public insert(
		_uri: VSCode.Uri,
		_position: VSCode.Position,
		_newText: string,
	): void {
		// Not implemented in shim
	}

	public delete(_uri: VSCode.Uri, _range: VSCode.Range): void {
		// Not implemented in shim
	}
}

export {
	ViewColumn,
	StatusBarAlignment,
	TextEditorCursorStyle,
	DiagnosticTag,
	ConfigurationTarget,
	EndOfLine,
	ProgressLocation,
	QuickPickItemKind,
	CompletionItemKind,
	SnippetString,
	CompletionItemTag,
	DiagnosticSeverity,
};

export const FileType = VscFileType;
