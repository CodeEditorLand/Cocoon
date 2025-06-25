import { StringEdit, StringReplacement } from '../../../common/core/edits/stringEdit.js';
import { OffsetRange } from '../../../common/core/ranges/offsetRange.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { TextEdit } from '../../../common/core/edits/textEdit.js';
import { AbstractText } from '../../../common/core/text/abstractText.js';
export declare abstract class Random {
    static readonly alphabetSmallLowercase = "abcdefgh";
    static readonly alphabetSmallUppercase = "ABCDEFGH";
    static readonly alphabetLowercase = "abcdefghijklmnopqrstuvwxyz";
    static readonly alphabetUppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    static readonly basicAlphabet: string;
    static readonly basicAlphabetMultiline: string;
    static create(seed: number): Random;
    stringGenerator(alphabet: string): IGenerator<string>;
    abstract nextIntRange(start: number, endExclusive: number): number;
    nextString(length: number, alphabet?: IGenerator<string>): string;
    nextMultiLineString(lineCount: number, lineLengthRange: OffsetRange, alphabet?: IGenerator<string>): string;
    nextConsecutiveOffsets(range: OffsetRange, count: number): number[];
    nextConsecutivePositions(source: AbstractText, count: number): Position[];
    nextRange(source: AbstractText): Range;
    nextTextEdit(target: AbstractText, singleTextEditCount: number): TextEdit;
    nextStringEdit(target: string, singleTextEditCount: number, newTextAlphabet?: string): StringEdit;
    nextSingleStringEdit(target: string, newTextAlphabet?: string): StringReplacement;
}
export declare function sequenceGenerator<T>(sequence: T[]): IGenerator<T>;
export interface IGenerator<T> {
    next(): T;
}
