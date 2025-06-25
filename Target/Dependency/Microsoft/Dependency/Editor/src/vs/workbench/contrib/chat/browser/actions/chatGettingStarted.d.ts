import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
export declare class ChatGettingStartedContribution extends Disposable implements IWorkbenchContribution {
    private readonly productService;
    private readonly extensionService;
    private readonly viewsService;
    private readonly extensionManagementService;
    private readonly storageService;
    private readonly layoutService;
    static readonly ID = "workbench.contrib.chatGettingStarted";
    private recentlyInstalled;
    private static readonly hideWelcomeView;
    constructor(productService: IProductService, extensionService: IExtensionService, viewsService: IViewsService, extensionManagementService: IExtensionManagementService, storageService: IStorageService, layoutService: IWorkbenchLayoutService);
    private registerListeners;
    private onDidInstallChat;
}
