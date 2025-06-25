import { FrontMatterArray } from '../tokens/frontMatterArray.js';
import { TSimpleDecoderToken } from '../../simpleCodec/simpleDecoder.js';
import { LeftBracket } from '../../simpleCodec/tokens/tokens.js';
import { ParserBase, TAcceptTokenResult } from '../../simpleCodec/parserBase.js';
import { type FrontMatterParserFactory } from './frontMatterParserFactory.js';
/**
 * Responsible for parsing an array syntax (or "inline sequence"
 * in YAML terms), e.g. `[1, '2', true, 2.54]`
*/
export declare class PartialFrontMatterArray extends ParserBase<TSimpleDecoderToken, PartialFrontMatterArray | FrontMatterArray> {
    private readonly factory;
    private readonly startToken;
    /**
     * Current parser reference responsible for parsing an array "value".
     */
    private currentValueParser?;
    /**
     * Whether an array item is allowed in the current position of the token
     * sequence. E.g., items are allowed after a command or a open bracket,
     * but not immediately after another item in the array.
     */
    private arrayItemAllowed;
    constructor(factory: FrontMatterParserFactory, startToken: LeftBracket);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<PartialFrontMatterArray | FrontMatterArray>;
    /**
     * Convert current parser into a {@link FrontMatterArray} token,
     * if possible.
     *
     * @throws if the last token in the accumulated token list
     * 		   is not a closing bracket ({@link RightBracket}).
     */
    asArrayToken(): FrontMatterArray;
}
