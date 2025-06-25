import { IPromptsService } from '../../service/promptsService.js';
import { ProviderInstanceBase } from '../providerInstanceBase.js';
import { ITextModel } from '../../../../../../../editor/common/model.js';
import { ProviderInstanceManagerBase, TProviderClass } from '../providerInstanceManagerBase.js';
/**
 * Prompt syntax decorations provider for text models.
 */
export declare class PromptDecorator extends ProviderInstanceBase {
    /**
     * Currently active decorations.
     */
    private readonly decorations;
    constructor(model: ITextModel, promptsService: IPromptsService);
    protected onPromptSettled(_error?: Error): this;
    /**
     * Get the current cursor position inside an active editor.
     * Note! Currently not implemented because the provider is disabled, and
     *       we need to do some refactoring to get accurate cursor position.
     */
    private get cursorPosition();
    /**
     * Watch editor cursor position and update reactive decorations accordingly.
     */
    private watchCursorPosition;
    /**
     * Update existing decorations.
     */
    private changeModelDecorations;
    /**
     * Add decorations for all prompt tokens.
     */
    private addDecorations;
    /**
     * Remove all existing decorations.
     */
    private removeAllDecorations;
    dispose(): void;
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
/**
 * Provider for prompt syntax decorators on text models.
 */
export declare class PromptDecorationsProviderInstanceManager extends ProviderInstanceManagerBase<PromptDecorator> {
    protected get InstanceClass(): TProviderClass<PromptDecorator>;
}
