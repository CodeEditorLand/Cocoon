import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `{` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class LeftCurlyBrace extends SimpleToken<'{'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '{';
    /**
     * Return text representation of the token.
     */
    get text(): '{';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
/**
 * A token that represent a `}` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class RightCurlyBrace extends SimpleToken<'}'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '}';
    /**
     * Return text representation of the token.
     */
    get text(): '}';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
/**
 * General curly brace token type.
 */
export type TCurlyBrace = LeftCurlyBrace | RightCurlyBrace;
