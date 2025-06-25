import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
export declare class ChatViewsWelcomeHandler implements IWorkbenchContribution {
    private readonly logService;
    static readonly ID = "workbench.contrib.chatViewsWelcomeHandler";
    constructor(logService: ILogService);
}
