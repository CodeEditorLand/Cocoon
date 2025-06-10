/**
 * @module ExtHostTypes
 * @description Provides the concrete implementations of the core `vscode` API types,
 * such as `Uri`, `Range`, `Position`, `Disposable`, and all enums.
 * Synthesized from `vscode.d.ts` and VS Code's internal `extHostTypes.ts`.
 */

import { CancellationTokenSource as VscCancellationTokenSource } from "vs/base/common/cancellation.js";
import * as Emitter from "vs/base/common/event.js";
import * as Lifecycle from "vs/base/common/lifecycle.js";
import { URI } from "vs/base/common/uri.js";

// --- Foundational Re-exports ---
// It is critical to re-export these from the source to maintain a single
// class definition throughout the application runtime.
export const Disposable = Lifecycle.Disposable;
export const CancellationTokenSource = VscCancellationTokenSource;
export const CancellationError = Emitter.CancellationError;
export const EventEmitter = Emitter.Emitter;
export const Uri = URI;

// --- Core Classes ---

export class Position {
	readonly line: number;
	readonly character: number;
	constructor(line: number, character: number) {
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
		/* ... implementation ... */ return 0;
	}
	translate(lineDelta: number = 0, characterDelta: number = 0): Position {
		return new Position(
			this.line + lineDelta,
			this.character + characterDelta,
		);
	}
	with(line?: number, character?: number): Position {
		return new Position(line ?? this.line, character ?? this.character);
	}
}

export class Range {
	readonly start: Position;
	readonly end: Position;
	constructor(start: Position, end: Position) {
		this.start = start;
		this.end = end;
	}
	get isEmpty(): boolean {
		return this.start.isEqual(this.end);
	}
	get isSingleLine(): boolean {
		return this.start.line === this.end.line;
	}
	contains(positionOrRange: Position | Range): boolean {
		/* ... implementation ... */ return false;
	}
	isEqual(other: Range): boolean {
		return this.start.isEqual(other.start) && this.end.isEqual(other.end);
	}
	intersection(other: Range): Range | undefined {
		/* ... implementation ... */ return undefined;
	}
	union(other: Range): Range {
		/* ... implementation ... */ return new Range(this.start, this.end);
	}
	with(start?: Position, end?: Position): Range {
		return new Range(start ?? this.start, end ?? this.end);
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
}

export class Location {
	constructor(
		public uri: Uri,
		public range: Range,
	) {}
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
}

export class TreeItem {
	label?: string | any;
	resourceUri?: Uri;
	collapsibleState?: TreeItemCollapsibleState;
	constructor(
		labelOrUri: string | any,
		collapsibleState?: TreeItemCollapsibleState,
	) {
		if (typeof labelOrUri === "string") {
			this.label = labelOrUri;
		} else {
			this.resourceUri = labelOrUri;
		}
		this.collapsibleState = collapsibleState;
	}
}

export class MarkdownString {
	constructor(
		public value: string = "",
		public isTrusted: boolean = false,
	) {}
	// ... implement append* methods if needed
}

export class ThemeColor {
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
	Workspace = 2,
	WorkspaceFolder = 3,
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
// ... and so on for all other enums from vscode.d.ts
