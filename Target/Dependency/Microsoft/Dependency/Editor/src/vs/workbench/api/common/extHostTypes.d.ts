import type * as vscode from 'vscode';
import { SerializedError } from '../../../base/common/errors.js';
import { IRelativePattern } from '../../../base/common/glob.js';
import { MarkdownStringTrustedOptions } from '../../../base/common/htmlContent.js';
import { MarshalledId } from '../../../base/common/marshallingIds.js';
import { URI } from '../../../base/common/uri.js';
import { TextEditorSelectionSource } from '../../../platform/editor/common/editor.js';
import { ExtensionIdentifier, IExtensionDescription } from '../../../platform/extensions/common/extensions.js';
import { FileSystemProviderErrorCode } from '../../../platform/files/common/files.js';
import { RemoteAuthorityResolverErrorCode } from '../../../platform/remote/common/remoteAuthorityResolver.js';
import { ICellMetadataEdit, IDocumentMetadataEdit } from '../../contrib/notebook/common/notebookCommon.js';
import { IRelativePatternDto } from './extHost.protocol.js';
export declare enum TerminalOutputAnchor {
    Top = 0,
    Bottom = 1
}
export declare enum TerminalQuickFixType {
    TerminalCommand = 0,
    Opener = 1,
    Command = 3
}
export declare class Disposable {
    #private;
    static from(...inDisposables: {
        dispose(): any;
    }[]): Disposable;
    constructor(callOnDispose: () => any);
    dispose(): any;
}
export declare class Position {
    static Min(...positions: Position[]): Position;
    static Max(...positions: Position[]): Position;
    static isPosition(other: any): other is Position;
    static of(obj: vscode.Position): Position;
    private _line;
    private _character;
    get line(): number;
    get character(): number;
    constructor(line: number, character: number);
    isBefore(other: Position): boolean;
    isBeforeOrEqual(other: Position): boolean;
    isAfter(other: Position): boolean;
    isAfterOrEqual(other: Position): boolean;
    isEqual(other: Position): boolean;
    compareTo(other: Position): number;
    translate(change: {
        lineDelta?: number;
        characterDelta?: number;
    }): Position;
    translate(lineDelta?: number, characterDelta?: number): Position;
    with(change: {
        line?: number;
        character?: number;
    }): Position;
    with(line?: number, character?: number): Position;
    toJSON(): any;
}
export declare class Range {
    static isRange(thing: any): thing is vscode.Range;
    static of(obj: vscode.Range): Range;
    protected _start: Position;
    protected _end: Position;
    get start(): Position;
    get end(): Position;
    constructor(start: vscode.Position, end: vscode.Position);
    constructor(start: Position, end: Position);
    constructor(startLine: number, startColumn: number, endLine: number, endColumn: number);
    contains(positionOrRange: Position | Range): boolean;
    isEqual(other: Range): boolean;
    intersection(other: Range): Range | undefined;
    union(other: Range): Range;
    get isEmpty(): boolean;
    get isSingleLine(): boolean;
    with(change: {
        start?: Position;
        end?: Position;
    }): Range;
    with(start?: Position, end?: Position): Range;
    toJSON(): any;
}
export declare class Selection extends Range {
    static isSelection(thing: any): thing is Selection;
    private _anchor;
    get anchor(): Position;
    private _active;
    get active(): Position;
    constructor(anchor: Position, active: Position);
    constructor(anchorLine: number, anchorColumn: number, activeLine: number, activeColumn: number);
    get isReversed(): boolean;
    toJSON(): {
        start: Position;
        end: Position;
        active: Position;
        anchor: Position;
    };
}
export declare function getDebugDescriptionOfRange(range: vscode.Range): string;
export declare function getDebugDescriptionOfSelection(selection: vscode.Selection): string;
export declare class ResolvedAuthority {
    static isResolvedAuthority(resolvedAuthority: any): resolvedAuthority is ResolvedAuthority;
    readonly host: string;
    readonly port: number;
    readonly connectionToken: string | undefined;
    constructor(host: string, port: number, connectionToken?: string);
}
export declare class ManagedResolvedAuthority {
    readonly makeConnection: () => Thenable<vscode.ManagedMessagePassing>;
    readonly connectionToken?: string | undefined;
    static isManagedResolvedAuthority(resolvedAuthority: any): resolvedAuthority is ManagedResolvedAuthority;
    constructor(makeConnection: () => Thenable<vscode.ManagedMessagePassing>, connectionToken?: string | undefined);
}
export declare class RemoteAuthorityResolverError extends Error {
    static NotAvailable(message?: string, handled?: boolean): RemoteAuthorityResolverError;
    static TemporarilyNotAvailable(message?: string): RemoteAuthorityResolverError;
    readonly _message: string | undefined;
    readonly _code: RemoteAuthorityResolverErrorCode;
    readonly _detail: unknown;
    constructor(message?: string, code?: RemoteAuthorityResolverErrorCode, detail?: unknown);
}
export declare enum EndOfLine {
    LF = 1,
    CRLF = 2
}
export declare enum EnvironmentVariableMutatorType {
    Replace = 1,
    Append = 2,
    Prepend = 3
}
export declare class TextEdit {
    static isTextEdit(thing: any): thing is TextEdit;
    static replace(range: Range, newText: string): TextEdit;
    static insert(position: Position, newText: string): TextEdit;
    static delete(range: Range): TextEdit;
    static setEndOfLine(eol: EndOfLine): TextEdit;
    protected _range: Range;
    protected _newText: string | null;
    protected _newEol?: EndOfLine;
    get range(): Range;
    set range(value: Range);
    get newText(): string;
    set newText(value: string);
    get newEol(): EndOfLine | undefined;
    set newEol(value: EndOfLine | undefined);
    constructor(range: Range, newText: string | null);
    toJSON(): any;
}
export declare class NotebookEdit implements vscode.NotebookEdit {
    static isNotebookCellEdit(thing: any): thing is NotebookEdit;
    static replaceCells(range: NotebookRange, newCells: NotebookCellData[]): NotebookEdit;
    static insertCells(index: number, newCells: vscode.NotebookCellData[]): vscode.NotebookEdit;
    static deleteCells(range: NotebookRange): NotebookEdit;
    static updateCellMetadata(index: number, newMetadata: {
        [key: string]: any;
    }): NotebookEdit;
    static updateNotebookMetadata(newMetadata: {
        [key: string]: any;
    }): NotebookEdit;
    range: NotebookRange;
    newCells: NotebookCellData[];
    newCellMetadata?: {
        [key: string]: any;
    };
    newNotebookMetadata?: {
        [key: string]: any;
    };
    constructor(range: NotebookRange, newCells: NotebookCellData[]);
}
export declare class SnippetTextEdit implements vscode.SnippetTextEdit {
    static isSnippetTextEdit(thing: any): thing is SnippetTextEdit;
    static replace(range: Range, snippet: SnippetString): SnippetTextEdit;
    static insert(position: Position, snippet: SnippetString): SnippetTextEdit;
    range: Range;
    snippet: SnippetString;
    keepWhitespace?: boolean;
    constructor(range: Range, snippet: SnippetString);
}
export interface IFileOperationOptions {
    readonly overwrite?: boolean;
    readonly ignoreIfExists?: boolean;
    readonly ignoreIfNotExists?: boolean;
    readonly recursive?: boolean;
    readonly contents?: Uint8Array | vscode.DataTransferFile;
}
export declare const enum FileEditType {
    File = 1,
    Text = 2,
    Cell = 3,
    CellReplace = 5,
    Snippet = 6
}
export interface IFileOperation {
    readonly _type: FileEditType.File;
    readonly from?: URI;
    readonly to?: URI;
    readonly options?: IFileOperationOptions;
    readonly metadata?: vscode.WorkspaceEditEntryMetadata;
}
export interface IFileTextEdit {
    readonly _type: FileEditType.Text;
    readonly uri: URI;
    readonly edit: TextEdit;
    readonly metadata?: vscode.WorkspaceEditEntryMetadata;
}
export interface IFileSnippetTextEdit {
    readonly _type: FileEditType.Snippet;
    readonly uri: URI;
    readonly range: vscode.Range;
    readonly edit: vscode.SnippetString;
    readonly metadata?: vscode.WorkspaceEditEntryMetadata;
    readonly keepWhitespace?: boolean;
}
export interface IFileCellEdit {
    readonly _type: FileEditType.Cell;
    readonly uri: URI;
    readonly edit?: ICellMetadataEdit | IDocumentMetadataEdit;
    readonly metadata?: vscode.WorkspaceEditEntryMetadata;
}
export interface ICellEdit {
    readonly _type: FileEditType.CellReplace;
    readonly metadata?: vscode.WorkspaceEditEntryMetadata;
    readonly uri: URI;
    readonly index: number;
    readonly count: number;
    readonly cells: vscode.NotebookCellData[];
}
type WorkspaceEditEntry = IFileOperation | IFileTextEdit | IFileSnippetTextEdit | IFileCellEdit | ICellEdit;
export declare class WorkspaceEdit implements vscode.WorkspaceEdit {
    private readonly _edits;
    _allEntries(): ReadonlyArray<WorkspaceEditEntry>;
    renameFile(from: vscode.Uri, to: vscode.Uri, options?: {
        readonly overwrite?: boolean;
        readonly ignoreIfExists?: boolean;
    }, metadata?: vscode.WorkspaceEditEntryMetadata): void;
    createFile(uri: vscode.Uri, options?: {
        readonly overwrite?: boolean;
        readonly ignoreIfExists?: boolean;
        readonly contents?: Uint8Array | vscode.DataTransferFile;
    }, metadata?: vscode.WorkspaceEditEntryMetadata): void;
    deleteFile(uri: vscode.Uri, options?: {
        readonly recursive?: boolean;
        readonly ignoreIfNotExists?: boolean;
    }, metadata?: vscode.WorkspaceEditEntryMetadata): void;
    private replaceNotebookMetadata;
    private replaceNotebookCells;
    private replaceNotebookCellMetadata;
    replace(uri: URI, range: Range, newText: string, metadata?: vscode.WorkspaceEditEntryMetadata): void;
    insert(resource: URI, position: Position, newText: string, metadata?: vscode.WorkspaceEditEntryMetadata): void;
    delete(resource: URI, range: Range, metadata?: vscode.WorkspaceEditEntryMetadata): void;
    has(uri: URI): boolean;
    set(uri: URI, edits: ReadonlyArray<TextEdit | SnippetTextEdit>): void;
    set(uri: URI, edits: ReadonlyArray<[TextEdit | SnippetTextEdit, vscode.WorkspaceEditEntryMetadata | undefined]>): void;
    set(uri: URI, edits: readonly NotebookEdit[]): void;
    set(uri: URI, edits: ReadonlyArray<[NotebookEdit, vscode.WorkspaceEditEntryMetadata | undefined]>): void;
    get(uri: URI): TextEdit[];
    entries(): [URI, TextEdit[]][];
    get size(): number;
    toJSON(): any;
}
export declare class SnippetString {
    static isSnippetString(thing: any): thing is SnippetString;
    private static _escape;
    private _tabstop;
    value: string;
    constructor(value?: string);
    appendText(string: string): SnippetString;
    appendTabstop(number?: number): SnippetString;
    appendPlaceholder(value: string | ((snippet: SnippetString) => any), number?: number): SnippetString;
    appendChoice(values: string[], number?: number): SnippetString;
    appendVariable(name: string, defaultValue?: string | ((snippet: SnippetString) => any)): SnippetString;
}
export declare enum DiagnosticTag {
    Unnecessary = 1,
    Deprecated = 2
}
export declare enum DiagnosticSeverity {
    Hint = 3,
    Information = 2,
    Warning = 1,
    Error = 0
}
export declare class Location {
    static isLocation(thing: any): thing is vscode.Location;
    uri: URI;
    range: Range;
    constructor(uri: URI, rangeOrPosition: Range | Position);
    toJSON(): any;
}
export declare class DiagnosticRelatedInformation {
    static is(thing: any): thing is DiagnosticRelatedInformation;
    location: Location;
    message: string;
    constructor(location: Location, message: string);
    static isEqual(a: DiagnosticRelatedInformation, b: DiagnosticRelatedInformation): boolean;
}
export declare class Diagnostic {
    range: Range;
    message: string;
    severity: DiagnosticSeverity;
    source?: string;
    code?: string | number;
    relatedInformation?: DiagnosticRelatedInformation[];
    tags?: DiagnosticTag[];
    constructor(range: Range, message: string, severity?: DiagnosticSeverity);
    toJSON(): any;
    static isEqual(a: Diagnostic | undefined, b: Diagnostic | undefined): boolean;
}
export declare class Hover {
    contents: (vscode.MarkdownString | vscode.MarkedString)[];
    range: Range | undefined;
    constructor(contents: vscode.MarkdownString | vscode.MarkedString | (vscode.MarkdownString | vscode.MarkedString)[], range?: Range);
}
export declare class VerboseHover extends Hover {
    canIncreaseVerbosity: boolean | undefined;
    canDecreaseVerbosity: boolean | undefined;
    constructor(contents: vscode.MarkdownString | vscode.MarkedString | (vscode.MarkdownString | vscode.MarkedString)[], range?: Range, canIncreaseVerbosity?: boolean, canDecreaseVerbosity?: boolean);
}
export declare enum HoverVerbosityAction {
    Increase = 0,
    Decrease = 1
}
export declare enum DocumentHighlightKind {
    Text = 0,
    Read = 1,
    Write = 2
}
export declare class DocumentHighlight {
    range: Range;
    kind: DocumentHighlightKind;
    constructor(range: Range, kind?: DocumentHighlightKind);
    toJSON(): any;
}
export declare class MultiDocumentHighlight {
    uri: URI;
    highlights: DocumentHighlight[];
    constructor(uri: URI, highlights: DocumentHighlight[]);
    toJSON(): any;
}
export declare enum SymbolKind {
    File = 0,
    Module = 1,
    Namespace = 2,
    Package = 3,
    Class = 4,
    Method = 5,
    Property = 6,
    Field = 7,
    Constructor = 8,
    Enum = 9,
    Interface = 10,
    Function = 11,
    Variable = 12,
    Constant = 13,
    String = 14,
    Number = 15,
    Boolean = 16,
    Array = 17,
    Object = 18,
    Key = 19,
    Null = 20,
    EnumMember = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25
}
export declare enum SymbolTag {
    Deprecated = 1
}
export declare class SymbolInformation {
    static validate(candidate: SymbolInformation): void;
    name: string;
    location: Location;
    kind: SymbolKind;
    tags?: SymbolTag[];
    containerName: string | undefined;
    constructor(name: string, kind: SymbolKind, containerName: string | undefined, location: Location);
    constructor(name: string, kind: SymbolKind, range: Range, uri?: URI, containerName?: string);
    toJSON(): any;
}
declare abstract class AbstractDocumentSymbol {
    name: string;
    detail: string;
    kind: SymbolKind;
    tags?: SymbolTag[];
    range: Range;
    selectionRange: Range;
    children: DocumentSymbol[];
    constructor(name: string, detail: string, kind: SymbolKind, range: Range, selectionRange: Range);
}
export declare class DocumentSymbol extends AbstractDocumentSymbol {
    static validate(candidate: DocumentSymbol): void;
    constructor(name: string, detail: string, kind: SymbolKind, range: Range, selectionRange: Range);
    static [Symbol.hasInstance](candidate: unknown): boolean;
}
export declare class SymbolInformationAndDocumentSymbol extends SymbolInformation implements vscode.DocumentSymbol {
    detail: string;
    range: vscode.Range;
    selectionRange: vscode.Range;
    children: vscode.DocumentSymbol[];
    containerName: string;
    constructor(name: string, kind: vscode.SymbolKind, detail: string, containerName: string, uri: URI, range: Range, selectionRange: Range, children?: SymbolInformationAndDocumentSymbol[]);
}
export declare enum CodeActionTriggerKind {
    Invoke = 1,
    Automatic = 2
}
export declare class CodeAction {
    title: string;
    command?: vscode.Command;
    edit?: WorkspaceEdit;
    diagnostics?: Diagnostic[];
    kind?: CodeActionKind;
    isPreferred?: boolean;
    constructor(title: string, kind?: CodeActionKind);
}
export declare class CodeActionKind {
    readonly value: string;
    private static readonly sep;
    static Empty: CodeActionKind;
    static QuickFix: CodeActionKind;
    static Refactor: CodeActionKind;
    static RefactorExtract: CodeActionKind;
    static RefactorInline: CodeActionKind;
    static RefactorMove: CodeActionKind;
    static RefactorRewrite: CodeActionKind;
    static Source: CodeActionKind;
    static SourceOrganizeImports: CodeActionKind;
    static SourceFixAll: CodeActionKind;
    static Notebook: CodeActionKind;
    constructor(value: string);
    append(parts: string): CodeActionKind;
    intersects(other: CodeActionKind): boolean;
    contains(other: CodeActionKind): boolean;
}
export declare class SelectionRange {
    range: Range;
    parent?: SelectionRange;
    constructor(range: Range, parent?: SelectionRange);
}
export declare class CallHierarchyItem {
    _sessionId?: string;
    _itemId?: string;
    kind: SymbolKind;
    tags?: SymbolTag[];
    name: string;
    detail?: string;
    uri: URI;
    range: Range;
    selectionRange: Range;
    constructor(kind: SymbolKind, name: string, detail: string, uri: URI, range: Range, selectionRange: Range);
}
export declare class CallHierarchyIncomingCall {
    from: vscode.CallHierarchyItem;
    fromRanges: vscode.Range[];
    constructor(item: vscode.CallHierarchyItem, fromRanges: vscode.Range[]);
}
export declare class CallHierarchyOutgoingCall {
    to: vscode.CallHierarchyItem;
    fromRanges: vscode.Range[];
    constructor(item: vscode.CallHierarchyItem, fromRanges: vscode.Range[]);
}
export declare enum LanguageStatusSeverity {
    Information = 0,
    Warning = 1,
    Error = 2
}
export declare class CodeLens {
    range: Range;
    command: vscode.Command | undefined;
    constructor(range: Range, command?: vscode.Command);
    get isResolved(): boolean;
}
export declare class MarkdownString implements vscode.MarkdownString {
    #private;
    static isMarkdownString(thing: any): thing is vscode.MarkdownString;
    constructor(value?: string, supportThemeIcons?: boolean);
    get value(): string;
    set value(value: string);
    get isTrusted(): boolean | MarkdownStringTrustedOptions | undefined;
    set isTrusted(value: boolean | MarkdownStringTrustedOptions | undefined);
    get supportThemeIcons(): boolean | undefined;
    set supportThemeIcons(value: boolean | undefined);
    get supportHtml(): boolean | undefined;
    set supportHtml(value: boolean | undefined);
    get baseUri(): vscode.Uri | undefined;
    set baseUri(value: vscode.Uri | undefined);
    appendText(value: string): vscode.MarkdownString;
    appendMarkdown(value: string): vscode.MarkdownString;
    appendCodeblock(value: string, language?: string): vscode.MarkdownString;
}
export declare class ParameterInformation {
    label: string | [number, number];
    documentation?: string | vscode.MarkdownString;
    constructor(label: string | [number, number], documentation?: string | vscode.MarkdownString);
}
export declare class SignatureInformation {
    label: string;
    documentation?: string | vscode.MarkdownString;
    parameters: ParameterInformation[];
    activeParameter?: number;
    constructor(label: string, documentation?: string | vscode.MarkdownString);
}
export declare class SignatureHelp {
    signatures: SignatureInformation[];
    activeSignature: number;
    activeParameter: number;
    constructor();
}
export declare enum SignatureHelpTriggerKind {
    Invoke = 1,
    TriggerCharacter = 2,
    ContentChange = 3
}
export declare enum InlayHintKind {
    Type = 1,
    Parameter = 2
}
export declare class InlayHintLabelPart {
    value: string;
    tooltip?: string | vscode.MarkdownString;
    location?: Location;
    command?: vscode.Command;
    constructor(value: string);
}
export declare class InlayHint implements vscode.InlayHint {
    label: string | InlayHintLabelPart[];
    tooltip?: string | vscode.MarkdownString;
    position: Position;
    textEdits?: TextEdit[];
    kind?: vscode.InlayHintKind;
    paddingLeft?: boolean;
    paddingRight?: boolean;
    constructor(position: Position, label: string | InlayHintLabelPart[], kind?: vscode.InlayHintKind);
}
export declare enum CompletionTriggerKind {
    Invoke = 0,
    TriggerCharacter = 1,
    TriggerForIncompleteCompletions = 2
}
export interface CompletionContext {
    readonly triggerKind: CompletionTriggerKind;
    readonly triggerCharacter: string | undefined;
}
export declare enum CompletionItemKind {
    Text = 0,
    Method = 1,
    Function = 2,
    Constructor = 3,
    Field = 4,
    Variable = 5,
    Class = 6,
    Interface = 7,
    Module = 8,
    Property = 9,
    Unit = 10,
    Value = 11,
    Enum = 12,
    Keyword = 13,
    Snippet = 14,
    Color = 15,
    File = 16,
    Reference = 17,
    Folder = 18,
    EnumMember = 19,
    Constant = 20,
    Struct = 21,
    Event = 22,
    Operator = 23,
    TypeParameter = 24,
    User = 25,
    Issue = 26
}
export declare enum CompletionItemTag {
    Deprecated = 1
}
export interface CompletionItemLabel {
    label: string;
    detail?: string;
    description?: string;
}
export declare class CompletionItem implements vscode.CompletionItem {
    label: string | CompletionItemLabel;
    kind?: CompletionItemKind;
    tags?: CompletionItemTag[];
    detail?: string;
    documentation?: string | vscode.MarkdownString;
    sortText?: string;
    filterText?: string;
    preselect?: boolean;
    insertText?: string | SnippetString;
    keepWhitespace?: boolean;
    range?: Range | {
        inserting: Range;
        replacing: Range;
    };
    commitCharacters?: string[];
    textEdit?: TextEdit;
    additionalTextEdits?: TextEdit[];
    command?: vscode.Command;
    constructor(label: string | CompletionItemLabel, kind?: CompletionItemKind);
    toJSON(): any;
}
export declare class CompletionList {
    isIncomplete?: boolean;
    items: vscode.CompletionItem[];
    constructor(items?: vscode.CompletionItem[], isIncomplete?: boolean);
}
export declare class InlineSuggestion implements vscode.InlineCompletionItem {
    filterText?: string;
    insertText: string;
    range?: Range;
    command?: vscode.Command;
    constructor(insertText: string, range?: Range, command?: vscode.Command);
}
export declare class InlineSuggestionList implements vscode.InlineCompletionList {
    items: vscode.InlineCompletionItem[];
    commands: (vscode.Command | {
        command: vscode.Command;
        icon: vscode.ThemeIcon;
    })[] | undefined;
    suppressSuggestions: boolean | undefined;
    constructor(items: vscode.InlineCompletionItem[]);
}
export interface PartialAcceptInfo {
    kind: PartialAcceptTriggerKind;
    acceptedLength: number;
}
export declare enum PartialAcceptTriggerKind {
    Unknown = 0,
    Word = 1,
    Line = 2,
    Suggest = 3
}
export declare enum InlineCompletionEndOfLifeReasonKind {
    Accepted = 0,
    Rejected = 1,
    Ignored = 2
}
export declare enum ViewColumn {
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
    Nine = 9
}
export declare enum StatusBarAlignment {
    Left = 1,
    Right = 2
}
export declare function asStatusBarItemIdentifier(extension: ExtensionIdentifier, id: string): string;
export declare enum TextEditorLineNumbersStyle {
    Off = 0,
    On = 1,
    Relative = 2,
    Interval = 3
}
export declare enum TextDocumentSaveReason {
    Manual = 1,
    AfterDelay = 2,
    FocusOut = 3
}
export declare enum TextEditorRevealType {
    Default = 0,
    InCenter = 1,
    InCenterIfOutsideViewport = 2,
    AtTop = 3
}
export declare enum TextEditorSelectionChangeKind {
    Keyboard = 1,
    Mouse = 2,
    Command = 3
}
export declare enum TextEditorChangeKind {
    Addition = 1,
    Deletion = 2,
    Modification = 3
}
export declare enum TextDocumentChangeReason {
    Undo = 1,
    Redo = 2
}
/**
 * These values match very carefully the values of `TrackedRangeStickiness`
 */
