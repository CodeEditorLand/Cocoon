import { Line } from './tokens/line.js';
import { NewLine } from './tokens/newLine.js';
import { CarriageReturn } from './tokens/carriageReturn.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { BaseDecoder } from '../baseDecoder.js';
/**
 * Any line break token type.
 */
export type TLineBreakToken = CarriageReturn | NewLine;
/**
 * Tokens produced by the {@link LinesDecoder}.
 */
export type TLineToken = Line | TLineBreakToken;
/**
 * The `decoder` part of the `LinesCodec` and is able to transform
 * data from a binary stream into a stream of text lines(`Line`).
 */
export declare class LinesDecoder extends BaseDecoder<TLineToken, VSBuffer> {
    /**
     * Buffered received data yet to be processed.
     */
    private buffer;
    /**
     * The last emitted `Line` token, if any. The value is used
     * to correctly emit remaining line range in the `onStreamEnd`
     * method when underlying input stream ends and `buffer` still
     * contains some data that must be emitted as the last line.
     */
    private lastEmittedLine?;
    /**
     * Process data received from the input stream.
     */
    protected onStreamData(chunk: VSBuffer): void;
    /**
     * Process buffered data.
     *
     * @param streamEnded Flag that indicates if the input stream has ended,
     * 					  which means that is the last call of this method.
     * @throws If internal logic implementation error is detected.
     */
    private processData;
    /**
     * Find the end of line tokens in the data buffer.
     * Can return:
     *  - [`\r`, `\n`] tokens if the sequence is found
     *  - [`\r`] token if only the carriage return is found
     *  - [`\n`] token if only the newline is found
     *  - an `empty array` if no end of line tokens found
     */
    private findEndOfLineTokens;
    /**
     * Emit a provided line as the `Line` token to the output stream.
     */
    private emitLine;
    /**
     * Handle the end of the input stream - if the buffer still has some data,
     * emit it as the last available line token before firing the `onEnd` event.
     */
    protected onStreamEnd(): void;
}
