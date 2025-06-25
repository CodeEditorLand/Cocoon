import './media/chatStatus.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { ChatEntitlementService } from '../common/chatEntitlementService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
export declare class ChatStatusBarEntry extends Disposable implements IWorkbenchContribution {
    private readonly chatEntitlementService;
    private readonly instantiationService;
    private readonly statusbarService;
    private readonly editorService;
    private readonly configurationService;
    static readonly ID = "workbench.contrib.chatStatusBarEntry";
    private entry;
    private dashboard;
    private readonly activeCodeEditorListener;
    constructor(chatEntitlementService: ChatEntitlementService, instantiationService: IInstantiationService, statusbarService: IStatusbarService, editorService: IEditorService, configurationService: IConfigurationService);
    private update;
    private registerListeners;
    private onDidActiveEditorChange;
    private getEntryProps;
    dispose(): void;
}
