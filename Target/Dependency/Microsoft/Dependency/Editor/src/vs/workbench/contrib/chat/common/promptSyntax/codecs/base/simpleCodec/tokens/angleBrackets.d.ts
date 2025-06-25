import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `<` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class LeftAngleBracket extends SimpleToken<'<'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '<';
    /**
     * Return text representation of the token.
     */
    get text(): '<';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
/**
 * A token that represent a `>` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export declare class RightAngleBracket extends SimpleToken<'>'> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: '>';
    /**
     * Return text representation of the token.
     */
    get text(): '>';
    /**
     * Returns a string representation of the token.
     */
    toString(): string;
}
/**
 * General angle bracket token type.
 */
export type TAngleBracket = LeftAngleBracket | RightAngleBracket;
