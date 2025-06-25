import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { BaseDecoder } from './baseDecoder.js';
/**
 * Asynchronous iterator wrapper for a decoder.
 */
export declare class AsyncDecoder<T extends NonNullable<unknown>, K extends NonNullable<unknown> = NonNullable<unknown>> extends Disposable {
    private readonly decoder;
    private readonly messages;
    /**
     * A transient promise that is resolved when a new event
     * is received. Used in the situation when there is no new
     * data available and decoder stream did not finish yet,
     * hence we need to wait until new event is received.
     */
    private resolveOnNewEvent?;
    /**
     * @param decoder The decoder instance to wrap.
     *
     * Note! Assumes ownership of the `decoder` object, hence will `dispose`
     * 		 it when the decoder stream is ended.
     */
    constructor(decoder: BaseDecoder<T, K>);
    /**
     * Async iterator implementation.
     */
    [Symbol.asyncIterator](): AsyncIterator<T | null>;
}
