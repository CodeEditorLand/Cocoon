/**
 * @module Type
 * @description Provides the concrete implementations of core `vscode` API types,
 * such as `URI`, `Range`, `Position`, `Disposable`, and all enums.
 * This is synthesized from `vscode.d.ts` and VS Code's internal `extHostTypes.ts`.
 */
import { CancellationTokenSource as VSCodeCancellationTokenSource } from "vs/base/common/cancellation.js";
import { CancellationError as VSCodeCancellationError } from "vs/base/common/errors.js";
import { Emitter } from "vs/base/common/event.js";
import { URI as VSCodeURI } from "vs/base/common/uri.js";
import { FileType as VSCodeFileType } from "vs/platform/files/common/files.js";
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
	ThemeIcon as VSCodeThemeIcon,
	TreeItemCollapsibleState,
	ProcessExecution as VSCodeProcessExecution,
	Task as VSCodeTask,
	WorkspaceEdit as VSCodeWorkspaceEdit,
	TextEdit as VSCodeTextEdit,
} from "vscode";

// Foundational Re-exports
export class Disposable implements VSCode.Disposable {
	private _callOnDispose: () => any;
	constructor(callOnDispose: () => any) {
		this._callOnDispose = callOnDispose;
	}
	dispose(): any {
		this._callOnDispose();
	}
	[Symbol.dispose](): void {
		this.dispose();
	}
}
export const CancellationTokenSource = VSCodeCancellationTokenSource;
export const CancellationError = VSCodeCancellationError;
export const EventEmitter = Emitter;
export const URI = VSCodeURI;
export const ThemeIcon = VSCodeThemeIcon;
export const ProcessExecution = VSCodeProcessExecution;
export const Task = VSCodeTask;
export const WorkspaceEdit = VSCodeWorkspaceEdit;
export const TextEdit = VSCodeTextEdit;

// Service Classes
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
		if (this.line < other.line) return -1;
		if (this.line > other.line) return 1;
		if (this.character < other.character) return -1;
		if (this.character > other.character) return 1;
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
	constructor(anchor: Position, active: Position);
	constructor(
		anchorLine: number,
		anchorCharacter: number,
		activeLine: number,
		activeCharacter: number,
	);
	constructor(
		anchor: Position | number,
		active: Position | number,
		activeLine?: number,
		activeCharacter?: number,
	) {
		let anchorPos: Position;
		let activePos: Position;

		if (
			typeof anchor === "number" &&
			typeof active === "number" &&
			typeof activeLine === "number" &&
			typeof activeCharacter === "number"
		) {
			anchorPos = new Position(anchor, active);
			activePos = new Position(activeLine, activeCharacter);
		} else if (anchor instanceof Position && active instanceof Position) {
			anchorPos = anchor;
			activePos = active;
		} else {
			throw new Error("Invalid arguments");
		}

		super(anchorPos, activePos);
		this.anchor = anchorPos;
		this.active = activePos;
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

export class TreeItem implements VSCode.TreeItem {
	label?: string | VSCode.TreeItemLabel;
	resourceURI?: VSCode.Uri;
	collapsibleState?: VSCode.TreeItemCollapsibleState;
	id?: string;
	description?: string;
	command?: VSCode.Command;
	constructor(
		labelOrUri: string | VSCode.Uri | VSCode.TreeItemLabel,
		collapsibleState: VSCode.TreeItemCollapsibleState = TreeItemCollapsibleState.None,
	) {
		if (typeof labelOrUri === "string" || isTreeItemLabel(labelOrUri)) {
			this.label = labelOrUri;
		} else {
			this.resourceURI = labelOrUri;
		}
		this.collapsibleState = collapsibleState;
	}
}
function isTreeItemLabel(thing: any): thing is VSCode.TreeItemLabel {
	return (
		thing &&
		typeof thing === "object" &&
		typeof (thing as VSCode.TreeItemLabel).label === "string"
	);
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
	TreeItemCollapsibleState,
};

export const FileType = VSCodeFileType;
