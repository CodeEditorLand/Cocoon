import { ILocalizedString } from '../../../../platform/action/common/action.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService } from '../common/debug.js';
export declare class WelcomeView extends ViewPane {
    private readonly debugService;
    private readonly editorService;
    static readonly ID = "workbench.debug.welcome";
    static readonly LABEL: ILocalizedString;
    private debugStartLanguageContext;
    private debuggerInterestedContext;
    constructor(options: IViewletViewOptions, themeService: IThemeService, keybindingService: IKeybindingService, contextMenuService: IContextMenuService, configurationService: IConfigurationService, contextKeyService: IContextKeyService, debugService: IDebugService, editorService: IEditorService, instantiationService: IInstantiationService, viewDescriptorService: IViewDescriptorService, openerService: IOpenerService, storageSevice: IStorageService, hoverService: IHoverService);
    shouldShowWelcome(): boolean;
}
