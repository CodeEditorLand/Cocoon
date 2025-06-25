import { OffsetRange } from '../ranges/offsetRange.js';
import { BaseEdit, BaseReplacement } from './edit.js';
/**
 * Represents a set of replacements to an array.
 * All these replacements are applied at once.
*/
export declare class ArrayEdit<T> extends BaseEdit<ArrayReplacement<T>, ArrayEdit<T>> {
    static readonly empty: ArrayEdit<never>;
    static create<T>(replacements: readonly ArrayReplacement<T>[]): ArrayEdit<T>;
    static single<T>(replacement: ArrayReplacement<T>): ArrayEdit<T>;
    static replace<T>(range: OffsetRange, replacement: readonly T[]): ArrayEdit<T>;
    static insert<T>(offset: number, replacement: readonly T[]): ArrayEdit<T>;
    static delete<T>(range: OffsetRange): ArrayEdit<T>;
    protected _createNew(replacements: readonly ArrayReplacement<T>[]): ArrayEdit<T>;
    apply(data: readonly T[]): readonly T[];
    /**
     * Creates an edit that reverts this edit.
     */
    inverse(baseVal: readonly T[]): ArrayEdit<T>;
}
export declare class ArrayReplacement<T> extends BaseReplacement<ArrayReplacement<T>> {
    readonly newValue: readonly T[];
    constructor(range: OffsetRange, newValue: readonly T[]);
    equals(other: ArrayReplacement<T>): boolean;
    getNewLength(): number;
    tryJoinTouching(other: ArrayReplacement<T>): ArrayReplacement<T> | undefined;
    slice(range: OffsetRange, rangeInReplacement: OffsetRange): ArrayReplacement<T>;
}
