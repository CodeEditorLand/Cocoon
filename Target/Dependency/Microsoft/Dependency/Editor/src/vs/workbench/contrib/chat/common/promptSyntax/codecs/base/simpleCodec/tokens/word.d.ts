import { BaseToken } from '../../baseToken.js';
import { Line } from '../../linesCodec/tokens/line.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
/**
 * A token that represent a word - a set of continuous
 * characters without stop characters, like a `space`,
 * a `tab`, or a `new line`.
 */
export declare class Word<TText extends string = string> extends BaseToken<TText> {
    /**
     * The string value of the word.
     */
    readonly text: TText;
    constructor(
    /**
     * The word range.
     */
    range: Range, 
    /**
     * The string value of the word.
     */
    text: TText);
    /**
     * Create new `Word` token with the given `text` and the range
     * inside the given `Line` at the specified `column number`.
     */
    static newOnLine(text: string, line: Line | number, atColumnNumber: number): Word;
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
