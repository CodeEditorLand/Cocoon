import { BaseToken } from '../../baseToken.js';
import { Line } from '../../linesCodec/tokens/line.js';
/**
 * Interface for a class that can be instantiated into a {@link SimpleToken}.
 */
export interface ISimpleTokenClass<TSimpleToken extends SimpleToken<string>> {
    /**
     * Character representing the token.
     */
    readonly symbol: string;
    /**
     * Constructor for the token.
     */
    new (...args: any[]): TSimpleToken;
}
/**
 * Base class for all "simple" tokens with a `range`.
 * A simple token is the one that represents a single character.
 */
export declare abstract class SimpleToken<TSymbol extends string> extends BaseToken<TSymbol> {
    /**
     * The underlying symbol of the token.
     */
    static readonly symbol: string;
    /**
     * Create new token instance with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine<TSimpleToken extends SimpleToken<string>>(line: Line, atColumnNumber: number, Constructor: ISimpleTokenClass<TSimpleToken>): TSimpleToken;
}
/**
 * Base class for all tokens that represent some form of
 * a spacing character, e.g. 'space', 'tab', etc.
 */
export declare abstract class SpacingToken<TSymbol extends string = string> extends SimpleToken<TSymbol> {
}
