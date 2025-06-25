import { IPagedModel } from '../../../../base/common/paging.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IMcpWorkbenchService, IWorkbenchMcpServer } from '../common/mcpTypes.js';
export declare class McpServersListView extends ViewPane {
    private readonly mcpWorkbenchService;
    private list;
    private readonly contextMenuActionRunner;
    constructor(options: IViewletViewOptions, keybindingService: IKeybindingService, contextMenuService: IContextMenuService, instantiationService: IInstantiationService, themeService: IThemeService, hoverService: IHoverService, configurationService: IConfigurationService, contextKeyService: IContextKeyService, viewDescriptorService: IViewDescriptorService, openerService: IOpenerService, mcpWorkbenchService: IMcpWorkbenchService);
    protected renderBody(container: HTMLElement): void;
    private onContextMenu;
    protected layoutBody(height: number, width: number): void;
    show(query: string): Promise<IPagedModel<IWorkbenchMcpServer>>;
}
