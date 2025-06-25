import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
export declare class ChatExtensionPointHandler implements IWorkbenchContribution {
    private readonly _chatAgentService;
    static readonly ID = "workbench.contrib.chatExtensionPointHandler";
    private _participantRegistrationDisposables;
    constructor(_chatAgentService: IChatAgentService);
    private handleAndRegisterChatExtensions;
}
export declare class ChatCompatibilityNotifier extends Disposable implements IWorkbenchContribution {
    private readonly productService;
    static readonly ID = "workbench.contrib.chatCompatNotifier";
    private registeredWelcomeView;
    constructor(extensionsWorkbenchService: IExtensionsWorkbenchService, contextKeyService: IContextKeyService, productService: IProductService);
    private registerWelcomeView;
}
