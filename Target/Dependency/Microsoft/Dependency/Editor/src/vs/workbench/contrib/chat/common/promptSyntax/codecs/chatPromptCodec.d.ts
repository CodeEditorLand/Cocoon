import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { ReadableStream } from '../../../../../../base/common/stream.js';
import { ChatPromptDecoder, TChatPromptToken } from './chatPromptDecoder.js';
/**
 * A codec is an object capable of encoding/decoding a stream of data transforming its messages.
 * Useful for abstracting a data transfer or protocol logic on top of a stream of bytes.
 *
 * For instance, if protocol messages need to be transferred over `TCP` connection, a codec that
 * encodes the messages into a sequence of bytes before sending it to a network socket. Likewise,
 * on the other end of the connection, the same codec can decode the sequence of bytes back into
 * a sequence of the protocol messages.
 */
export interface ICodec<T, K> {
    /**
     * Encode a stream of `K`s into a stream of `T`s.
     */
    encode: (value: ReadableStream<K>) => ReadableStream<T>;
    /**
     * Decode a stream of `T`s into a stream of `K`s.
     */
    decode: (value: ReadableStream<T>) => ReadableStream<K>;
}
/**
 * `ChatPromptCodec` type is a `ICodec<T, K>` with specific types for
 * stream messages and return types of the `encode`/`decode` functions.
 * @see {@link ICodec}
 */
interface IChatPromptCodec extends ICodec<VSBuffer, TChatPromptToken> {
    /**
     * Decode a stream of `VSBuffer`s into a stream of `TChatPromptToken`s.
     *
     * @see {@link TChatPromptToken}
     * @see {@link VSBuffer}
     * @see {@link ChatPromptDecoder}
     */
    decode: (value: ReadableStream<VSBuffer>) => ChatPromptDecoder;
}
/**
 * Codec that is capable to encode and decode tokens of an AI chatbot prompt message.
 */
export declare const ChatPromptCodec: IChatPromptCodec;
export {};
