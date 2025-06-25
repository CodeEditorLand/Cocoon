import { ITextModel } from '../../../../../../editor/common/model.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { BasePromptParser, IPromptParserOptions } from './basePromptParser.js';
import { TextModelContentsProvider } from '../contentProviders/textModelContentsProvider.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Class capable of parsing prompt syntax out of a provided text model,
 * including all the nested child file references it may have.
 */
export declare class TextModelPromptParser extends BasePromptParser<TextModelContentsProvider> {
    constructor(model: ITextModel, options: Partial<IPromptParserOptions>, instantiationService: IInstantiationService, workspaceService: IWorkspaceContextService, logService: ILogService);
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
