import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
export declare class SCMHistoryItemContextContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.chat.scmHistoryItemContextContribution";
    constructor(contextPickService: IChatContextPickService, instantiationService: IInstantiationService, textModelResolverService: ITextModelService);
}
