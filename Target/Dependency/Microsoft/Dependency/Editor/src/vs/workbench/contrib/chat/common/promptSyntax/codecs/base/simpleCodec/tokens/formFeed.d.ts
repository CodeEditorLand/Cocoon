import { SimpleToken } from './simpleToken.js';
/**
 * Token that represent a `form feed` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class FormFeed extends SimpleToken<'\f'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '\f';
    /**
     * Return text representation of the token.
     */
    get text(): '\f';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
