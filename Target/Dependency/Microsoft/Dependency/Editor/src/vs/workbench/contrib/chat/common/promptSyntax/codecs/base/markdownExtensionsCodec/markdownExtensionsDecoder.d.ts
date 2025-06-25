import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { ReadableStream } from '../../../../../../../../base/common/stream.js';
import { BaseDecoder } from '../baseDecoder.js';
import { MarkdownExtensionsToken } from './tokens/markdownExtensionsToken.js';
import { TSimpleDecoderToken } from '../simpleCodec/simpleDecoder.js';
/**
 * Tokens produced by this decoder.
 */
export type TMarkdownExtensionsToken = MarkdownExtensionsToken | TSimpleDecoderToken;
/**
 * Decoder responsible for decoding extensions of markdown syntax,
 * e.g., a `Front Matter` header, etc.
 */
export declare class MarkdownExtensionsDecoder extends BaseDecoder<TMarkdownExtensionsToken, TSimpleDecoderToken> {
    /**
     * Current parser object that is responsible for parsing a sequence of tokens into
     * some markdown entity. Set to `undefined` when no parsing is in progress at the moment.
     */
    private current?;
    constructor(stream: ReadableStream<VSBuffer>);
    protected onStreamData(token: TSimpleDecoderToken): void;
    protected onStreamEnd(): void;
    /**
     * Re-emit tokens accumulated so far in the current parser object.
     */
    protected reEmitCurrentTokens(): void;
}
