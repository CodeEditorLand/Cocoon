import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { ReadableStream } from '../../../../../../../../base/common/stream.js';
import { FrontMatterRecord } from './tokens/index.js';
import { BaseDecoder } from '../baseDecoder.js';
import { type TSimpleDecoderToken } from '../simpleCodec/simpleDecoder.js';
import { ObjectStream } from '../utils/objectStream.js';
/**
 * Tokens produced by this decoder.
 */
export type TFrontMatterToken = FrontMatterRecord | TSimpleDecoderToken;
/**
 * Decoder capable of parsing Front Matter contents from a sequence of simple tokens.
 */
export declare class FrontMatterDecoder extends BaseDecoder<TFrontMatterToken, TSimpleDecoderToken> {
    /**
     * Current parser reference responsible for parsing a specific sequence
     * of tokens into a standalone token.
     */
    private current?;
    private readonly parserFactory;
    constructor(stream: ReadableStream<VSBuffer> | ObjectStream<TSimpleDecoderToken>);
    protected onStreamData(token: TSimpleDecoderToken): void;
    protected onStreamEnd(): void;
    /**
     * Re-emit tokens accumulated so far in the current parser object.
     */
    protected reEmitCurrentTokens(): void;
}