export declare enum DecorationRangeBehavior {
    /**
     * TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges
     */
    OpenOpen = 0,
    /**
     * TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
     */
    ClosedClosed = 1,
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingBefore
     */
    OpenClosed = 2,
    /**
     * TrackedRangeStickiness.GrowsOnlyWhenTypingAfter
     */
    ClosedOpen = 3
}
export declare namespace TextEditorSelectionChangeKind {
    function fromValue(s: TextEditorSelectionSource | string | undefined): TextEditorSelectionChangeKind | undefined;
}
export declare enum SyntaxTokenType {
    Other = 0,
    Comment = 1,
    String = 2,
    RegEx = 3
}
export declare namespace SyntaxTokenType {
    function toString(v: SyntaxTokenType | unknown): 'other' | 'comment' | 'string' | 'regex';
}
export declare class DocumentLink {
    range: Range;
    target?: URI;
    tooltip?: string;
    constructor(range: Range, target: URI | undefined);
}
export declare class Color {
    readonly red: number;
    readonly green: number;
    readonly blue: number;
    readonly alpha: number;
    constructor(red: number, green: number, blue: number, alpha: number);
}
export type IColorFormat = string | {
    opaque: string;
    transparent: string;
};
export declare class ColorInformation {
    range: Range;
    color: Color;
    constructor(range: Range, color: Color);
}
export declare class ColorPresentation {
    label: string;
    textEdit?: TextEdit;
    additionalTextEdits?: TextEdit[];
    constructor(label: string);
}
export declare enum ColorFormat {
    RGB = 0,
    HEX = 1,
    HSL = 2
}
export declare enum SourceControlInputBoxValidationType {
    Error = 0,
    Warning = 1,
    Information = 2
}
export declare enum TerminalExitReason {
    Unknown = 0,
    Shutdown = 1,
    Process = 2,
    User = 3,
    Extension = 4
}
export declare enum TerminalShellExecutionCommandLineConfidence {
    Low = 0,
    Medium = 1,
    High = 2
}
export declare enum TerminalShellType {
    Sh = 1,
    Bash = 2,
    Fish = 3,
    Csh = 4,
    Ksh = 5,
    Zsh = 6,
    CommandPrompt = 7,
    GitBash = 8,
    PowerShell = 9,
    Python = 10,
    Julia = 11,
    NuShell = 12,
    Node = 13
}
export declare class TerminalLink implements vscode.TerminalLink {
    startIndex: number;
    length: number;
    tooltip?: string | undefined;
    constructor(startIndex: number, length: number, tooltip?: string | undefined);
}
export declare class TerminalQuickFixOpener {
    uri: vscode.Uri;
    constructor(uri: vscode.Uri);
}
export declare class TerminalQuickFixCommand {
    terminalCommand: string;
    constructor(terminalCommand: string);
}
export declare enum TerminalLocation {
    Panel = 1,
    Editor = 2
}
export declare class TerminalProfile implements vscode.TerminalProfile {
    options: vscode.TerminalOptions | vscode.ExtensionTerminalOptions;
    constructor(options: vscode.TerminalOptions | vscode.ExtensionTerminalOptions);
}
export declare enum TerminalCompletionItemKind {
    File = 0,
    Folder = 1,
    Method = 2,
    Alias = 3,
    Argument = 4,
    Option = 5,
    OptionValue = 6,
    Flag = 7,
    SymbolicLinkFile = 8,
    SymbolicLinkFolder = 9
}
export declare class TerminalCompletionItem implements vscode.TerminalCompletionItem {
    label: string | CompletionItemLabel;
    icon?: ThemeIcon | undefined;
    detail?: string | undefined;
    documentation?: string | vscode.MarkdownString | undefined;
    isFile?: boolean | undefined;
    isDirectory?: boolean | undefined;
    isKeyword?: boolean | undefined;
    replacementIndex: number;
    replacementLength: number;
    constructor(label: string | CompletionItemLabel, icon?: ThemeIcon, detail?: string, documentation?: string | vscode.MarkdownString, isFile?: boolean, isDirectory?: boolean, isKeyword?: boolean, replacementIndex?: number, replacementLength?: number);
}
/**
 * Represents a collection of {@link CompletionItem completion items} to be presented
 * in the editor.
 */
