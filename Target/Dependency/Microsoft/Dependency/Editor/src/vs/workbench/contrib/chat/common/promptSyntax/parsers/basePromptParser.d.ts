import { TMetadata } from './promptHeader/headerBase.js';
import { ModeHeader } from './promptHeader/modeHeader.js';
import { URI } from '../../../../../../base/common/uri.js';
import { FileReference } from '../codecs/tokens/fileReference.js';
import { Event } from '../../../../../../base/common/event.js';
import { InstructionsHeader } from './promptHeader/instructionsHeader.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import type { IPromptContentsProvider } from '../contentProviders/types.js';
import type { TPromptReference, IResolveError, ITopError } from './types.js';
import { type IDisposable } from '../../../../../../base/common/lifecycle.js';
import { BaseToken } from '../codecs/base/baseToken.js';
import { type IRange, Range } from '../../../../../../editor/common/core/range.js';
import { PromptHeader } from './promptHeader/promptHeader.js';
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkdownLink } from '../codecs/base/markdownCodec/tokens/markdownLink.js';
import { OpenFailed, NotPromptFile, RecursiveReference, FolderReference, ResolveError } from '../../promptFileReferenceErrors.js';
import { type IPromptContentsProviderOptions } from '../contentProviders/promptContentsProviderBase.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
/**
 * Options of the {@link BasePromptParser} class.
 */
export interface IPromptParserOptions extends IPromptContentsProviderOptions {
    /**
     * List of reference paths have been already seen before
     * getting to the current prompt. Used to prevent infinite
     * recursion in prompt file references.
     */
    readonly seenReferences: readonly string[];
}
/**
 * Error conditions that may happen during the file reference resolution.
 */
export type TErrorCondition = OpenFailed | RecursiveReference | FolderReference | NotPromptFile;
/**
 * Base prompt parser class that provides a common interface for all
 * prompt parsers that are responsible for parsing chat prompt syntax.
 */
