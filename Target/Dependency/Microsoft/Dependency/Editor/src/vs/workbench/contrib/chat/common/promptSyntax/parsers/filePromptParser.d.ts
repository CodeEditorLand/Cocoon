import { URI } from '../../../../../../base/common/uri.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { BasePromptParser, IPromptParserOptions } from './basePromptParser.js';
import { FilePromptContentProvider } from '../contentProviders/filePromptContentsProvider.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
/**
 * Class capable of parsing prompt syntax out of a provided file,
 * including all the nested child file references it may have.
 */
export declare class FilePromptParser extends BasePromptParser<FilePromptContentProvider> {
    constructor(uri: URI, options: Partial<IPromptParserOptions>, instantiationService: IInstantiationService, workspaceService: IWorkspaceContextService, logService: ILogService);
    /**
     * Returns a string representation of this object.
     */
    toString(): string;
}
