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
import { CompletionItemKind, CompletionItemTag, ConfigurationTarget, DiagnosticSeverity, DiagnosticTag, EndOfLine, ProgressLocation, QuickPickItemKind, SnippetString, StatusBarAlignment, TextEditorCursorStyle, ViewColumn, TreeItemCollapsibleState } from "vscode";
export declare class Disposable implements VSCode.Disposable {
    private _callOnDispose;
    constructor(callOnDispose: () => any);
    dispose(): any;
    [Symbol.dispose](): void;
}
export declare const CancellationTokenSource: typeof VSCodeCancellationTokenSource;
export declare const CancellationError: typeof VSCodeCancellationError;
export declare const EventEmitter: typeof Emitter;
export declare const URI: typeof VSCodeURI;
export declare const ThemeIcon: typeof VSCode.ThemeIcon;
export declare const ProcessExecution: typeof VSCode.ProcessExecution;
export declare const Task: typeof VSCode.Task;
export declare const WorkspaceEdit: typeof VSCode.WorkspaceEdit;
export declare const TextEdit: typeof VSCode.TextEdit;
export declare class Position implements VSCode.Position {
    readonly line: number;
    readonly character: number;
    constructor(line: number, character: number);
    isBefore(other: VSCode.Position): boolean;
    isBeforeOrEqual(other: VSCode.Position): boolean;
    isAfter(other: VSCode.Position): boolean;
    isAfterOrEqual(other: VSCode.Position): boolean;
    isEqual(other: VSCode.Position): boolean;
    compareTo(other: VSCode.Position): number;
    translate(lineDelta?: number, characterDelta?: number): VSCode.Position;
    translate(change: {
        lineDelta?: number;
        characterDelta?: number;
    }): VSCode.Position;
    with(line?: number, character?: number): VSCode.Position;
    with(change: {
        line?: number;
        character?: number;
    }): VSCode.Position;
    toJSON(): any;
}
export declare class Range implements VSCode.Range {
    readonly start: Position;
    readonly end: Position;
    constructor(start: Position, end: Position);
    constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
    get isEmpty(): boolean;
    get isSingleLine(): boolean;
    contains(positionOrRange: Position | Range): boolean;
    isEqual(other: Range): boolean;
    intersection(other: Range): Range | undefined;
    union(other: Range): Range;
    with(start?: Position, end?: Position): Range;
    with(change: {
        start?: Position;
        end?: Position;
    }): Range;
    toJSON(): any;
}
export declare class Selection extends Range implements VSCode.Selection {
    readonly anchor: Position;
    readonly active: Position;
    constructor(anchor: Position, active: Position);
    constructor(anchorLine: number, anchorCharacter: number, activeLine: number, activeCharacter: number);
    get isReversed(): boolean;
    toJSON(): any;
}
export declare class MarkdownString implements VSCode.MarkdownString {
    value: string;
    isTrusted?: boolean;
    supportThemeIcons?: boolean;
    supportHtml?: boolean;
    baseUri?: VSCode.Uri;
    constructor(value?: string, isTrusted?: boolean);
    appendText(value: string): MarkdownString;
    appendMarkdown(value: string): MarkdownString;
    appendCodeblock(value: string, language?: string): MarkdownString;
    toJSON(): any;
}
export declare class ThemeColor implements VSCode.ThemeColor {
    id: string;
    constructor(id: string);
}
export declare class TreeItem implements VSCode.TreeItem {
    label?: string | VSCode.TreeItemLabel;
    resourceUri?: VSCode.Uri;
    collapsibleState?: VSCode.TreeItemCollapsibleState;
    id?: string;
    description?: string;
    command?: VSCode.Command;
    constructor(labelOrUri: string | VSCode.Uri | VSCode.TreeItemLabel, collapsibleState?: VSCode.TreeItemCollapsibleState);
}
export { ViewColumn, StatusBarAlignment, TextEditorCursorStyle, DiagnosticTag, ConfigurationTarget, EndOfLine, ProgressLocation, QuickPickItemKind, CompletionItemKind, SnippetString, CompletionItemTag, DiagnosticSeverity, TreeItemCollapsibleState, };
export declare const FileType: typeof VSCodeFileType;
