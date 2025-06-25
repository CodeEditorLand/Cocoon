import { SpacingToken } from './simpleToken.js';
/**
 * Token that represent a `vertical tab` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class VerticalTab extends SpacingToken<'\v'> {
    /**
     * The underlying symbol of the `VerticalTab` token.
     */
    static readonly symbol: '\v';
    /**
     * Return text representation of the token.
     */
    get text(): '\v';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
