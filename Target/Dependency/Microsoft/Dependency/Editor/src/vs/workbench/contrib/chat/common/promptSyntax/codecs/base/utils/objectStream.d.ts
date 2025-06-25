import { CancellationToken } from '../../../../../../../../base/common/cancellation.js';
import { ObservableDisposable } from '../../../utils/observableDisposable.js';
import { ReadableStream } from '../../../../../../../../base/common/stream.js';
/**
 * A readable stream of provided objects.
 */
export declare class ObjectStream<T extends object> extends ObservableDisposable implements ReadableStream<T> {
    private readonly data;
    private readonly cancellationToken?;
    /**
     * Flag that indicates whether the stream has ended.
     */
    private ended;
    /**
     * Underlying writable stream instance.
     */
    private readonly stream;
    /**
     * Interval reference that is used to periodically send
     * objects to the stream in the background.
     */
    private timeoutHandle;
    constructor(data: Generator<T, undefined>, cancellationToken?: CancellationToken | undefined);
    /**
     * Starts process of sending data to the stream.
     *
     * @param stopAfterFirstSend whether to continue sending data to the stream
     *             or stop sending after the first batch of data is sent instead
     */
    send(stopAfterFirstSend?: boolean): void;
    /**
     * Stop the data sending loop.
     */
    stopStream(): this;
    /**
     * Sends a provided number of objects to the stream.
     */
    private sendData;
    /**
     * Ends the stream and stops sending data objects.
     */
    private end;
    pause(): void;
    resume(): void;
    destroy(): void;
    removeListener(event: string, callback: (...args: any[]) => void): void;
    on(event: 'data', callback: (data: T) => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
    on(event: 'end', callback: () => void): void;
    /**
     * Cleanup send interval and destroy the stream.
     */
    dispose(): void;
    /**
     * Create new instance of the stream from a provided array.
     */
    static fromArray<T extends object>(array: T[], cancellationToken?: CancellationToken): ObjectStream<T>;
}
/**
 * Create a generator out of a provided array.
 */
export declare function arrayToGenerator<T extends NonNullable<unknown>>(array: T[]): Generator<T, undefined>;