export declare class TerminalCompletionList<T extends TerminalCompletionItem = TerminalCompletionItem> {
    /**
     * Resources should be shown in the completions list
     */
    resourceRequestConfig?: TerminalResourceRequestConfig;
    /**
     * The completion items.
     */
    items: T[];
    /**
     * Creates a new completion list.
     *
     * @param items The completion items.
     * @param isIncomplete The list is not complete.
     */
    constructor(items?: T[], resourceRequestConfig?: TerminalResourceRequestConfig);
}
export interface TerminalResourceRequestConfig {
    filesRequested?: boolean;
    foldersRequested?: boolean;
    fileExtensions?: string[];
    cwd?: vscode.Uri;
}
export declare enum TaskRevealKind {
    Always = 1,
    Silent = 2,
    Never = 3
}
export declare enum TaskEventKind {
    /** Indicates a task's properties or configuration have changed */
    Changed = "changed",
    /** Indicates a task has begun executing */
    ProcessStarted = "processStarted",
    /** Indicates a task process has completed */
    ProcessEnded = "processEnded",
    /** Indicates a task was terminated, either by user action or by the system */
    Terminated = "terminated",
    /** Indicates a task has started running */
    Start = "start",
    /** Indicates a task has acquired all needed input/variables to execute */
    AcquiredInput = "acquiredInput",
    /** Indicates a dependent task has started */
    DependsOnStarted = "dependsOnStarted",
    /** Indicates a task is actively running/processing */
    Active = "active",
    /** Indicates a task is paused/waiting but not complete */
    Inactive = "inactive",
    /** Indicates a task has completed fully */
    End = "end",
    /** Indicates the task's problem matcher has started */
    ProblemMatcherStarted = "problemMatcherStarted",
    /** Indicates the task's problem matcher has ended without errors */
    ProblemMatcherEnded = "problemMatcherEnded",
    /** Indicates the task's problem matcher has ended with errors */
    ProblemMatcherFoundErrors = "problemMatcherFoundErrors"
}
export declare enum TaskPanelKind {
    Shared = 1,
    Dedicated = 2,
    New = 3
}
export declare class TaskGroup implements vscode.TaskGroup {
    readonly label: string;
    isDefault: boolean | undefined;
    private _id;
    static Clean: TaskGroup;
    static Build: TaskGroup;
    static Rebuild: TaskGroup;
    static Test: TaskGroup;
    static from(value: string): TaskGroup | undefined;
    constructor(id: string, label: string);
    get id(): string;
}
export declare class ProcessExecution implements vscode.ProcessExecution {
    private _process;
    private _args;
    private _options;
    constructor(process: string, options?: vscode.ProcessExecutionOptions);
    constructor(process: string, args: string[], options?: vscode.ProcessExecutionOptions);
    get process(): string;
    set process(value: string);
    get args(): string[];
    set args(value: string[]);
    get options(): vscode.ProcessExecutionOptions | undefined;
    set options(value: vscode.ProcessExecutionOptions | undefined);
    computeId(): string;
}
export declare class ShellExecution implements vscode.ShellExecution {
    private _commandLine;
    private _command;
    private _args;
    private _options;
    constructor(commandLine: string, options?: vscode.ShellExecutionOptions);
    constructor(command: string | vscode.ShellQuotedString, args: (string | vscode.ShellQuotedString)[], options?: vscode.ShellExecutionOptions);
    get commandLine(): string | undefined;
    set commandLine(value: string | undefined);
    get command(): string | vscode.ShellQuotedString;
    set command(value: string | vscode.ShellQuotedString);
    get args(): (string | vscode.ShellQuotedString)[];
    set args(value: (string | vscode.ShellQuotedString)[] | undefined);
    get options(): vscode.ShellExecutionOptions | undefined;
    set options(value: vscode.ShellExecutionOptions | undefined);
    computeId(): string;
}
export declare enum ShellQuoting {
    Escape = 1,
    Strong = 2,
    Weak = 3
}
export declare enum TaskScope {
    Global = 1,
    Workspace = 2
}
export declare class CustomExecution implements vscode.CustomExecution {
    private _callback;
    constructor(callback: (resolvedDefinition: vscode.TaskDefinition) => Thenable<vscode.Pseudoterminal>);
    computeId(): string;
    set callback(value: (resolvedDefinition: vscode.TaskDefinition) => Thenable<vscode.Pseudoterminal>);
    get callback(): ((resolvedDefinition: vscode.TaskDefinition) => Thenable<vscode.Pseudoterminal>);
}
export declare class Task implements vscode.Task {
    private static ExtensionCallbackType;
    private static ProcessType;
    private static ShellType;
    private static EmptyType;
    private __id;
    private __deprecated;
    private _definition;
    private _scope;
    private _name;
    private _execution;
    private _problemMatchers;
    private _hasDefinedMatchers;
    private _isBackground;
    private _source;
    private _group;
    private _presentationOptions;
    private _runOptions;
    private _detail;
    constructor(definition: vscode.TaskDefinition, name: string, source: string, execution?: ProcessExecution | ShellExecution | CustomExecution, problemMatchers?: string | string[]);
    constructor(definition: vscode.TaskDefinition, scope: vscode.TaskScope.Global | vscode.TaskScope.Workspace | vscode.WorkspaceFolder, name: string, source: string, execution?: ProcessExecution | ShellExecution | CustomExecution, problemMatchers?: string | string[]);
    get _id(): string | undefined;
    set _id(value: string | undefined);
    get _deprecated(): boolean;
    private clear;
    private computeDefinitionBasedOnExecution;
    get definition(): vscode.TaskDefinition;
    set definition(value: vscode.TaskDefinition);
    get scope(): vscode.TaskScope.Global | vscode.TaskScope.Workspace | vscode.WorkspaceFolder | undefined;
    set target(value: vscode.TaskScope.Global | vscode.TaskScope.Workspace | vscode.WorkspaceFolder);
    get name(): string;
    set name(value: string);
    get execution(): ProcessExecution | ShellExecution | CustomExecution | undefined;
    set execution(value: ProcessExecution | ShellExecution | CustomExecution | undefined);
    get problemMatchers(): string[];
    set problemMatchers(value: string[]);
    get hasDefinedMatchers(): boolean;
    get isBackground(): boolean;
    set isBackground(value: boolean);
    get source(): string;
    set source(value: string);
    get group(): TaskGroup | undefined;
    set group(value: TaskGroup | undefined);
    get detail(): string | undefined;
    set detail(value: string | undefined);
    get presentationOptions(): vscode.TaskPresentationOptions;
    set presentationOptions(value: vscode.TaskPresentationOptions);
    get runOptions(): vscode.RunOptions;
    set runOptions(value: vscode.RunOptions);
}
export declare enum ProgressLocation {
    SourceControl = 1,
    Window = 10,
    Notification = 15
}
export declare namespace ViewBadge {
    function isViewBadge(thing: any): thing is vscode.ViewBadge;
}
export declare class TreeItem {
    collapsibleState: vscode.TreeItemCollapsibleState;
    label?: string | vscode.TreeItemLabel;
    resourceUri?: URI;
    iconPath?: string | URI | {
        light: string | URI;
        dark: string | URI;
    } | ThemeIcon;
    command?: vscode.Command;
    contextValue?: string;
    tooltip?: string | vscode.MarkdownString;
    checkboxState?: vscode.TreeItemCheckboxState;
    static isTreeItem(thing: any, extension: IExtensionDescription): thing is TreeItem;
    constructor(label: string | vscode.TreeItemLabel, collapsibleState?: vscode.TreeItemCollapsibleState);
    constructor(resourceUri: URI, collapsibleState?: vscode.TreeItemCollapsibleState);
}
export declare enum TreeItemCollapsibleState {
    None = 0,
    Collapsed = 1,
    Expanded = 2
}
export declare enum TreeItemCheckboxState {
    Unchecked = 0,
    Checked = 1
}
export declare class DataTransferItem implements vscode.DataTransferItem {
    readonly value: any;
    asString(): Promise<string>;
    asFile(): undefined | vscode.DataTransferFile;
    constructor(value: any);
}
/**
 * A data transfer item that has been created by VS Code instead of by a extension.
 *
 * Intentionally not exported to extensions.
 */
