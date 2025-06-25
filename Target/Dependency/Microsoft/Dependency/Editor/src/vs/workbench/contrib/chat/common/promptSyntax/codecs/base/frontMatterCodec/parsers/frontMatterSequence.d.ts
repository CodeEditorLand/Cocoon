import { BaseToken } from '../../baseToken.js';
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
/**
 * Parser responsible for parsing a "generic sequence of tokens"
 * of an arbitrary length in a Front Matter header.
 */
export declare class PartialFrontMatterSequence extends ParserBase<TSimpleDecoderToken, PartialFrontMatterSequence | FrontMatterSequence> {
    /**
     * Callback function that is called to check if the current token
     * should stop the parsing process of the current generic "value"
     * sequence of arbitrary tokens by returning `true`.
     *
     * When this happens, the parser *will not consume* the token that
     * was passed to the `shouldStop` callback or to its `accept` method.
     * On the other hand, the parser will be "consumed" hence using it
     * to process other tokens will yield an error.
     */
    private readonly shouldStop;
    constructor(
    /**
     * Callback function that is called to check if the current token
     * should stop the parsing process of the current generic "value"
     * sequence of arbitrary tokens by returning `true`.
     *
     * When this happens, the parser *will not consume* the token that
     * was passed to the `shouldStop` callback or to its `accept` method.
     * On the other hand, the parser will be "consumed" hence using it
     * to process other tokens will yield an error.
     */
    shouldStop: (token: BaseToken) => boolean);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialFrontMatterSequence | FrontMatterSequence>;
    /**
     * Add provided tokens to the list of the current parsed tokens.
     */
    addTokens(tokens: readonly TSimpleDecoderToken[]): this;
    /**
     * Convert the current parser into a {@link FrontMatterSequence} token.
     */
    asSequenceToken(): FrontMatterSequence;
}
