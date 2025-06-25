import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { FrontMatterString, type TQuoteToken } from '../tokens/frontMatterString.js';
import { ParserBase, type TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
/**
 * Parser responsible for parsing a string value.
 */
export declare class PartialFrontMatterString extends ParserBase<TSimpleDecoderToken, PartialFrontMatterString | FrontMatterString<TQuoteToken>> {
    private readonly startToken;
    constructor(startToken: TQuoteToken);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialFrontMatterString | FrontMatterString<TQuoteToken>>;
    /**
     * Convert the current parser into a {@link FrontMatterString} token,
     * if possible.
     *
     * @throws if the first and last tokens are not quote tokens of the same type.
     */
    asStringToken(): FrontMatterString<TQuoteToken>;
}
