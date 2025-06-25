import { OffsetRange } from '../ranges/offsetRange.js';
import { BaseEdit, BaseReplacement } from './edit.js';
/**
 * Represents a set of replacements to a string.
 * All these replacements are applied at once.
*/
export declare class StringEdit extends BaseEdit<StringReplacement, StringEdit> {
    static readonly empty: StringEdit;
    static create(replacements: readonly StringReplacement[]): StringEdit;
    static single(replacement: StringReplacement): StringEdit;
    static replace(range: OffsetRange, replacement: string): StringEdit;
    static insert(offset: number, replacement: string): StringEdit;
    static delete(range: OffsetRange): StringEdit;
    static fromJson(data: ISerializedStringEdit): StringEdit;
    static compose(edits: readonly StringEdit[]): StringEdit;
    constructor(replacements: readonly StringReplacement[]);
    protected _createNew(replacements: readonly StringReplacement[]): StringEdit;
    apply(base: string): string;
    /**
     * Creates an edit that reverts this edit.
     */
    inverse(baseStr: string): StringEdit;
    /**
     * Consider `t1 := text o base` and `t2 := text o this`.
     * We are interested in `tm := tryMerge(t1, t2, base: text)`.
     * For that, we compute `tm' := t1 o base o this.rebase(base)`
     * such that `tm' === tm`.
     */
    tryRebase(base: StringEdit): StringEdit;
    tryRebase(base: StringEdit, noOverlap: true): StringEdit | undefined;
    toJson(): ISerializedStringEdit;
    isNeutralOn(text: string): boolean;
    removeCommonSuffixPrefix(originalText: string): StringEdit;
    normalizeEOL(eol: '\r\n' | '\n'): StringEdit;
}
/**
 * Warning: Be careful when changing this type, as it is used for serialization!
*/
export type ISerializedStringEdit = ISerializedStringReplacement[];
/**
 * Warning: Be careful when changing this type, as it is used for serialization!
*/
export interface ISerializedStringReplacement {
    txt: string;
    pos: number;
    len: number;
}
export declare class StringReplacement extends BaseReplacement<StringReplacement> {
    readonly newText: string;
    static insert(offset: number, text: string): StringReplacement;
    static replace(range: OffsetRange, text: string): StringReplacement;
    static delete(range: OffsetRange): StringReplacement;
    static fromJson(data: ISerializedStringReplacement): StringReplacement;
    constructor(range: OffsetRange, newText: string);
    equals(other: StringReplacement): boolean;
    getNewLength(): number;
    tryJoinTouching(other: StringReplacement): StringReplacement | undefined;
    slice(range: OffsetRange, rangeInReplacement: OffsetRange): StringReplacement;
    toString(): string;
    replace(str: string): string;
    /**
     * Checks if the edit would produce no changes when applied to the given text.
     */
    isNeutralOn(text: string): boolean;
    removeCommonSuffixPrefix(originalText: string): StringReplacement;
    normalizeEOL(eol: '\r\n' | '\n'): StringReplacement;
}
export declare function applyEditsToRanges(sortedRanges: OffsetRange[], edit: StringEdit): OffsetRange[];
