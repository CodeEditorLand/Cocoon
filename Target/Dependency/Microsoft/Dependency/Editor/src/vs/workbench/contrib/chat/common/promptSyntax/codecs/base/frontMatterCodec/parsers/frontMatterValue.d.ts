import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from '../tokens/frontMatterToken.js';
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { Word, Quote, DoubleQuote, LeftBracket } from '../../simpleCodec/tokens/tokens.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
import { type FrontMatterParserFactory } from './frontMatterParserFactory.js';
/**
 * List of tokens that can start a "value" sequence.
 *
 * - {@link Word} - can be a `boolean` value
 * - {@link Quote}, {@link DoubleQuote} - can start a `string` value
 * - {@link LeftBracket} - can start an `array` value
 */
export declare const VALID_VALUE_START_TOKENS: readonly (typeof Quote | typeof DoubleQuote | typeof LeftBracket)[];
/**
 * Type alias for a token that can start a "value" sequence.
 */
type TValueStartToken = InstanceType<typeof VALID_VALUE_START_TOKENS[number]>;
/**
 * Parser responsible for parsing a "value" sequence in a Front Matter header.
 */
export declare class PartialFrontMatterValue extends ParserBase<TSimpleDecoderToken, PartialFrontMatterValue | FrontMatterValueToken> {
    private readonly factory;
    /**
     * Callback function to pass to the {@link PartialFrontMatterSequence}
     * if the current "value" sequence is not of a specific type.
     */
    private readonly shouldStop;
    /**
     * Current parser reference responsible for parsing
     * a specific "value" sequence.
     */
    private currentValueParser?;
    /**
     * Get the tokens that were accumulated so far.
     */
    get tokens(): readonly TSimpleDecoderToken[];
    constructor(factory: FrontMatterParserFactory, 
    /**
     * Callback function to pass to the {@link PartialFrontMatterSequence}
     * if the current "value" sequence is not of a specific type.
     */
    shouldStop: (token: BaseToken) => boolean);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialFrontMatterValue | FrontMatterValueToken>;
    /**
     * Check if provided token can be a start of a "value" sequence.
     * See {@link VALID_VALUE_START_TOKENS} for the list of valid tokens.
     */
    static isValueStartToken(token: BaseToken): token is TValueStartToken | Word<'true' | 'false'>;
    /**
     * Check if the current 'value' sequence does not have a specific type
     * and is represented by a generic sequence of tokens ({@link PartialFrontMatterSequence}).
     */
    get isSequence(): boolean;
    /**
     * Convert current parser into a generic sequence of tokens.
     */
    asSequenceToken(): FrontMatterSequence;
}
export {};
