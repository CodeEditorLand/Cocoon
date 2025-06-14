/**
 * @module ExtHostTypes
 * @description Provides the concrete implementations of the core `vscode` API types,
 * such as `URI`, `Range`, `Position`, `Disposable`, and all enums.
 * Synthesized from `vscode.d.ts` and VS Code's internal `extHostTypes.ts`.
 */

import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import { CancellationError as VscCancellationError } from "vs/base/common/errors.js";
import * as Emitter from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI as VscURI } from "vs/base/common/uri.js";
import type {
	Uri,
	MarkdownString as VSCodeMarkdownString,
	ThemeColor as VSCodeThemeColor,
	Range as VSCodeRange,
	Position as VSCodePosition,
} from "vscode";

// --- Foundational Re-exports ---
export const Disposable = Lifecycle.Disposable;
export const CancellationTokenSource = VscCancellationTokenSource;
export const CancellationError = VscCancellationError;
export const EventEmitter = Emitter.Emitter;
export const URI = VscURI;

// --- Core Classes ---

export class Position {
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

	isBefore(other: Position): boolean {
		return (
			this.line < other.line ||
			(this.line === other.line && this.character < other.character)
		);
	}

	isBeforeOrEqual(other: Position): boolean {
		return (
			this.line < other.line ||
			(this.line === other.line && this.character <= other.character)
		);
	}

	isAfter(other: Position): boolean {
		return !this.isBeforeOrEqual(other);
	}

	isAfterOrEqual(other: Position): boolean {
		return !this.isBefore(other);
	}

	isEqual(other: Position): boolean {
		return this.line === other.line && this.character === other.character;
	}

	compareTo(other: Position): number {
		if (this.line < other.line) {
			return -1;
		}
		if (this.line > other.line) {
			return 1;
		}
		// lines are equal
		if (this.character < other.character) {
			return -1;
		}
		if (this.character > other.character) {
			return 1;
		}
		// characters are equal
		return 0;
	}

	translate(lineDelta?: number, characterDelta?: number): Position {
		return new Position(
			this.line + (lineDelta ?? 0),
			this.character + (characterDelta ?? 0),
		);
	}

	with(line?: number, character?: number): Position {
		return new Position(line ?? this.line, character ?? this.character);
	}

	toJSON(): any {
		return { line: this.line, character: this.character };
	}
}

export class Range {
	readonly start: Position;
	readonly end: Position;

	constructor(start: Position, end: Position) {
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
			return undefined; // No overlap
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

	with(start?: Position, end?: Position): Range {
		return new Range(start ?? this.start, end ?? this.end);
	}

	override toJSON(): any {
		return [this.start, this.end];
	}
}

export class Selection extends Range {
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
			start: this.start,
			end: this.end,
			active: this.active,
			anchor: this.anchor,
		};
	}
}

export class Location {
	constructor(
		public uri: Uri,
		public range: Range | Position,
	) {}

	toJSON(): any {
		return {
			uri: this.uri,
			range: this.range,
		};
	}
}

export class Diagnostic {
	range: Range;
	message: string;
	severity: DiagnosticSeverity;
	source?: string;
	code?: string | number | { value: string | number; target: Uri };
	relatedInformation?: any[];
	tags?: any[];
	constructor(
		range: Range,
		message: string,
		severity: DiagnosticSeverity = DiagnosticSeverity.Error,
	) {
		this.range = range;
		this.message = message;
		this.severity = severity;
	}

	toJSON(): any {
		return {
			message: this.message,
			severity: DiagnosticSeverity[this.severity],
			range: this.range,
		};
	}
}

export class TreeItem {
	label?: string | any;
	resourceURI?: Uri;
	collapsibleState?: TreeItemCollapsibleState;
	constructor(
		labelOrUri: string | any,
		collapsibleState?: TreeItemCollapsibleState,
	) {
		if (typeof labelOrUri === "string") {
			this.label = labelOrUri;
		} else {
			this.resourceURI = labelOrUri;
		}
		this.collapsibleState = collapsibleState;
	}
}

export class MarkdownString implements VSCodeMarkdownString {
	value: string;
	isTrusted?: boolean;
	supportThemeIcons?: boolean;
	supportHtml?: boolean;
	baseUri?: Uri;
	constructor(value: string = "", isTrusted: boolean = false) {
		this.value = value;
		this.isTrusted = isTrusted;
	}

	append(value: string): MarkdownString {
		this.value += value;
		return this;
	}

	appendCodeblock(language: string, value: string): MarkdownString {
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

export class ThemeColor implements VSCodeThemeColor {
	constructor(public id: string) {}
}

export class ThemeIcon {
	static readonly File = new ThemeIcon("file");
	static readonly Folder = new ThemeIcon("folder");
	constructor(
		public id: string,
		public color?: ThemeColor,
	) {}
}

// --- Enums ---

export enum ViewColumn {
	Active = -1,
	Beside = -2,
	One = 1,
	Two = 2,
	Three = 3,
	Four = 4,
	Five = 5,
	Six = 6,
	Seven = 7,
	Eight = 8,
	Nine = 9,
}
export enum StatusBarAlignment {
	Left = 1,
	Right = 2,
}
export enum FileType {
	Unknown = 0,
	File = 1,
	Directory = 2,
	SymbolicLink = 64,
}
export enum TextEditorCursorStyle {
	Line = 1,
	Block = 2,
	Underline = 3,
	LineThin = 4,
	BlockOutline = 5,
	UnderlineThin = 6,
}
export enum DiagnosticSeverity {
	Error = 0,
	Warning = 1,
	Information = 2,
	Hint = 3,
}
export enum TreeItemCollapsibleState {
	None = 0,
	Collapsed = 1,
	Expanded = 2,
}
export enum ConfigurationTarget {
	Global = 1,
	WorkSpace = 2,
	WorkSpaceFolder = 3,
}
export enum EndOfLine {
	LF = 1,
	CRLF = 2,
}
export enum ProgressLocation {
	SourceControl = 1,
	Window = 10,
	Notification = 15,
}
export enum QuickPickItemKind {
	Separator = -1,
	Default = 0,
}
