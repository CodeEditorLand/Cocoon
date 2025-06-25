import { IRange, Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Base class for all tokens with a `range` that reflects
 * token position in the original text.
 */
export declare abstract class BaseToken<TText extends string = string> {
    private tokenRange;
    constructor(tokenRange: Range);
    /**
     * Range of the token in the original text.
     */
    get range(): Range;
    /**
     * Text representation of the token.
     */
    abstract get text(): TText;
    /**
     * Check if this token has the same range as another one.
     */
    sameRange(other: Range): boolean;
    /**
     * Returns a string representation of the token.
     */
    abstract toString(): string;
    /**
     * Check if this token is equal to another one.
     */
    equals(other: BaseToken): other is typeof this;
    /**
     * Change `range` of the token with provided range components.
     */
    withRange(components: Partial<IRange>): this;
    /**
     * Collapse range of the token to its start position.
     * See {@link Range.collapseToStart} for more details.
     */
    collapseRangeToStart(): this;
    /**
     * Render a list of tokens into a string.
     */
    static render(tokens: readonly BaseToken[], delimiter?: string): string;
    /**
     * Returns the full range of a list of tokens in which the first token is
     * used as the start of a tokens sequence and the last token reflects the end.
     *
     * @throws if:
     * 	- provided {@link tokens} list is empty
     *  - the first token start number is greater than the start line of the last token
     *  - if the first and last token are on the same line, the first token start column must
     * 	  be smaller than the start column of the last token
     */
    static fullRange(tokens: readonly BaseToken[]): Range;
    /**
     * Shorten version of the {@link text} property.
     */
    shortText(maxLength?: number): string;
}
