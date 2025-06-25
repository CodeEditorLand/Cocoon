import { BaseToken } from '../../baseToken.js';
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `'` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class Quote extends SimpleToken<`'`> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '\'';
    /**
     * Return text representation of the token.
     */
    get text(): '\'';
    /**
     * Checks if the provided token is of the same type
     * as the current one.
     */
    sameType(other: BaseToken): other is Quote;
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
