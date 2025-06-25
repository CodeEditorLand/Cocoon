import './media/chatSetup.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { ChatEntitlementService } from '../common/chatEntitlementService.js';
export declare class ChatSetupContribution extends Disposable implements IWorkbenchContribution {
    private readonly productService;
    private readonly instantiationService;
    private readonly commandService;
    private readonly telemetryService;
    private readonly logService;
    static readonly ID = "workbench.contrib.chatSetup";
    constructor(productService: IProductService, instantiationService: IInstantiationService, commandService: ICommandService, telemetryService: ITelemetryService, chatEntitlementService: ChatEntitlementService, logService: ILogService);
    private registerSetupAgents;
    private registerActions;
    private registerUrlLinkHandler;
}