export declare class InternalDataTransferItem extends DataTransferItem {
}
/**
 * A data transfer item for a file.
 *
 * Intentionally not exported to extensions as only we can create these.
 */
export declare class InternalFileDataTransferItem extends InternalDataTransferItem {
    #private;
    constructor(file: vscode.DataTransferFile);
    asFile(): vscode.DataTransferFile;
}
/**
 * Intentionally not exported to extensions
 */
export declare class DataTransferFile implements vscode.DataTransferFile {
    readonly name: string;
    readonly uri: vscode.Uri | undefined;
    readonly _itemId: string;
    private readonly _getData;
    constructor(name: string, uri: vscode.Uri | undefined, itemId: string, getData: () => Promise<Uint8Array>);
    data(): Promise<Uint8Array>;
}
export declare class DataTransfer implements vscode.DataTransfer {
    #private;
    constructor(init?: Iterable<readonly [string, vscode.DataTransferItem]>);
    get(mimeType: string): vscode.DataTransferItem | undefined;
    set(mimeType: string, value: vscode.DataTransferItem): void;
    forEach(callbackfn: (value: vscode.DataTransferItem, key: string, dataTransfer: DataTransfer) => void, thisArg?: unknown): void;
    [Symbol.iterator](): IterableIterator<[mimeType: string, item: vscode.DataTransferItem]>;
}
export declare class DocumentDropEdit {
    title?: string;
    id: string | undefined;
    insertText: string | SnippetString;
    additionalEdit?: WorkspaceEdit;
    kind?: DocumentDropOrPasteEditKind;
    constructor(insertText: string | SnippetString, title?: string, kind?: DocumentDropOrPasteEditKind);
}
export declare enum DocumentPasteTriggerKind {
    Automatic = 0,
    PasteAs = 1
}
export declare class DocumentDropOrPasteEditKind {
    readonly value: string;
    static Empty: DocumentDropOrPasteEditKind;
    static Text: DocumentDropOrPasteEditKind;
    static TextUpdateImports: DocumentDropOrPasteEditKind;
    private static sep;
    constructor(value: string);
    append(...parts: string[]): DocumentDropOrPasteEditKind;
    intersects(other: DocumentDropOrPasteEditKind): boolean;
    contains(other: DocumentDropOrPasteEditKind): boolean;
}
export declare class DocumentPasteEdit {
    title: string;
    insertText: string | SnippetString;
    additionalEdit?: WorkspaceEdit;
    kind: DocumentDropOrPasteEditKind;
    constructor(insertText: string | SnippetString, title: string, kind: DocumentDropOrPasteEditKind);
}
export declare class ThemeIcon {
    static File: ThemeIcon;
    static Folder: ThemeIcon;
    readonly id: string;
    readonly color?: ThemeColor;
    constructor(id: string, color?: ThemeColor);
    static isThemeIcon(thing: any): boolean;
}
export declare class ThemeColor {
    id: string;
    constructor(id: string);
}
export declare enum ConfigurationTarget {
    Global = 1,
    Workspace = 2,
    WorkspaceFolder = 3
}
export declare class RelativePattern implements IRelativePattern {
    pattern: string;
    private _base;
    get base(): string;
    set base(base: string);
    private _baseUri;
    get baseUri(): URI;
    set baseUri(baseUri: URI);
    constructor(base: vscode.WorkspaceFolder | URI | string, pattern: string);
    toJSON(): IRelativePatternDto;
}
/**
 * We want to be able to construct Breakpoints internally that have a particular id, but we don't want extensions to be
 * able to do this with the exposed Breakpoint classes in extension API.
 * We also want "instanceof" to work with debug.breakpoints and the exposed breakpoint classes.
 * And private members will be renamed in the built js, so casting to any and setting a private member is not safe.
 * So, we store internal breakpoint IDs in a WeakMap. This function must be called after constructing a Breakpoint
 * with a known id.
 */
