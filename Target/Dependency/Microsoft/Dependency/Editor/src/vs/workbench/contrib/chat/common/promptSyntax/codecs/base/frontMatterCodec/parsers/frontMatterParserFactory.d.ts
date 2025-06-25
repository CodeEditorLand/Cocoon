import { BaseToken } from '../../baseToken.js';
import { LeftBracket } from '../../simpleCodec/tokens/brackets.js';
import { Word } from '../../simpleCodec/tokens/word.js';
import { FrontMatterRecordDelimiter, FrontMatterRecordName } from '../tokens/frontMatterRecord.js';
import { TQuoteToken } from '../tokens/frontMatterString.js';
import { PartialFrontMatterArray } from './frontMatterArray.js';
import { PartialFrontMatterRecord } from './frontMatterRecord/frontMatterRecord.js';
import { PartialFrontMatterRecordName } from './frontMatterRecord/frontMatterRecordName.js';
import { PartialFrontMatterRecordNameWithDelimiter, TNameStopToken } from './frontMatterRecord/frontMatterRecordNameWithDelimiter.js';
import { PartialFrontMatterSequence } from './frontMatterSequence.js';
import { PartialFrontMatterString } from './frontMatterString.js';
import { PartialFrontMatterValue } from './frontMatterValue.js';
export declare class FrontMatterParserFactory {
    createRecord(tokens: [FrontMatterRecordName, FrontMatterRecordDelimiter]): PartialFrontMatterRecord;
    createRecordName(startToken: Word): PartialFrontMatterRecordName;
    createRecordNameWithDelimiter(tokens: readonly [FrontMatterRecordName, TNameStopToken]): PartialFrontMatterRecordNameWithDelimiter;
    createArray(startToken: LeftBracket): PartialFrontMatterArray;
    createValue(shouldStop: (token: BaseToken) => boolean): PartialFrontMatterValue;
    createString(startToken: TQuoteToken): PartialFrontMatterString;
    createSequence(shouldStop: (token: BaseToken) => boolean): PartialFrontMatterSequence;
}
