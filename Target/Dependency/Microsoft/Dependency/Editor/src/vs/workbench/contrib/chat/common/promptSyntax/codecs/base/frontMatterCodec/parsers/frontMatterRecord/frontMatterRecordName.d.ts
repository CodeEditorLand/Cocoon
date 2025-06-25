import { type TSimpleDecoderToken } from '../../../simpleCodec/simpleDecoder.js';
import { type TRecordNameToken } from '../../tokens/index.js';
import { Word } from '../../../simpleCodec/tokens/tokens.js';
import { type PartialFrontMatterRecordNameWithDelimiter } from './frontMatterRecordNameWithDelimiter.js';
import { ParserBase, type TAcceptTokenResult } from '../../../simpleCodec/parserBase.js';
import { type FrontMatterParserFactory } from '../frontMatterParserFactory.js';
/**
 * Type of a next parser that can be returned by {@link PartialFrontMatterRecordName}.
 */
type TNextParser = PartialFrontMatterRecordName | PartialFrontMatterRecordNameWithDelimiter;
/**
 * Parser for a `name` part of a Front Matter record.
 *
 * E.g., `'name'` in the example below:
 *
 * ```
 * name: 'value'
 * ```
 */
export declare class PartialFrontMatterRecordName extends ParserBase<TRecordNameToken, TNextParser> {
    private readonly factory;
    constructor(factory: FrontMatterParserFactory, startToken: Word);
    accept(token: TSimpleDecoderToken): TAcceptTokenResult<TNextParser>;
}
export {};
