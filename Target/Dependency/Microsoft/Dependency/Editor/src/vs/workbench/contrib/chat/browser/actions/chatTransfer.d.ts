import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IChatTransferService } from '../../common/chatTransferService.js';
export declare class ChatTransferContribution extends Disposable implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.chatTransfer";
    constructor(chatTransferService: IChatTransferService);
}
