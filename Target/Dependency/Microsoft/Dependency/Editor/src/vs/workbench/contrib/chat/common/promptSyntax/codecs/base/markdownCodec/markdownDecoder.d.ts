import { MarkdownToken } from './tokens/markdownToken.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { ReadableStream } from '../../../../../../../../base/common/stream.js';
import { TSimpleDecoderToken } from '../simpleCodec/simpleDecoder.js';
import { BaseDecoder } from '../baseDecoder.js';
/**
 * Tokens produced by this decoder.
 */
export type TMarkdownToken = MarkdownToken | TSimpleDecoderToken;
/**
 * Decoder capable of parsing markdown entities (e.g., links) from a sequence of simple tokens.
 */
export declare class MarkdownDecoder extends BaseDecoder<TMarkdownToken, TSimpleDecoderToken> {
    /**
     * Current parser object that is responsible for parsing a sequence of tokens into
     * some markdown entity. Set to `undefined` when no parsing is in progress at the moment.
     */
    private current?;
    constructor(stream: ReadableStream<VSBuffer>);
    protected onStreamData(token: TSimpleDecoderToken): void;
    protected onStreamEnd(): void;
}
