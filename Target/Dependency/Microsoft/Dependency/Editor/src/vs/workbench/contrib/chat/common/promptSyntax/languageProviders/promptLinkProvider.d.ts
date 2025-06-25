import { IPromptsService } from '../service/promptsService.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { ILinksList, LinkProvider } from '../../../../../../editor/common/languages.js';
/**
 * Provides link references for prompt files.
 */
export declare class PromptLinkProvider implements LinkProvider {
    private readonly promptsService;
    constructor(promptsService: IPromptsService);
    /**
     * Provide list of links for the provided text model.
     */
    provideLinks(model: ITextModel, token: CancellationToken): Promise<ILinksList>;
}
