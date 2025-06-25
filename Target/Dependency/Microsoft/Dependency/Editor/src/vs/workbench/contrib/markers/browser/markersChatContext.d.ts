import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
export declare class MarkerChatContextContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.chat.markerChatContextContribution";
    constructor(contextPickService: IChatContextPickService, instantiationService: IInstantiationService);
}