export declare class BasePromptParser<TContentsProvider extends IPromptContentsProvider> extends ObservableDisposable {
    private readonly promptContentsProvider;
    protected readonly instantiationService: IInstantiationService;
    private readonly workspaceService;
    protected readonly logService: ILogService;
    /**
     * Options passed to the constructor, extended with
     * value defaults from {@link DEFAULT_OPTIONS}.
     */
    protected readonly options: IPromptParserOptions;
    /**
     * List of all tokens that were parsed from the prompt contents so far.
     */
    get tokens(): readonly BaseToken[];
    /**
     * Private field behind the readonly {@link tokens} property.
     */
    private receivedTokens;
    /**
     * List of file references in the current branch of the file reference tree.
     */
    private readonly _references;
    /**
     * Reference to the prompt header object that holds metadata associated
     * with the prompt.
     */
    private promptHeader?;
    /**
     * Reference to the prompt header object that holds metadata associated
     * with the prompt.
     */
    get header(): PromptHeader | InstructionsHeader | ModeHeader | undefined;
    /**
     * Get contents of the prompt body.
     */
    getBody(): Promise<string>;
    /**
     * The event is fired when lines or their content change.
     */
    private readonly _onUpdate;
    /**
     * Subscribe to the event that is fired the parser state or contents
     * changes, including changes in the possible prompt child references.
     */
    readonly onUpdate: Event<void>;
    /**
     * Event that is fired when the current prompt parser is settled.
     */
    private readonly _onSettled;
    /**
     * Event that is fired when the current prompt parser is settled.
     */
    onSettled(callback: (error?: Error) => void): IDisposable;
    /**
     * If failed to parse prompt contents, this property has
     * an error object that describes the failure reason.
     */
    private _errorCondition?;
    /**
     * If file reference resolution fails, this attribute will be set
     * to an error instance that describes the error condition.
     */
    get errorCondition(): ResolveError | undefined;
    /**
     * Whether file references resolution failed.
     * Set to `undefined` if the `resolve` method hasn't been ever called yet.
     */
    get resolveFailed(): boolean | undefined;
    /**
     * The promise is resolved when at least one parse result (a stream or
     * an error) has been received from the prompt contents provider.
     */
    private readonly firstParseResult;
    /**
     * Returned promise is resolved when the parser process is settled.
     * The settled state means that the prompt parser stream exists and
     * has ended, or an error condition has been set in case of failure.
     *
     * Furthermore, this function can be called multiple times and will
     * block until the latest prompt contents parsing logic is settled
     * (e.g., for every `onContentChanged` event of the prompt source).
     */
    settled(): Promise<this>;
    /**
     * Same as {@link settled} but also waits for all possible
     * nested child prompt references and their children to be settled.
     */
    allSettled(): Promise<this>;
    constructor(promptContentsProvider: TContentsProvider, options: Partial<IPromptParserOptions>, instantiationService: IInstantiationService, workspaceService: IWorkspaceContextService, logService: ILogService);
    /**
     * The latest received stream of prompt tokens, if any.
     */
    private stream;
    /**
     * Handler the event event that is triggered when prompt contents change.
     *
     * @param streamOrError Either a binary stream of file contents, or an error object
     * 						that was generated during the reference resolve attempt.
     * @param seenReferences List of parent references that we've have already seen
     * 					 	during the process of traversing the references tree. It's
     * 						used to prevent the tree navigation to fall into an infinite
     * 						references recursion.
     */
    private onContentsChanged;
    /**
     * Create header object base on the target prompt file language ID.
     * The language ID is important here, because it defines what type
     * of metadata is valid for a prompt file and what type of related
     * diagnostics we would show to the user.
     */
    private createHeader;
    /**
     * Handle a new reference token inside prompt contents.
     */
    private handleLinkToken;
    /**
     * Handle the `stream` end event.
     *
     * @param stream The stream that has ended.
     * @param error Optional error object if stream ended with an error.
     */
    private onStreamEnd;
    /**
     * Dispose all currently held references.
     */
    private disposeReferences;
    /**
     * Private attribute to track if the {@link start}
     * method has been already called at least once.
     */
    private started;
    /**
     * Start the prompt parser.
     */
    start(token?: CancellationToken): this;
    /**
     * Associated URI of the prompt.
     */
    get uri(): URI;
    /**
     * Get the parent folder URI of the prompt.
     * For instance, if prompt URI points to a file on a disk, this
     * function will return the folder URI that contains that file,
     * but if the URI points to an `untitled` document, will try to
     * use a different folder URI based on the workspace state.
     */
    get parentFolder(): URI | null;
    /**
     * Get a list of immediate child references of the prompt.
     */
    get references(): readonly TPromptReference[];
    /**
     * Get a list of all references of the prompt, including
     * all possible nested references its children may have.
     */
    get allReferences(): readonly TPromptReference[];
    /**
     * Get list of all valid references.
     */
    get allValidReferences(): readonly TPromptReference[];
    /**
     * Valid metadata records defined in the prompt header.
     */
    get metadata(): TMetadata | null;
    /**
     * Entire associated `tools` metadata for this reference and
     * all possible nested child references.
     */
    get allToolsMetadata(): readonly string[] | null;
    /**
     * Get list of errors for the direct links of the current reference.
     */
    get errors(): readonly ResolveError[];
    /**
     * List of all errors that occurred while resolving the current
     * reference including all possible errors of nested children.
     */
    get allErrors(): readonly IResolveError[];
    /**
     * The top most error of the current reference or any of its
     * possible child reference errors.
     */
    get topError(): ITopError | undefined;
    /**
     * Check if the current reference points to a given resource.
     */
    sameUri(otherUri: URI): boolean;
    /**
     * Check if the current reference points to a prompt snippet file.
     */
    get isPromptFile(): boolean;
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
    /**
     * @inheritdoc
     */
    dispose(): void;
}
/**
 * Prompt reference object represents any reference inside prompt text
 * contents. For instance the file variable(`#file:/path/to/file.md`) or
 * a markdown link(`[#file:file.md](/path/to/file.md)`).
 */
export declare class PromptReference extends ObservableDisposable implements TPromptReference {
    private readonly promptContentsProvider;
    readonly token: FileReference | MarkdownLink;
    /**
     * Instance of underlying prompt parser object.
     */
    private readonly parser;
    constructor(promptContentsProvider: IPromptContentsProvider, token: FileReference | MarkdownLink, options: Partial<IPromptParserOptions>, instantiationService: IInstantiationService);
    /**
     * Get the range of the `link` part of the reference.
     */
    get linkRange(): IRange | undefined;
    /**
     * Type of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get type(): 'file';
    /**
     * Subtype of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get subtype(): 'prompt' | 'markdown';
    /**
     * Start parsing the reference contents.
     */
    start(): this;
    /**
     * Subscribe to the `onUpdate` event that is fired when prompt tokens are updated.
     */
    onUpdate(...args: Parameters<Event<void>>): ReturnType<Event<void>>;
    get range(): Range;
    get path(): string;
    get text(): string;
    get resolveFailed(): boolean | undefined;
    get errorCondition(): ResolveError | undefined;
    get topError(): ITopError | undefined;
    get uri(): URI;
    get isPromptFile(): boolean;
    get errors(): readonly ResolveError[];
    get allErrors(): readonly IResolveError[];
    get references(): readonly TPromptReference[];
    get allReferences(): readonly TPromptReference[];
    get metadata(): TMetadata | null;
    get allToolsMetadata(): readonly string[] | null;
    get allValidReferences(): readonly TPromptReference[];
    settled(): Promise<this>;
    allSettled(): Promise<this>;
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
