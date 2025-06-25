import { SpacingToken } from './simpleToken.js';
/**
 * A token that represent a `space` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class Space extends SpacingToken<' '> {
    /**
     * The underlying symbol of the `Space` token.
     */
    static readonly symbol: ' ';
    /**
     * Return text representation of the token.
     */
    get text(): ' ';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
