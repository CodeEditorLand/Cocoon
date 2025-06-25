import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { IOffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { Location, SymbolKind } from '../../../../editor/common/languages.js';
import { MarkerSeverity, IMarker } from '../../../../platform/markers/common/markers.js';
import { ISCMHistoryItem } from '../../scm/common/history.js';
import { IChatContentReference } from './chatService.js';
import { IChatRequestVariableValue } from './chatVariables.js';
interface IBaseChatRequestVariableEntry {
    readonly id: string;
    readonly fullName?: string;
    readonly icon?: ThemeIcon;
    readonly name: string;
    readonly modelDescription?: string;
    /**
     * The offset-range in the prompt. This means this entry has been explicitly typed out
     * by the user.
     */
    readonly range?: IOffsetRange;
    readonly value: IChatRequestVariableValue;
    readonly references?: IChatContentReference[];
    omittedState?: OmittedState;
}
export interface IGenericChatRequestVariableEntry extends IBaseChatRequestVariableEntry {
    kind: 'generic';
}
export interface IChatRequestDirectoryEntry extends IBaseChatRequestVariableEntry {
    kind: 'directory';
}
export interface IChatRequestFileEntry extends IBaseChatRequestVariableEntry {
    kind: 'file';
}
export declare const enum OmittedState {
    NotOmitted = 0,
    Partial = 1,
    Full = 2
}
export interface IChatRequestToolEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'tool';
}
export interface IChatRequestToolSetEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'toolset';
    readonly value: IChatRequestToolEntry[];
}
export interface IChatRequestImplicitVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'implicit';
    readonly isFile: true;
    readonly value: URI | Location | undefined;
    readonly isSelection: boolean;
    enabled: boolean;
}
export interface IChatRequestPasteVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'paste';
    readonly code: string;
    readonly language: string;
    readonly pastedLines: string;
    readonly fileName: string;
    readonly copiedFrom: {
        readonly uri: URI;
        readonly range: IRange;
    } | undefined;
}
export interface ISymbolVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'symbol';
    readonly value: Location;
    readonly symbolKind: SymbolKind;
}
export interface ICommandResultVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'command';
}
export interface IImageVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'image';
    readonly isPasted?: boolean;
    readonly isURL?: boolean;
    readonly mimeType?: string;
}
export interface INotebookOutputVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'notebookOutput';
    readonly outputIndex?: number;
    readonly mimeType?: string;
}
export interface IDiagnosticVariableEntryFilterData {
    readonly owner?: string;
    readonly problemMessage?: string;
    readonly filterUri?: URI;
    readonly filterSeverity?: MarkerSeverity;
    readonly filterRange?: IRange;
}
export declare namespace IDiagnosticVariableEntryFilterData {
    const icon: ThemeIcon;
    function fromMarker(marker: IMarker): IDiagnosticVariableEntryFilterData;
    function toEntry(data: IDiagnosticVariableEntryFilterData): IDiagnosticVariableEntry;
    function id(data: IDiagnosticVariableEntryFilterData): string;
    function label(data: IDiagnosticVariableEntryFilterData): string;
}
export interface IDiagnosticVariableEntry extends IBaseChatRequestVariableEntry, IDiagnosticVariableEntryFilterData {
    readonly kind: 'diagnostic';
}
export interface IElementVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'element';
}
export interface IPromptFileVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'promptFile';
    readonly value: URI;
    readonly isRoot: boolean;
    readonly originLabel?: string;
    readonly modelDescription: string;
}
export interface IPromptTextVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'promptText';
    readonly value: string;
    readonly settingId?: string;
    readonly modelDescription: string;
}
export interface ISCMHistoryItemVariableEntry extends IBaseChatRequestVariableEntry {
    readonly kind: 'scmHistoryItem';
    readonly value: URI;
    readonly historyItem: ISCMHistoryItem;
}
export type IChatRequestVariableEntry = IGenericChatRequestVariableEntry | IChatRequestImplicitVariableEntry | IChatRequestPasteVariableEntry | ISymbolVariableEntry | ICommandResultVariableEntry | IDiagnosticVariableEntry | IImageVariableEntry | IChatRequestToolEntry | IChatRequestToolSetEntry | IChatRequestDirectoryEntry | IChatRequestFileEntry | INotebookOutputVariableEntry | IElementVariableEntry | IPromptFileVariableEntry | IPromptTextVariableEntry | ISCMHistoryItemVariableEntry;
export declare namespace IChatRequestVariableEntry {
    /**
     * Returns URI of the passed variant entry. Return undefined if not found.
     */
    function toUri(entry: IChatRequestVariableEntry): URI | undefined;
}
export declare function isImplicitVariableEntry(obj: IChatRequestVariableEntry): obj is IChatRequestImplicitVariableEntry;
export declare function isPasteVariableEntry(obj: IChatRequestVariableEntry): obj is IChatRequestPasteVariableEntry;
export declare function isImageVariableEntry(obj: IChatRequestVariableEntry): obj is IImageVariableEntry;
export declare function isNotebookOutputVariableEntry(obj: IChatRequestVariableEntry): obj is INotebookOutputVariableEntry;
export declare function isElementVariableEntry(obj: IChatRequestVariableEntry): obj is IElementVariableEntry;
export declare function isDiagnosticsVariableEntry(obj: IChatRequestVariableEntry): obj is IDiagnosticVariableEntry;
export declare function isChatRequestFileEntry(obj: IChatRequestVariableEntry): obj is IChatRequestFileEntry;
export declare function isPromptFileVariableEntry(obj: IChatRequestVariableEntry): obj is IPromptFileVariableEntry;
export declare function isPromptTextVariableEntry(obj: IChatRequestVariableEntry): obj is IPromptTextVariableEntry;
export declare function isChatRequestVariableEntry(obj: unknown): obj is IChatRequestVariableEntry;
export declare function isSCMHistoryItemVariableEntry(obj: IChatRequestVariableEntry): obj is ISCMHistoryItemVariableEntry;
/**
 * Utility to convert a {@link uri} to a chat variable entry.
 * The `id` of the chat variable can be one of the following:
 *
 * - `vscode.prompt.instructions__<URI>`: for all non-root prompt file references
 * - `vscode.prompt.instructions.root__<URI>`: for *root* prompt file references
 * - `<URI>`: for the rest of references(the ones that do not point to a prompt file)
 *
 * @param uri A resource URI that points to a prompt instructions file.
 * @param isRoot If the reference is the root reference in the references tree.
 * 				 This object most likely was explicitly attached by the user.
 */
export declare function toPromptFileVariableEntry(uri: URI, isRoot: boolean, originLabel?: string): IPromptFileVariableEntry;
export declare function toPromptTextVariableEntry(content: string, settingId?: string): IPromptTextVariableEntry;
export declare function toFileVariableEntry(uri: URI, range?: IRange): IChatRequestFileEntry;
export declare class ChatRequestVariableSet {
    private _ids;
    private _entries;
    constructor(entries?: IChatRequestVariableEntry[]);
    add(...entry: IChatRequestVariableEntry[]): void;
    insertFirst(entry: IChatRequestVariableEntry): void;
    remove(entry: IChatRequestVariableEntry): void;
    has(entry: IChatRequestVariableEntry): boolean;
    asArray(): IChatRequestVariableEntry[];
}
export {};
