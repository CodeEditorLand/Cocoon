import { Emitter } from '../../../../../../../base/common/event.js';
import { ReadableStream } from '../../../../../../../base/common/stream.js';
import { ObservableDisposable } from '../../utils/observableDisposable.js';
/**
 * Event names of {@link ReadableStream} stream.
 */
export type TStreamListenerNames = 'data' | 'error' | 'end';
/**
 * Base decoder class that can be used to convert stream messages data type
 * from one type to another. For instance, a stream of binary data can be
 * "decoded" into a stream of well defined objects.
 * Intended to be a part of "codec" implementation rather than used directly.
 */
export declare abstract class BaseDecoder<T extends NonNullable<unknown>, K extends NonNullable<unknown> = NonNullable<unknown>> extends ObservableDisposable implements ReadableStream<T> {
    protected readonly stream: ReadableStream<K>;
    /**
     * Private attribute to track if the stream has ended.
     */
    private _ended;
    protected readonly _onData: Emitter<T>;
    private readonly _onEnd;
    private readonly _onError;
    /**
     * A store of currently registered event listeners.
     */
    private readonly _listeners;
    /**
     * This method is called when a new incoming data
     * is received from the input stream.
     */
    protected abstract onStreamData(data: K): void;
    /**
     * @param stream The input stream to decode.
     */
    constructor(stream: ReadableStream<K>);
    /**
     * Private attribute to track if the stream has started.
     */
    private started;
    /**
     * Promise that resolves when the stream has ended, either by
     * receiving the `end` event or by a disposal, but not when
     * the `error` event is received alone.
     */
    private settledPromise;
    /**
     * Promise that resolves when the stream has ended, either by
     * receiving the `end` event or by a disposal, but not when
     * the `error` event is received alone.
     *
     * @throws If the stream was not yet started to prevent this
     * 		   promise to block the consumer calls indefinitely.
     */
    get settled(): Promise<void>;
    /**
     * Start receiving data from the stream.
     * @throws if the decoder stream has already ended.
     */
    start(): this;
    /**
     * Check if the decoder has been ended hence has
     * no more data to produce.
     */
    get ended(): boolean;
    /**
     * Automatically catch and dispatch errors thrown inside `onStreamData`.
     */
    private tryOnStreamData;
    on(event: 'data', callback: (data: T) => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
    on(event: 'end', callback: () => void): void;
    /**
     * Add listener for the `data` event.
     * @throws if the decoder stream has already ended.
     */
    onData(callback: (data: T) => void): void;
    /**
     * Add listener for the `error` event.
     * @throws if the decoder stream has already ended.
     */
    onError(callback: (error: Error) => void): void;
    /**
     * Add listener for the `end` event.
     * @throws if the decoder stream has already ended.
     */
    onEnd(callback: () => void): void;
    /**
     * Pauses the stream.
     */
    pause(): void;
    /**
     * Resumes the stream if it has been paused.
     * @throws if the decoder stream has already ended.
     */
    resume(): void;
    /**
     * Destroys(disposes) the stream.
     */
    destroy(): void;
    /**
     * Removes a previously-registered event listener for a specified event.
     *
     * Note!
     *  - the callback function must be the same as the one that was used when
     * 	  registering the event listener as it is used as an identifier to
     *    remove the listener
     *  - this method is idempotent and results in no-op if the listener is
     *    not found, therefore passing incorrect `callback` function may
     *    result in silent unexpected behavior
     */
    removeListener(eventName: TStreamListenerNames, callback: Function): void;
    /**
     * This method is called when the input stream ends.
     */
    protected onStreamEnd(): void;
    /**
     * This method is called when the input stream emits an error.
     * We re-emit the error here by default, but subclasses can
     * override this method to handle the error differently.
     */
    private onStreamError;
    /**
     * Consume all messages from the stream, blocking until the stream finishes.
     * @throws if the decoder stream has already ended.
     */
    consumeAll(): Promise<T[]>;
    /**
     * Async iterator interface for the decoder.
     * @throws if the decoder stream has already ended.
     */
    [Symbol.asyncIterator](): AsyncIterator<T | null>;
    dispose(): void;
}
