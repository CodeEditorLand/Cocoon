import { type TSimpleDecoderToken } from '../../../simpleCodec/simpleDecoder.js';
import { ParserBase, type TAcceptTokenResult } from '../../../simpleCodec/parserBase.js';
import { FrontMatterRecordName, FrontMatterRecordDelimiter, FrontMatterRecord } from '../../tokens/index.js';
import { type FrontMatterParserFactory } from '../frontMatterParserFactory.js';
/**
 * Type of a next parser that can be returned by {@link PartialFrontMatterRecord}.
 */
type TNextParser = PartialFrontMatterRecord | FrontMatterRecord;
/**
 * Parser for a `record` inside a Front Matter header.
 *
 *  * E.g., `name: 'value'` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * isExample: true
 * ---
 * ```
 */
export declare class PartialFrontMatterRecord extends ParserBase<TSimpleDecoderToken, TNextParser> {
    private readonly factory;
    /**
     * Token that represents the 'name' part of the record.
     */
    private readonly recordNameToken;
    /**
     * Token that represents the 'delimiter' part of the record.
     */
    private readonly recordDelimiterToken;
    constructor(factory: FrontMatterParserFactory, tokens: [FrontMatterRecordName, FrontMatterRecordDelimiter]);
    /**
     * Current parser reference responsible for parsing the "value" part of the record.
     */
    private valueParser?;
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<TNextParser>;
    /**
     * Convert current parser into a {@link FrontMatterRecord} token.
     *
     * @throws if no current parser is present, or it is not of the {@link PartialFrontMatterValue}
     *         or {@link PartialFrontMatterSequence} types
     */
    asRecordToken(): FrontMatterRecord;
}
export {};
