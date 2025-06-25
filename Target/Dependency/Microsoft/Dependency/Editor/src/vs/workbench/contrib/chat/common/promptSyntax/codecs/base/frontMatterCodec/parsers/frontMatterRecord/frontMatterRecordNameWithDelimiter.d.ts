import { type PartialFrontMatterRecord } from './frontMatterRecord.js';
import { Colon, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { type TSimpleDecoderToken } from '../../../simpleCodec/simpleDecoder.js';
import { FrontMatterRecordName } from '../../tokens/index.js';
import { ParserBase, type TAcceptTokenResult } from '../../../simpleCodec/parserBase.js';
import { type FrontMatterParserFactory } from '../frontMatterParserFactory.js';
/**
 * Type for tokens that stop a front matter record name sequence.
 */
export type TNameStopToken = Colon | SpacingToken;
/**
 * Type for the next parser that can be returned by {@link PartialFrontMatterRecordNameWithDelimiter}.
 */
type TNextParser = PartialFrontMatterRecordNameWithDelimiter | PartialFrontMatterRecord;
/**
 * Parser for a record `name` with the `: ` delimiter.
 *
 *  * E.g., `name:` in the example below:
 *
 * ```
 * name: 'value'
 * ```
 */
export declare class PartialFrontMatterRecordNameWithDelimiter extends ParserBase<FrontMatterRecordName | TNameStopToken, TNextParser> {
    private readonly factory;
    constructor(factory: FrontMatterParserFactory, tokens: readonly [FrontMatterRecordName, TNameStopToken]);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<TNextParser>;
}
export {};