export declare function setBreakpointId(bp: Breakpoint, id: string): void;
export declare class Breakpoint {
    private _id;
    readonly enabled: boolean;
    readonly condition?: string;
    readonly hitCondition?: string;
    readonly logMessage?: string;
    readonly mode?: string;
    protected constructor(enabled?: boolean, condition?: string, hitCondition?: string, logMessage?: string, mode?: string);
    get id(): string;
}
export declare class SourceBreakpoint extends Breakpoint {
    readonly location: Location;
    constructor(location: Location, enabled?: boolean, condition?: string, hitCondition?: string, logMessage?: string, mode?: string);
}
export declare class FunctionBreakpoint extends Breakpoint {
    readonly functionName: string;
    constructor(functionName: string, enabled?: boolean, condition?: string, hitCondition?: string, logMessage?: string, mode?: string);
}
export declare class DataBreakpoint extends Breakpoint {
    readonly label: string;
    readonly dataId: string;
    readonly canPersist: boolean;
    constructor(label: string, dataId: string, canPersist: boolean, enabled?: boolean, condition?: string, hitCondition?: string, logMessage?: string, mode?: string);
}
export declare class DebugAdapterExecutable implements vscode.DebugAdapterExecutable {
    readonly command: string;
    readonly args: string[];
    readonly options?: vscode.DebugAdapterExecutableOptions;
    constructor(command: string, args: string[], options?: vscode.DebugAdapterExecutableOptions);
}
export declare class DebugAdapterServer implements vscode.DebugAdapterServer {
    readonly port: number;
    readonly host?: string;
    constructor(port: number, host?: string);
}
export declare class DebugAdapterNamedPipeServer implements vscode.DebugAdapterNamedPipeServer {
    readonly path: string;
    constructor(path: string);
}
export declare class DebugAdapterInlineImplementation implements vscode.DebugAdapterInlineImplementation {
    readonly implementation: vscode.DebugAdapter;
    constructor(impl: vscode.DebugAdapter);
}
export declare class DebugStackFrame implements vscode.DebugStackFrame {
    readonly session: vscode.DebugSession;
    readonly threadId: number;
    readonly frameId: number;
    constructor(session: vscode.DebugSession, threadId: number, frameId: number);
}
export declare class DebugThread implements vscode.DebugThread {
    readonly session: vscode.DebugSession;
    readonly threadId: number;
    constructor(session: vscode.DebugSession, threadId: number);
}
export declare class EvaluatableExpression implements vscode.EvaluatableExpression {
    readonly range: vscode.Range;
    readonly expression?: string;
    constructor(range: vscode.Range, expression?: string);
}
export declare enum InlineCompletionTriggerKind {
    Invoke = 0,
    Automatic = 1
}
export declare enum InlineCompletionsDisposeReasonKind {
    Other = 0,
    Empty = 1,
    TokenCancellation = 2,
    LostRace = 3,
    NotTaken = 4
}
export declare class InlineValueText implements vscode.InlineValueText {
    readonly range: Range;
    readonly text: string;
    constructor(range: Range, text: string);
}
export declare class InlineValueVariableLookup implements vscode.InlineValueVariableLookup {
    readonly range: Range;
    readonly variableName?: string;
    readonly caseSensitiveLookup: boolean;
    constructor(range: Range, variableName?: string, caseSensitiveLookup?: boolean);
}
export declare class InlineValueEvaluatableExpression implements vscode.InlineValueEvaluatableExpression {
    readonly range: Range;
    readonly expression?: string;
    constructor(range: Range, expression?: string);
}
export declare class InlineValueContext implements vscode.InlineValueContext {
    readonly frameId: number;
    readonly stoppedLocation: vscode.Range;
    constructor(frameId: number, range: vscode.Range);
}
export declare enum NewSymbolNameTag {
    AIGenerated = 1
}
export declare enum NewSymbolNameTriggerKind {
    Invoke = 0,
    Automatic = 1
}
export declare class NewSymbolName implements vscode.NewSymbolName {
    readonly newSymbolName: string;
    readonly tags?: readonly vscode.NewSymbolNameTag[] | undefined;
    constructor(newSymbolName: string, tags?: readonly NewSymbolNameTag[]);
}
export declare enum FileChangeType {
    Changed = 1,
    Created = 2,
    Deleted = 3
}
export declare class FileSystemError extends Error {
    static FileExists(messageOrUri?: string | URI): FileSystemError;
    static FileNotFound(messageOrUri?: string | URI): FileSystemError;
    static FileNotADirectory(messageOrUri?: string | URI): FileSystemError;
    static FileIsADirectory(messageOrUri?: string | URI): FileSystemError;
    static NoPermissions(messageOrUri?: string | URI): FileSystemError;
    static Unavailable(messageOrUri?: string | URI): FileSystemError;
    readonly code: string;
    constructor(uriOrMessage?: string | URI, code?: FileSystemProviderErrorCode, terminator?: Function);
}
export declare class FoldingRange {
    start: number;
    end: number;
    kind?: FoldingRangeKind;
    constructor(start: number, end: number, kind?: FoldingRangeKind);
}
export declare enum FoldingRangeKind {
    Comment = 1,
    Imports = 2,
    Region = 3
}
export declare enum CommentThreadCollapsibleState {
    /**
     * Determines an item is collapsed
     */
    Collapsed = 0,
    /**
     * Determines an item is expanded
     */
    Expanded = 1
}
export declare enum CommentMode {
    Editing = 0,
    Preview = 1
}
export declare enum CommentState {
    Published = 0,
    Draft = 1
}
export declare enum CommentThreadState {
    Unresolved = 0,
    Resolved = 1
}
export declare enum CommentThreadApplicability {
    Current = 0,
    Outdated = 1
}
export declare enum CommentThreadFocus {
    Reply = 1,
    Comment = 2
}
export declare class SemanticTokensLegend {
    readonly tokenTypes: string[];
    readonly tokenModifiers: string[];
    constructor(tokenTypes: string[], tokenModifiers?: string[]);
}
export declare class SemanticTokensBuilder {
    private _prevLine;
    private _prevChar;
    private _dataIsSortedAndDeltaEncoded;
    private _data;
    private _dataLen;
    private _tokenTypeStrToInt;
    private _tokenModifierStrToInt;
    private _hasLegend;
    constructor(legend?: vscode.SemanticTokensLegend);
    push(line: number, char: number, length: number, tokenType: number, tokenModifiers?: number): void;
    push(range: Range, tokenType: string, tokenModifiers?: string[]): void;
    private _push;
    private _pushEncoded;
    private static _sortAndDeltaEncode;
    build(resultId?: string): SemanticTokens;
}
export declare class SemanticTokens {
    readonly resultId: string | undefined;
    readonly data: Uint32Array;
    constructor(data: Uint32Array, resultId?: string);
}
export declare class SemanticTokensEdit {
    readonly start: number;
    readonly deleteCount: number;
    readonly data: Uint32Array | undefined;
    constructor(start: number, deleteCount: number, data?: Uint32Array);
}
export declare class SemanticTokensEdits {
    readonly resultId: string | undefined;
    readonly edits: SemanticTokensEdit[];
    constructor(edits: SemanticTokensEdit[], resultId?: string);
}
export declare enum DebugConsoleMode {
    /**
     * Debug session should have a separate debug console.
     */
    Separate = 0,
    /**
     * Debug session should share debug console with its parent session.
     * This value has no effect for sessions which do not have a parent session.
     */
    MergeWithParent = 1
}
export declare class DebugVisualization {
    name: string;
    iconPath?: URI | {
        light: URI;
        dark: URI;
    } | ThemeIcon;
    visualization?: vscode.Command | vscode.TreeDataProvider<unknown>;
    constructor(name: string);
}
export declare enum QuickInputButtonLocation {
    Title = 1,
    Inline = 2
}
export declare class QuickInputButtons {
    static readonly Back: vscode.QuickInputButton;
    private constructor();
}
export declare enum QuickPickItemKind {
    Separator = -1,
    Default = 0
}
export declare enum InputBoxValidationSeverity {
    Info = 1,
    Warning = 2,
    Error = 3
}
export declare enum ExtensionKind {
    UI = 1,
    Workspace = 2
}
export declare class FileDecoration {
    static validate(d: FileDecoration): boolean;
    badge?: string | vscode.ThemeIcon;
    tooltip?: string;
    color?: vscode.ThemeColor;
    propagate?: boolean;
    constructor(badge?: string | ThemeIcon, tooltip?: string, color?: ThemeColor);
}
export declare class ColorTheme implements vscode.ColorTheme {
    readonly kind: ColorThemeKind;
    constructor(kind: ColorThemeKind);
}
export declare enum ColorThemeKind {
    Light = 1,
    Dark = 2,
    HighContrast = 3,
    HighContrastLight = 4
}
export declare class NotebookRange {
    static isNotebookRange(thing: any): thing is vscode.NotebookRange;
    private _start;
    private _end;
    get start(): number;
    get end(): number;
    get isEmpty(): boolean;
    constructor(start: number, end: number);
    with(change: {
        start?: number;
        end?: number;
    }): NotebookRange;
}
export declare class NotebookCellData {
    static validate(data: NotebookCellData): void;
    static isNotebookCellDataArray(value: unknown): value is vscode.NotebookCellData[];
    static isNotebookCellData(value: unknown): value is vscode.NotebookCellData;
    kind: NotebookCellKind;
    value: string;
    languageId: string;
    mime?: string;
    outputs?: vscode.NotebookCellOutput[];
    metadata?: Record<string, any>;
    executionSummary?: vscode.NotebookCellExecutionSummary;
    constructor(kind: NotebookCellKind, value: string, languageId: string, mime?: string, outputs?: vscode.NotebookCellOutput[], metadata?: Record<string, any>, executionSummary?: vscode.NotebookCellExecutionSummary);
}
export declare class NotebookData {
    cells: NotebookCellData[];
    metadata?: {
        [key: string]: any;
    };
    constructor(cells: NotebookCellData[]);
}
export declare class NotebookCellOutputItem {
    #private;
    data: Uint8Array;
    mime: string;
    static isNotebookCellOutputItem(obj: unknown): obj is vscode.NotebookCellOutputItem;
    static error(err: Error | {
        name: string;
        message?: string;
        stack?: string;
    }): NotebookCellOutputItem;
    static stdout(value: string): NotebookCellOutputItem;
    static stderr(value: string): NotebookCellOutputItem;
    static bytes(value: Uint8Array, mime?: string): NotebookCellOutputItem;
    static text(value: string, mime?: string): NotebookCellOutputItem;
    static json(value: any, mime?: string): NotebookCellOutputItem;
    constructor(data: Uint8Array, mime: string);
}
export declare class NotebookCellOutput {
    static isNotebookCellOutput(candidate: any): candidate is vscode.NotebookCellOutput;
    static ensureUniqueMimeTypes(items: NotebookCellOutputItem[], warn?: boolean): NotebookCellOutputItem[];
    id: string;
    items: NotebookCellOutputItem[];
    metadata?: Record<string, any>;
    constructor(items: NotebookCellOutputItem[], idOrMetadata?: string | Record<string, any>, metadata?: Record<string, any>);
}
export declare class CellErrorStackFrame {
    label: string;
    uri?: vscode.Uri | undefined;
    position?: Position | undefined;
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label: string, uri?: vscode.Uri | undefined, position?: Position | undefined);
}
export declare enum NotebookCellKind {
    Markup = 1,
    Code = 2
}
export declare enum NotebookCellExecutionState {
    Idle = 1,
    Pending = 2,
    Executing = 3
}
export declare enum NotebookCellStatusBarAlignment {
    Left = 1,
    Right = 2
}
export declare enum NotebookEditorRevealType {
    Default = 0,
    InCenter = 1,
    InCenterIfOutsideViewport = 2,
    AtTop = 3
}
export declare class NotebookCellStatusBarItem {
    text: string;
    alignment: NotebookCellStatusBarAlignment;
    constructor(text: string, alignment: NotebookCellStatusBarAlignment);
}
export declare enum NotebookControllerAffinity {
    Default = 1,
    Preferred = 2
}
export declare enum NotebookControllerAffinity2 {
    Default = 1,
    Preferred = 2,
    Hidden = -1
}
export declare class NotebookRendererScript {
    uri: vscode.Uri;
    provides: readonly string[];
    constructor(uri: vscode.Uri, provides?: string | readonly string[]);
}
export declare class NotebookKernelSourceAction {
    label: string;
    description?: string;
    detail?: string;
    command?: vscode.Command;
    constructor(label: string);
}
export declare enum NotebookVariablesRequestKind {
    Named = 1,
    Indexed = 2
}
export declare class TimelineItem implements vscode.TimelineItem {
    label: string;
    timestamp: number;
    constructor(label: string, timestamp: number);
}
export declare enum ExtensionMode {
    /**
     * The extension is installed normally (for example, from the marketplace
     * or VSIX) in VS Code.
     */
    Production = 1,
    /**
     * The extension is running from an `--extensionDevelopmentPath` provided
     * when launching VS Code.
     */
    Development = 2,
    /**
     * The extension is running from an `--extensionDevelopmentPath` and
     * the extension host is running unit tests.
     */
    Test = 3
}
export declare enum ExtensionRuntime {
    /**
     * The extension is running in a NodeJS extension host. Runtime access to NodeJS APIs is available.
     */
    Node = 1,
    /**
     * The extension is running in a Webworker extension host. Runtime access is limited to Webworker APIs.
     */
    Webworker = 2
}
export declare enum StandardTokenType {
    Other = 0,
    Comment = 1,
    String = 2,
    RegEx = 3
}
export declare class LinkedEditingRanges {
    readonly ranges: Range[];
    readonly wordPattern?: RegExp | undefined;
    constructor(ranges: Range[], wordPattern?: RegExp | undefined);
}
export declare class PortAttributes {
    private _autoForwardAction;
    constructor(autoForwardAction: PortAutoForwardAction);
    get autoForwardAction(): PortAutoForwardAction;
}
export declare enum TestResultState {
    Queued = 1,
    Running = 2,
    Passed = 3,
    Failed = 4,
    Skipped = 5,
    Errored = 6
}
export declare enum TestRunProfileKind {
    Run = 1,
    Debug = 2,
    Coverage = 3
}
export declare class TestRunProfileBase {
    readonly controllerId: string;
    readonly profileId: number;
    readonly kind: vscode.TestRunProfileKind;
    constructor(controllerId: string, profileId: number, kind: vscode.TestRunProfileKind);
}
export declare class TestRunRequest implements vscode.TestRunRequest {
    readonly include: vscode.TestItem[] | undefined;
    readonly exclude: vscode.TestItem[] | undefined;
    readonly profile: vscode.TestRunProfile | undefined;
    readonly continuous: boolean;
    readonly preserveFocus: boolean;
    constructor(include?: vscode.TestItem[] | undefined, exclude?: vscode.TestItem[] | undefined, profile?: vscode.TestRunProfile | undefined, continuous?: boolean, preserveFocus?: boolean);
}
export declare class TestMessage implements vscode.TestMessage {
    message: string | vscode.MarkdownString;
    expectedOutput?: string;
    actualOutput?: string;
    location?: vscode.Location;
    contextValue?: string;
    /** proposed: */
    stackTrace?: TestMessageStackFrame[];
    static diff(message: string | vscode.MarkdownString, expected: string, actual: string): TestMessage;
    constructor(message: string | vscode.MarkdownString);
}
export declare class TestTag implements vscode.TestTag {
    readonly id: string;
    constructor(id: string);
}
export declare class TestMessageStackFrame {
    label: string;
    uri?: vscode.Uri | undefined;
    position?: Position | undefined;
    /**
     * @param label The name of the stack frame
     * @param file The file URI of the stack frame
     * @param position The position of the stack frame within the file
     */
    constructor(label: string, uri?: vscode.Uri | undefined, position?: Position | undefined);
}
export declare class TestCoverageCount implements vscode.TestCoverageCount {
    covered: number;
    total: number;
    constructor(covered: number, total: number);
}
export declare function validateTestCoverageCount(cc?: vscode.TestCoverageCount): void;
export declare class FileCoverage implements vscode.FileCoverage {
    readonly uri: vscode.Uri;
    statementCoverage: vscode.TestCoverageCount;
    branchCoverage?: vscode.TestCoverageCount | undefined;
    declarationCoverage?: vscode.TestCoverageCount | undefined;
    includesTests: vscode.TestItem[];
    static fromDetails(uri: vscode.Uri, details: vscode.FileCoverageDetail[]): vscode.FileCoverage;
    detailedCoverage?: vscode.FileCoverageDetail[];
    constructor(uri: vscode.Uri, statementCoverage: vscode.TestCoverageCount, branchCoverage?: vscode.TestCoverageCount | undefined, declarationCoverage?: vscode.TestCoverageCount | undefined, includesTests?: vscode.TestItem[]);
}
export declare class StatementCoverage implements vscode.StatementCoverage {
    executed: number | boolean;
    location: Position | Range;
    branches: vscode.BranchCoverage[];
    get executionCount(): number;
    set executionCount(n: number);
    constructor(executed: number | boolean, location: Position | Range, branches?: vscode.BranchCoverage[]);
}
export declare class BranchCoverage implements vscode.BranchCoverage {
    executed: number | boolean;
    location: Position | Range;
    label?: string | undefined;
    get executionCount(): number;
    set executionCount(n: number);
    constructor(executed: number | boolean, location: Position | Range, label?: string | undefined);
}
export declare class DeclarationCoverage implements vscode.DeclarationCoverage {
    readonly name: string;
    executed: number | boolean;
    location: Position | Range;
    get executionCount(): number;
    set executionCount(n: number);
    constructor(name: string, executed: number | boolean, location: Position | Range);
}
export declare enum ExternalUriOpenerPriority {
    None = 0,
    Option = 1,
    Default = 2,
    Preferred = 3
}
export declare enum WorkspaceTrustState {
    Untrusted = 0,
    Trusted = 1,
    Unspecified = 2
}
export declare enum PortAutoForwardAction {
    Notify = 1,
    OpenBrowser = 2,
    OpenPreview = 3,
    Silent = 4,
    Ignore = 5,
    OpenBrowserOnce = 6
}
export declare class TypeHierarchyItem {
    _sessionId?: string;
    _itemId?: string;
    kind: SymbolKind;
    tags?: SymbolTag[];
    name: string;
    detail?: string;
    uri: URI;
    range: Range;
    selectionRange: Range;
    constructor(kind: SymbolKind, name: string, detail: string, uri: URI, range: Range, selectionRange: Range);
}
export declare class TextTabInput {
    readonly uri: URI;
    constructor(uri: URI);
}
export declare class TextDiffTabInput {
    readonly original: URI;
    readonly modified: URI;
    constructor(original: URI, modified: URI);
}
export declare class TextMergeTabInput {
    readonly base: URI;
    readonly input1: URI;
    readonly input2: URI;
    readonly result: URI;
    constructor(base: URI, input1: URI, input2: URI, result: URI);
}
export declare class CustomEditorTabInput {
    readonly uri: URI;
    readonly viewType: string;
    constructor(uri: URI, viewType: string);
}
export declare class WebviewEditorTabInput {
    readonly viewType: string;
    constructor(viewType: string);
}
export declare class NotebookEditorTabInput {
    readonly uri: URI;
    readonly notebookType: string;
    constructor(uri: URI, notebookType: string);
}
export declare class NotebookDiffEditorTabInput {
    readonly original: URI;
    readonly modified: URI;
    readonly notebookType: string;
    constructor(original: URI, modified: URI, notebookType: string);
}
export declare class TerminalEditorTabInput {
    constructor();
}
export declare class InteractiveWindowInput {
    readonly uri: URI;
    readonly inputBoxUri: URI;
    constructor(uri: URI, inputBoxUri: URI);
}
export declare class ChatEditorTabInput {
    constructor();
}
export declare class TextMultiDiffTabInput {
    readonly textDiffs: TextDiffTabInput[];
    constructor(textDiffs: TextDiffTabInput[]);
}
export declare enum InteractiveSessionVoteDirection {
    Down = 0,
    Up = 1
}
export declare enum ChatCopyKind {
    Action = 1,
    Toolbar = 2
}
export declare enum ChatVariableLevel {
    Short = 1,
    Medium = 2,
    Full = 3
}
export declare class ChatCompletionItem implements vscode.ChatCompletionItem {
    id: string;
    label: string | CompletionItemLabel;
    fullName?: string | undefined;
    icon?: vscode.ThemeIcon;
    insertText?: string;
    values: vscode.ChatVariableValue[];
    detail?: string;
    documentation?: string | MarkdownString;
    command?: vscode.Command;
    constructor(id: string, label: string | CompletionItemLabel, values: vscode.ChatVariableValue[]);
}
export declare enum ChatEditingSessionActionOutcome {
    Accepted = 1,
    Rejected = 2,
    Saved = 3
}
export declare enum ChatRequestEditedFileEventKind {
    Keep = 1,
    Undo = 2,
    UserModification = 3
}
export declare enum InteractiveEditorResponseFeedbackKind {
    Unhelpful = 0,
    Helpful = 1,
    Undone = 2,
    Accepted = 3,
    Bug = 4
}
export declare enum ChatResultFeedbackKind {
    Unhelpful = 0,
    Helpful = 1
}
export declare class ChatResponseMarkdownPart {
    value: vscode.MarkdownString;
    constructor(value: string | vscode.MarkdownString);
}
/**
 * TODO if 'vulnerabilities' is finalized, this should be merged with the base ChatResponseMarkdownPart. I just don't see how to do that while keeping
 * vulnerabilities in a seperate API proposal in a clean way.
 */
