import { IAction } from '../../../../base/common/actions.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MenuId, IMenuActionOptions, IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IViewDescriptorService, ViewContainer } from '../../../common/views.js';
export declare class ViewMenuActions extends Disposable {
    readonly menuId: MenuId;
    private readonly contextMenuId;
    private readonly options;
    private readonly contextKeyService;
    private readonly menuService;
    private readonly menu;
    private readonly _onDidChange;
    readonly onDidChange: Event<void>;
    constructor(menuId: MenuId, contextMenuId: MenuId | undefined, options: IMenuActionOptions | undefined, contextKeyService: IContextKeyService, menuService: IMenuService);
    private actions;
    private getActions;
    getPrimaryActions(): IAction[];
    getSecondaryActions(): IAction[];
    getContextMenuActions(): IAction[];
}
export declare class ViewContainerMenuActions extends ViewMenuActions {
    constructor(element: HTMLElement, viewContainer: ViewContainer, viewDescriptorService: IViewDescriptorService, contextKeyService: IContextKeyService, menuService: IMenuService);
}
