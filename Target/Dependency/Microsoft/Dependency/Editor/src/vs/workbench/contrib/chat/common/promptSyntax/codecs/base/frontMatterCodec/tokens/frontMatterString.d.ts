import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
import { Quote, DoubleQuote } from '../../simpleCodec/tokens/tokens.js';
/**
 * Type for any quote token that can be used to wrap a string.
 */
export type TQuoteToken = Quote | DoubleQuote;
/**
 * Token that represents a string value in a Front Matter header.
 */
export declare class FrontMatterString<TQuote extends TQuoteToken = Quote> extends FrontMatterValueToken<'quoted-string', readonly [TQuote, ...BaseToken[], TQuote]> {
    /**
     * Name of the `string` value type.
     */
    readonly valueTypeName = "quoted-string";
    /**
     * Text of the string value without the wrapping quotes.
     */
    get cleanText(): string;
    toString(): string;
}
