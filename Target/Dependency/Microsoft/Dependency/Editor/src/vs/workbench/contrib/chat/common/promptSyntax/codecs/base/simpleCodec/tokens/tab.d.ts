import { SpacingToken } from './simpleToken.js';
/**
 * A token that represent a `tab` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class Tab extends SpacingToken<'\t'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '\t';
    /**
     * Return text representation of the token.
     */
    get text(): '\t';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