export declare class ChatResponseMarkdownWithVulnerabilitiesPart {
    value: vscode.MarkdownString;
    vulnerabilities: vscode.ChatVulnerability[];
    constructor(value: string | vscode.MarkdownString, vulnerabilities: vscode.ChatVulnerability[]);
}
export declare class ChatResponseConfirmationPart {
    title: string;
    message: string;
    data: any;
    buttons?: string[];
    constructor(title: string, message: string, data: any, buttons?: string[]);
}
export declare class ChatResponseFileTreePart {
    value: vscode.ChatResponseFileTree[];
    baseUri: vscode.Uri;
    constructor(value: vscode.ChatResponseFileTree[], baseUri: vscode.Uri);
}
export declare class ChatResponseAnchorPart implements vscode.ChatResponseAnchorPart {
    value: vscode.Uri | vscode.Location;
    title?: string;
    value2: vscode.Uri | vscode.Location | vscode.SymbolInformation;
    resolve?(token: vscode.CancellationToken): Thenable<void>;
    constructor(value: vscode.Uri | vscode.Location | vscode.SymbolInformation, title?: string);
}
export declare class ChatResponseProgressPart {
    value: string;
    constructor(value: string);
}
export declare class ChatResponseProgressPart2 {
    value: string;
    task?: (progress: vscode.Progress<vscode.ChatResponseWarningPart>) => Thenable<string | void>;
    constructor(value: string, task?: (progress: vscode.Progress<vscode.ChatResponseWarningPart>) => Thenable<string | void>);
}
export declare class ChatResponseWarningPart {
    value: vscode.MarkdownString;
    constructor(value: string | vscode.MarkdownString);
}
export declare class ChatResponseCommandButtonPart {
    value: vscode.Command;
    constructor(value: vscode.Command);
}
export declare class ChatResponseReferencePart {
    value: vscode.Uri | vscode.Location | {
        variableName: string;
        value?: vscode.Uri | vscode.Location;
    } | string;
    iconPath?: vscode.Uri | vscode.ThemeIcon | {
        light: vscode.Uri;
        dark: vscode.Uri;
    };
    options?: {
        status?: {
            description: string;
            kind: vscode.ChatResponseReferencePartStatusKind;
        };
    };
    constructor(value: vscode.Uri | vscode.Location | {
        variableName: string;
        value?: vscode.Uri | vscode.Location;
    } | string, iconPath?: vscode.Uri | vscode.ThemeIcon | {
        light: vscode.Uri;
        dark: vscode.Uri;
    }, options?: {
        status?: {
            description: string;
            kind: vscode.ChatResponseReferencePartStatusKind;
        };
    });
}
export declare class ChatResponseCodeblockUriPart {
    isEdit?: boolean;
    value: vscode.Uri;
    constructor(value: vscode.Uri, isEdit?: boolean);
}
export declare class ChatResponseCodeCitationPart {
    value: vscode.Uri;
    license: string;
    snippet: string;
    constructor(value: vscode.Uri, license: string, snippet: string);
}
export declare class ChatResponseMovePart {
    readonly uri: vscode.Uri;
    readonly range: vscode.Range;
    constructor(uri: vscode.Uri, range: vscode.Range);
}
export declare class ChatResponseExtensionsPart {
    readonly extensions: string[];
    constructor(extensions: string[]);
}
export declare class ChatResponseTextEditPart implements vscode.ChatResponseTextEditPart {
    uri: vscode.Uri;
    edits: vscode.TextEdit[];
    isDone?: boolean;
    constructor(uri: vscode.Uri, editsOrDone: vscode.TextEdit | vscode.TextEdit[] | true);
}
export declare class ChatResponseNotebookEditPart implements vscode.ChatResponseNotebookEditPart {
    uri: vscode.Uri;
    edits: vscode.NotebookEdit[];
    isDone?: boolean;
    constructor(uri: vscode.Uri, editsOrDone: vscode.NotebookEdit | vscode.NotebookEdit[] | true);
}
export declare class ChatPrepareToolInvocationPart {
    toolName: string;
    /**
     * @param toolName The name of the tool being prepared for invocation.
     */
    constructor(toolName: string);
}
export declare class ChatRequestTurn implements vscode.ChatRequestTurn2 {
    readonly prompt: string;
    readonly command: string | undefined;
    readonly references: vscode.ChatPromptReference[];
    readonly participant: string;
    readonly toolReferences: vscode.ChatLanguageModelToolReference[];
    readonly editedFileEvents?: vscode.ChatRequestEditedFileEvent[] | undefined;
    constructor(prompt: string, command: string | undefined, references: vscode.ChatPromptReference[], participant: string, toolReferences: vscode.ChatLanguageModelToolReference[], editedFileEvents?: vscode.ChatRequestEditedFileEvent[] | undefined);
}
export declare class ChatResponseTurn implements vscode.ChatResponseTurn {
    readonly response: ReadonlyArray<ChatResponseMarkdownPart | ChatResponseFileTreePart | ChatResponseAnchorPart | ChatResponseCommandButtonPart>;
    readonly result: vscode.ChatResult;
    readonly participant: string;
    readonly command?: string | undefined;
    constructor(response: ReadonlyArray<ChatResponseMarkdownPart | ChatResponseFileTreePart | ChatResponseAnchorPart | ChatResponseCommandButtonPart>, result: vscode.ChatResult, participant: string, command?: string | undefined);
}
export declare enum ChatLocation {
    Panel = 1,
    Terminal = 2,
    Notebook = 3,
    Editor = 4
}
export declare enum ChatResponseReferencePartStatusKind {
    Complete = 1,
    Partial = 2,
    Omitted = 3
}
export declare class ChatRequestEditorData implements vscode.ChatRequestEditorData {
    readonly document: vscode.TextDocument;
    readonly selection: vscode.Selection;
    readonly wholeRange: vscode.Range;
    constructor(document: vscode.TextDocument, selection: vscode.Selection, wholeRange: vscode.Range);
}
export declare class ChatRequestNotebookData implements vscode.ChatRequestNotebookData {
    readonly cell: vscode.TextDocument;
    constructor(cell: vscode.TextDocument);
}
export declare class ChatReferenceBinaryData implements vscode.ChatReferenceBinaryData {
    mimeType: string;
    data: () => Thenable<Uint8Array>;
    reference?: vscode.Uri;
    constructor(mimeType: string, data: () => Thenable<Uint8Array>, reference?: vscode.Uri);
}
export declare class ChatReferenceDiagnostic implements vscode.ChatReferenceDiagnostic {
    readonly diagnostics: [vscode.Uri, vscode.Diagnostic[]][];
    constructor(diagnostics: [vscode.Uri, vscode.Diagnostic[]][]);
}
export declare enum LanguageModelChatMessageRole {
    User = 1,
    Assistant = 2,
    System = 3
}
export declare class LanguageModelToolResultPart implements vscode.LanguageModelToolResultPart {
    callId: string;
    content: (LanguageModelTextPart | LanguageModelPromptTsxPart | unknown)[];
    isError: boolean;
    constructor(callId: string, content: (LanguageModelTextPart | LanguageModelPromptTsxPart | unknown)[], isError?: boolean);
}
export declare class LanguageModelToolResultPart2 implements vscode.LanguageModelToolResultPart2 {
    callId: string;
    content: (LanguageModelTextPart | LanguageModelPromptTsxPart | LanguageModelDataPart | unknown)[];
    isError: boolean;
    constructor(callId: string, content: (LanguageModelTextPart | LanguageModelPromptTsxPart | LanguageModelDataPart | unknown)[], isError?: boolean);
}
export declare class PreparedTerminalToolInvocation {
    readonly command: string;
    readonly language: string;
    readonly confirmationMessages?: vscode.LanguageModelToolConfirmationMessages | undefined;
    readonly presentation?: "hidden" | undefined;
    constructor(command: string, language: string, confirmationMessages?: vscode.LanguageModelToolConfirmationMessages | undefined, presentation?: "hidden" | undefined);
}
export declare enum ChatErrorLevel {
    Info = 0,
    Warning = 1,
    Error = 2
}
export declare class LanguageModelChatMessage implements vscode.LanguageModelChatMessage {
    static User(content: string | (LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart)[], name?: string): LanguageModelChatMessage;
    static Assistant(content: string | (LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart)[], name?: string): LanguageModelChatMessage;
    role: vscode.LanguageModelChatMessageRole;
    private _content;
    set content(value: string | (LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart)[]);
    get content(): (LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart)[];
    name: string | undefined;
    constructor(role: vscode.LanguageModelChatMessageRole, content: string | (LanguageModelTextPart | LanguageModelToolResultPart | LanguageModelToolCallPart)[], name?: string);
}
export declare class LanguageModelChatMessage2 implements vscode.LanguageModelChatMessage2 {
    static User(content: string | (LanguageModelTextPart | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[], name?: string): LanguageModelChatMessage2;
    static Assistant(content: string | (LanguageModelTextPart | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[], name?: string): LanguageModelChatMessage2;
    role: vscode.LanguageModelChatMessageRole;
    private _content;
    set content(value: string | (LanguageModelTextPart | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[]);
    get content(): (LanguageModelTextPart | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[];
    set content2(value: (string | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[] | undefined);
    get content2(): (string | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[] | undefined;
    name: string | undefined;
    constructor(role: vscode.LanguageModelChatMessageRole, content: string | (LanguageModelTextPart | LanguageModelToolResultPart2 | LanguageModelToolCallPart | LanguageModelDataPart)[], name?: string);
}
export declare class LanguageModelToolCallPart implements vscode.LanguageModelToolCallPart {
    callId: string;
    name: string;
    input: any;
    constructor(callId: string, name: string, input: any);
}
export declare class LanguageModelTextPart implements vscode.LanguageModelTextPart {
    value: string;
    constructor(value: string);
    toJSON(): {
        $mid: MarshalledId;
        value: string;
    };
}
export declare class LanguageModelDataPart implements vscode.LanguageModelDataPart {
    mimeType: string;
    data: Uint8Array<ArrayBufferLike>;
    constructor(data: Uint8Array<ArrayBufferLike>, mimeType: string);
    static image(data: Uint8Array<ArrayBufferLike>, mimeType: ChatImageMimeType): vscode.LanguageModelDataPart;
    static json(value: object, mime?: string): vscode.LanguageModelDataPart;
    static text(value: string, mime?: string): vscode.LanguageModelDataPart;
    toJSON(): {
        $mid: MarshalledId;
        mimeType: string;
        data: Uint8Array<ArrayBufferLike>;
    };
}
export declare enum ChatImageMimeType {
    PNG = "image/png",
    JPEG = "image/jpeg",
    GIF = "image/gif",
    WEBP = "image/webp",
    BMP = "image/bmp"
}
export declare class LanguageModelPromptTsxPart {
    value: unknown;
    constructor(value: unknown);
    toJSON(): {
        $mid: MarshalledId;
        value: unknown;
    };
}
/**
 * @deprecated
 */
export declare class LanguageModelChatSystemMessage {
    content: string;
    constructor(content: string);
}
/**
 * @deprecated
 */
export declare class LanguageModelChatUserMessage {
    content: string;
    name: string | undefined;
    constructor(content: string, name?: string);
}
/**
 * @deprecated
 */
export declare class LanguageModelChatAssistantMessage {
    content: string;
    name?: string;
    constructor(content: string, name?: string);
}
export declare class LanguageModelError extends Error {
    #private;
    static NotFound(message?: string): LanguageModelError;
    static NoPermissions(message?: string): LanguageModelError;
    static Blocked(message?: string): LanguageModelError;
    static tryDeserialize(data: SerializedError): LanguageModelError | undefined;
    readonly code: string;
    constructor(message?: string, code?: string, cause?: Error);
}
export declare class LanguageModelToolResult {
    content: (LanguageModelTextPart | LanguageModelPromptTsxPart)[];
    constructor(content: (LanguageModelTextPart | LanguageModelPromptTsxPart)[]);
    toJSON(): {
        $mid: MarshalledId;
        content: (LanguageModelTextPart | LanguageModelPromptTsxPart)[];
    };
}
export declare class LanguageModelToolResult2 {
    content: (LanguageModelTextPart | LanguageModelPromptTsxPart | LanguageModelDataPart)[];
    constructor(content: (LanguageModelTextPart | LanguageModelPromptTsxPart | LanguageModelDataPart)[]);
    toJSON(): {
        $mid: MarshalledId;
        content: (LanguageModelTextPart | LanguageModelPromptTsxPart | LanguageModelDataPart)[];
    };
}
export declare class ExtendedLanguageModelToolResult extends LanguageModelToolResult {
}
export declare enum LanguageModelChatToolMode {
    Auto = 1,
    Required = 2
}
export declare enum RelatedInformationType {
    SymbolInformation = 1,
    CommandInformation = 2,
    SearchInformation = 3,
    SettingInformation = 4
}
export declare enum SettingsSearchResultKind {
    EMBEDDED = 1,
    LLM_RANKED = 2,
    CANCELED = 3
}
export declare enum SpeechToTextStatus {
    Started = 1,
    Recognizing = 2,
    Recognized = 3,
    Stopped = 4,
    Error = 5
}
export declare enum TextToSpeechStatus {
    Started = 1,
    Stopped = 2,
    Error = 3
}
export declare enum KeywordRecognitionStatus {
    Recognized = 1,
    Stopped = 2
}
export declare class McpStdioServerDefinition implements vscode.McpStdioServerDefinition {
    label: string;
    command: string;
    args: string[];
    env: Record<string, string | number | null>;
    version?: string | undefined;
    cwd?: URI;
    constructor(label: string, command: string, args: string[], env?: Record<string, string | number | null>, version?: string | undefined);
}
export declare class McpHttpServerDefinition implements vscode.McpHttpServerDefinition {
    label: string;
    uri: URI;
    headers: Record<string, string>;
    version?: string | undefined;
    constructor(label: string, uri: URI, headers?: Record<string, string>, version?: string | undefined);
}
export {};
