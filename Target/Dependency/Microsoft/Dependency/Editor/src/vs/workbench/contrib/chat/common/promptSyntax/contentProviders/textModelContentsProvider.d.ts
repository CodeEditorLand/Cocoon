import { VSBufferReadableStream } from '../../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { TextModel } from '../../../../../../editor/common/model/textModel.js';
import { IModelContentChangedEvent } from '../../../../../../editor/common/textModelEvents.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IPromptContentsProviderOptions, PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { IPromptContentsProvider } from './types.js';
/**
 * Prompt contents provider for a {@link ITextModel} instance.
 */
export declare class TextModelContentsProvider extends PromptContentsProviderBase<IModelContentChangedEvent> {
    private readonly model;
    private readonly instantiationService;
    /**
     * URI component of the prompt associated with this contents provider.
     */
    get uri(): URI;
    get sourceName(): string;
    get languageId(): string;
    constructor(model: ITextModel, options: Partial<IPromptContentsProviderOptions>, instantiationService: IInstantiationService);
    /**
     * Creates a stream of binary data from the text model based on the changes
     * listed in the provided event.
     *
     * Note! this method implements a basic logic which does not take into account
     * 		 the `_event` argument for incremental updates. This needs to be improved.
     *
     * @param _event - event that describes the changes in the text model; `'full'` is
     * 				   the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    protected getContentsStream(_event: IModelContentChangedEvent | 'full', cancellationToken?: CancellationToken): Promise<VSBufferReadableStream>;
    createNew(promptContentsSource: TextModel | {
        uri: URI;
    }, options?: Partial<IPromptContentsProviderOptions>): IPromptContentsProvider;
    /**
     * String representation of this object.
     */
    toString(): string;
}
