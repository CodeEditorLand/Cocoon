import { Dash } from '../../simpleCodec/tokens/dash.js';
import { FrontMatterHeader } from '../tokens/frontMatterHeader.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { FrontMatterMarker, TMarkerToken } from '../tokens/frontMatterMarker.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
/**
 * Parses the start marker of a Front Matter header.
 */
export declare class PartialFrontMatterStartMarker extends ParserBase<TMarkerToken, PartialFrontMatterStartMarker | PartialFrontMatterHeader> {
    constructor(token: Dash);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialFrontMatterStartMarker | PartialFrontMatterHeader>;
    /**
     * Check if provided dash token can be a start of a Front Matter header.
     */
    static mayStartHeader(token: TSimpleDecoderToken): token is Dash;
}
/**
 * Parses a Front Matter header that already has a start marker
 * and possibly some content that follows.
 */
export declare class PartialFrontMatterHeader extends ParserBase<TSimpleDecoderToken, PartialFrontMatterHeader | FrontMatterHeader> {
    readonly startMarker: FrontMatterMarker;
    /**
     * Parser instance for the end marker of the Front Matter header.
     */
    private maybeEndMarker?;
    constructor(startMarker: FrontMatterMarker);
    get tokens(): readonly TSimpleDecoderToken[];
    /**
     * Convert the current token sequence into a {@link FrontMatterHeader} token.
     *
     * Note! that this method marks the current parser object as "consumed"
     *       hence it should not be used after this method is called.
     */
    asFrontMatterHeader(): FrontMatterHeader;
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialFrontMatterHeader | FrontMatterHeader>;
    /**
     * When a end marker parser is present, we pass all tokens to it
     * until it is completes the parsing process(either success or failure).
     */
    private acceptEndMarkerToken;
    /**
     * On failure to parse the end marker, we need to continue parsing
     * the header because there might be another valid end marker in
     * the stream of tokens. Therefore we copy over the end marker tokens
     * into the list of "content" tokens and reset the end marker parser.
     */
    private handleEndMarkerParsingFailure;
}
