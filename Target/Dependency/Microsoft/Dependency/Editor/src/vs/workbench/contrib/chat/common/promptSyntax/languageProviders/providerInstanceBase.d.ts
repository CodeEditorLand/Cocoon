import { IPromptsService, TSharedPrompt } from '../service/promptsService.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
/**
 * Abstract base class for all reusable prompt file providers.
 */
export declare abstract class ProviderInstanceBase extends ObservableDisposable {
    protected readonly model: ITextModel;
    /**
     * Function that is called when the prompt parser is settled.
     */
    protected abstract onPromptSettled(error: Error | undefined, token: CancellationToken): this;
    /**
     * Returns a string representation of this object.
     */
    abstract toString(): string;
    /**
     * The prompt parser instance.
     */
    protected readonly parser: TSharedPrompt;
    constructor(model: ITextModel, promptsService: IPromptsService);
}
