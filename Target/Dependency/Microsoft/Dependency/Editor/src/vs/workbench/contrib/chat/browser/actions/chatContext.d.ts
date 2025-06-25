import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IChatContextPickService } from '../chatContextPickService.js';
export declare class ChatContextContributions extends Disposable implements IWorkbenchContribution {
    static readonly ID = "chat.contextContributions";
    constructor(instantiationService: IInstantiationService, contextPickService: IChatContextPickService);
}
