import { VSBufferReadableStream } from '../../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ResolveError } from '../../promptFileReferenceErrors.js';
import { PromptsType } from '../promptTypes.js';
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { IPromptContentsProvider } from './types.js';
/**
 * Options of the {@link PromptContentsProviderBase} class.
 */
export interface IPromptContentsProviderOptions {
    /**
     * Whether to allow files that don't have usual prompt
     * file extension to be treated as a prompt file.
     */
    readonly allowNonPromptFiles: boolean;
}
/**
 * Default {@link IPromptContentsProviderOptions} options.
 */
export declare const DEFAULT_OPTIONS: IPromptContentsProviderOptions;
/**
 * Base class for prompt contents providers. Classes that extend this one are responsible to:
 *
 * - implement the {@link getContentsStream} method to provide the contents stream
 *   of a prompt; this method should throw a `ResolveError` or its derivative if the contents
 *   cannot be parsed for any reason
 * - fire a {@link TChangeEvent} event on the {@link onChangeEmitter} event when
 * 	 prompt contents change
 * - misc:
 *   - provide the {@link uri} property that represents the URI of a prompt that
 *     the contents are for
 *   - implement the {@link toString} method to return a string representation of this
 *     provider type to aid with debugging/tracing
 */
export declare abstract class PromptContentsProviderBase<TChangeEvent extends NonNullable<unknown>> extends ObservableDisposable implements IPromptContentsProvider {
    abstract readonly uri: URI;
    abstract createNew(promptContentsSource: {
        uri: URI;
    }): IPromptContentsProvider;
    abstract toString(): string;
    abstract get languageId(): string;
    abstract get sourceName(): string;
    /**
     * Prompt contents stream.
     */
    get contents(): Promise<VSBufferReadableStream>;
    /**
     * Prompt type used to determine how to interpret file contents.
     */
    get promptType(): PromptsType | 'non-prompt';
    /**
     * Function to get contents stream for the provider. This function should
     * throw a `ResolveError` or its derivative if the contents cannot be parsed.
     *
     * @param changesEvent The event that triggered the change. The special
     * `'full'` value means  that everything has changed hence entire prompt
     * contents need to be re-parsed from scratch.
     */
    protected abstract getContentsStream(changesEvent: TChangeEvent | 'full', cancellationToken?: CancellationToken): Promise<VSBufferReadableStream>;
    /**
     * Internal event emitter for the prompt contents change event. Classes that extend
     * this abstract class are responsible to use this emitter to fire the contents change
     * event when the prompt contents get modified.
     */
    protected readonly onChangeEmitter: Emitter<"full" | TChangeEvent>;
    /**
     * Options passed to the constructor, extended with
     * value defaults from {@link DEFAULT_OPTIONS}.
     */
    protected readonly options: IPromptContentsProviderOptions;
    constructor(options: Partial<IPromptContentsProviderOptions>);
    /**
     * Event emitter for the prompt contents change event.
     * See {@link onContentChanged} for more details.
     */
    private readonly onContentChangedEmitter;
    /**
     * Event that fires when the prompt contents change. The event is either
     * a `VSBufferReadableStream` stream with changed contents or an instance of
     * the `ResolveError` class representing a parsing failure case.
     *
     * `Note!` this field is meant to be used by the external consumers of the prompt
     *         contents provider that the classes that extend this abstract class.
     *         Please use the {@link onChangeEmitter} event to provide a change
     *         event in your prompt contents implementation instead.
     */
    readonly onContentChanged: import("../../../../../workbench.web.main.internal.js").Event<VSBufferReadableStream | ResolveError>;
    /**
     * Internal common implementation of the event that should be fired when
     * prompt contents change.
     */
    private onContentsChanged;
    /**
     * Start producing the prompt contents data.
     */
    start(token?: CancellationToken): this;
}
