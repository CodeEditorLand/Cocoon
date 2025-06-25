import { IPromptsService } from '../service/promptsService.js';
import { ProviderInstanceBase } from './providerInstanceBase.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { ProviderInstanceManagerBase, TProviderClass } from './providerInstanceManagerBase.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
/**
 * Prompt header diagnostics provider for an individual text model
 * of a prompt file.
 */
declare class PromptHeaderDiagnosticsProvider extends ProviderInstanceBase {
    private readonly markerService;
    constructor(model: ITextModel, promptsService: IPromptsService, markerService: IMarkerService);
    /**
     * Update diagnostic markers for the current editor.
     */
    protected onPromptSettled(_error: Error | undefined, token: CancellationToken): this;
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
/**
 * The class that manages creation and disposal of {@link PromptHeaderDiagnosticsProvider}
 * classes for each specific editor text model.
 */
export declare class PromptHeaderDiagnosticsInstanceManager extends ProviderInstanceManagerBase<PromptHeaderDiagnosticsProvider> {
    protected get InstanceClass(): TProviderClass<PromptHeaderDiagnosticsProvider>;
}
export {};
