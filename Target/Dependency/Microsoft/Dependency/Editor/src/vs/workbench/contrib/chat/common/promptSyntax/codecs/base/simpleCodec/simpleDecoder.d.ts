import { NewLine } from '../linesCodec/tokens/newLine.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { TLineBreakToken, TLineToken } from '../linesCodec/linesDecoder.js';
import { At, Tab, Word, Hash, Dash, Colon, Slash, Space, Quote, Comma, FormFeed, DollarSign, DoubleQuote, VerticalTab, type TBracket, type TCurlyBrace, ExclamationMark, type TParenthesis, type TAngleBracket } from './tokens/tokens.js';
import { ISimpleTokenClass } from './tokens/simpleToken.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { BaseDecoder } from '../baseDecoder.js';
import { ReadableStream } from '../../../../../../../../base/common/stream.js';
/**
 * Type for all simple tokens.
 */
export type TSimpleToken = Space | Tab | VerticalTab | At | Quote | DoubleQuote | CarriageReturn | NewLine | FormFeed | TBracket | TAngleBracket | TCurlyBrace | TParenthesis | Colon | Hash | Dash | ExclamationMark | Slash | DollarSign | Comma | TLineBreakToken;
/**
* Type of tokens emitted by this decoder.
*/
export type TSimpleDecoderToken = TSimpleToken | Word;
/**
 * List of well-known distinct tokens that this decoder emits (excluding
 * the word stop characters defined below). Everything else is considered
 * an arbitrary "text" sequence and is emitted as a single {@link Word} token.
 */
export declare const WELL_KNOWN_TOKENS: readonly ISimpleTokenClass<TSimpleToken>[];
/**
 * A decoder that can decode a stream of `Line`s into a stream
 * of simple token, - `Word`, `Space`, `Tab`, `NewLine`, etc.
 */
export declare class SimpleDecoder extends BaseDecoder<TSimpleDecoderToken, TLineToken> {
    constructor(stream: ReadableStream<VSBuffer>);
    protected onStreamData(line: TLineToken): void;
}
