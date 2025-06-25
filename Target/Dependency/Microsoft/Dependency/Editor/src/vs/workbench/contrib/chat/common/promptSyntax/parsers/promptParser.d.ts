import { URI } from '../../../../../../base/common/uri.js';
import { IPromptContentsProvider } from '../contentProviders/types.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { BasePromptParser, IPromptParserOptions } from './basePromptParser.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * General prompt parser class that automatically infers a prompt
 * contents provider type by the type of provided prompt URI.
 */
export declare class PromptParser extends BasePromptParser<IPromptContentsProvider> {
    /**
     * Underlying prompt contents provider instance.
     */
    private readonly contentsProvider;
    constructor(uri: URI, options: Partial<IPromptParserOptions>, logService: ILogService, modelService: IModelService, instaService: IInstantiationService, workspaceService: IWorkspaceContextService);
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
