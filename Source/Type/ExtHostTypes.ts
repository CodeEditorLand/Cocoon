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
	CompletionItem as VscCompletionItem,
	CompletionItemKind as VscCompletionItemKind,
	Diagnostic as VscDiagnostic,
	DiagnosticRelatedInformation as VscDiagnosticRelatedInformation,
	DiagnosticSeverity as VscDiagnosticSeverity,
	Location as VscLocation,
	MarkdownString as VSCodeMarkdownString,
	Position as VSCodePosition,
	Range as VSCodeRange,
	ThemeColor as VSCodeThemeColor,
	Selection as VscSelection,
	SnippetString as VscSnippetString,
	TextEdit as VscTextEdit,
	TreeItem as VscTreeItem,
	TreeItemCollapsibleState as VscTreeItemCollapsibleState,
} from "vscode";

// --- Foundational Re-exports ---
export const Disposable = Lifecycle.Disposable;
export const CancellationTokenSource = VscCancellationTokenSource;
export const CancellationError = VscCancellationError;
export const EventEmitter = Emitter.Emitter;
export const URI = VscURI;

// --- Core Classes ---

export class Position implements VSCodePosition {
	readonly line: number;
	readonly character: number;

	constructor(Line: number, Character: number) {
		if (Line < 0) {
			throw new Error("Illegal argument: line must be non-negative");
		}
		if (Character < 0) {
			throw new Error("Illegal argument: character must be non-negative");
		}
		this.line = Line;
		this.character = Character;
	}

	isBefore(Other: Position): boolean {
		return (
			this.line < Other.line ||
			(this.line === Other.line && this.character < Other.character)
		);
	}

	isBeforeOrEqual(Other: Position): boolean {
		return (
			this.line < Other.line ||
			(this.line === Other.line && this.character <= Other.character)
		);
	}

	isAfter(Other: Position): boolean {
		return !this.isBeforeOrEqual(Other);
	}

	isAfterOrEqual(Other: Position): boolean {
		return !this.isBefore(Other);
	}

	isEqual(Other: Position): boolean {
		return this.line === Other.line && this.character === Other.character;
	}

	compareTo(Other: Position): number {
		if (this.line < Other.line) {
			return -1;
		}
		if (this.line > Other.line) {
			return 1;
		}
		// lines are equal
		if (this.character < Other.character) {
			return -1;
		}
		if (this.character > Other.character) {
			return 1;
		}
		// characters are equal
		return 0;
	}

	translate(LineDelta?: number, CharacterDelta?: number): Position {
		return new Position(
			this.line + (LineDelta ?? 0),
			this.character + (CharacterDelta ?? 0),
		);
	}
	with(Line?: number, Character?: number): Position {
		return new Position(Line ?? this.line, Character ?? this.character);
	}

	toJSON(): any {
		return { line: this.line, character: this.character };
	}
}

export class Range implements VSCodeRange {
	readonly start: Position;
	readonly end: Position;

	constructor(Start: Position, End: Position) {
		if (Start.isAfter(End)) {
			this.start = End;
			this.end = Start;
		} else {
			this.start = Start;
			this.end = End;
		}
	}

	get isEmpty(): boolean {
		return this.start.isEqual(this.end);
	}

	get isSingleLine(): boolean {
		return this.start.line === this.end.line;
	}

	contains(PositionOrRange: Position | Range): boolean {
		if (PositionOrRange instanceof Range) {
			return (
				this.contains(PositionOrRange.start) &&
				this.contains(PositionOrRange.end)
			);
		}
		return (
			PositionOrRange.isAfterOrEqual(this.start) &&
			PositionOrRange.isBeforeOrEqual(this.end)
		);
	}

	isEqual(Other: Range): boolean {
		return this.start.isEqual(Other.start) && this.end.isEqual(Other.end);
	}

	intersection(Other: Range): Range | undefined {
		const Start = this.start.isAfter(Other.start)
			? this.start
			: Other.start;
		const End = this.end.isBefore(Other.end) ? this.end : Other.end;

		if (Start.isAfter(End)) {
			return undefined; // No overlap
		}
		return new Range(Start, End);
	}

	union(Other: Range): Range {
		const Start = this.start.isBefore(Other.start)
			? this.start
			: Other.start;
		const End = this.end.isAfter(Other.end) ? this.end : Other.end;
		return new Range(Start, End);
	}

	with(Start?: Position, End?: Position): Range {
		return new Range(Start ?? this.start, End ?? this.end);
	}

	toJSON(): any {
		return [this.start, this.end];
	}
}

export class Selection extends Range implements VscSelection {
	readonly anchor: Position;
	readonly active: Position;

	constructor(Anchor: Position, Active: Position) {
		super(Anchor, Active);
		this.anchor = Anchor;
		this.active = Active;
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

export class Location implements VscLocation {
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

export class Diagnostic implements VscDiagnostic {
	range: Range;
	message: string;
	severity: VscDiagnosticSeverity;
	source?: string;
	code?: string | number | { value: string | number; target: Uri };
	relatedInformation?: VscDiagnosticRelatedInformation[];
	tags?: any[];
	constructor(
		Range: Range,
		Message: string,
		Severity: VscDiagnosticSeverity = VscDiagnosticSeverity.Error,
	) {
		this.range = Range;
		this.message = Message;
		this.severity = Severity;
	}

	toJSON(): any {
		return {
			message: this.message,
			severity: VscDiagnosticSeverity[this.severity],
			range: this.range,
		};
	}
}

export class DiagnosticRelatedInformation
	implements VscDiagnosticRelatedInformation
{
	constructor(
		public location: Location,
		public message: string,
	) {}
}

export class TreeItem implements VscTreeItem {
	label?: string | any;
	resourceURI?: Uri;
	collapsibleState?: VscTreeItemCollapsibleState;
	constructor(
		LabelOrUri: string | any,
		CollapsibleState?: VscTreeItemCollapsibleState,
	) {
		if (typeof LabelOrUri === "string") {
			this.label = LabelOrUri;
		} else {
			this.resourceURI = LabelOrUri;
		}
		this.collapsibleState = CollapsibleState;
	}
}

export class MarkdownString implements VSCodeMarkdownString {
	value: string;
	isTrusted?: boolean;
	supportThemeIcons?: boolean;
	supportHtml?: boolean;
	baseUri?: Uri;
	constructor(Value = "", IsTrusted = false) {
		this.value = Value;
		this.isTrusted = IsTrusted;
	}

	appendText(Value: string): MarkdownString {
		this.value += Value;
		return this;
	}
	appendMarkdown(Value: string): MarkdownString {
		this.value += Value;
		return this;
	}

	appendCodeblock(Value: string, Language = ""): MarkdownString {
		this.value += `\n\`\`\`${Language}\n${Value}\n\`\`\`\n`;
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

export class TextEdit implements VscTextEdit {
	constructor(
		public range: Range,
		public newText: string,
	) {}
}

export class CompletionItem extends VscCompletionItem {}
export class SnippetString extends VscSnippetString {}
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

export const CompletionItemKind = VscCompletionItemKind;
