import { IListOptions } from '../../../../../base/browser/ui/list/listWidget.js';
import { Event } from '../../../../../base/common/event.js';
import { IMarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ModifiedFileEntryState } from '../../common/chatEditingService.js';
import { IChatContentReference, IChatWarningMessage } from '../../common/chatService.js';
import { IChatRendererContent } from '../../common/chatViewModel.js';
import { ChatTreeItem } from '../chat.js';
import { ChatCollapsibleContentPart } from './chatCollapsibleContentPart.js';
import { IDisposableReference } from './chatCollections.js';
import { IChatContentPartRenderContext } from './chatContentParts.js';
export interface IChatReferenceListItem extends IChatContentReference {
    title?: string;
    description?: string;
    state?: ModifiedFileEntryState;
    excluded?: boolean;
}
export type IChatCollapsibleListItem = IChatReferenceListItem | IChatWarningMessage;
export declare class ChatCollapsibleListContentPart extends ChatCollapsibleContentPart {
    private readonly data;
    private readonly contentReferencesListPool;
    private readonly openerService;
    private readonly menuService;
    private readonly instantiationService;
    private readonly contextMenuService;
    constructor(data: ReadonlyArray<IChatCollapsibleListItem>, labelOverride: IMarkdownString | string | undefined, context: IChatContentPartRenderContext, contentReferencesListPool: CollapsibleListPool, openerService: IOpenerService, menuService: IMenuService, instantiationService: IInstantiationService, contextMenuService: IContextMenuService);
    protected initContent(): HTMLElement;
    hasSameContent(other: IChatRendererContent, followingContent: IChatRendererContent[], element: ChatTreeItem): boolean;
}
export interface IChatUsedReferencesListOptions {
    expandedWhenEmptyResponse?: boolean;
}
export declare class ChatUsedReferencesListContentPart extends ChatCollapsibleListContentPart {
    private readonly options;
    constructor(data: ReadonlyArray<IChatCollapsibleListItem>, labelOverride: IMarkdownString | string | undefined, context: IChatContentPartRenderContext, contentReferencesListPool: CollapsibleListPool, options: IChatUsedReferencesListOptions, openerService: IOpenerService, menuService: IMenuService, instantiationService: IInstantiationService, contextMenuService: IContextMenuService);
    protected isExpanded(): boolean;
    protected setExpanded(value: boolean): void;
}
export declare class CollapsibleListPool extends Disposable {
    private _onDidChangeVisibility;
    private readonly menuId;
    private readonly listOptions;
    private readonly instantiationService;
    private readonly themeService;
    private readonly labelService;
    private _pool;
    get inUse(): ReadonlySet<WorkbenchList<IChatCollapsibleListItem>>;
    constructor(_onDidChangeVisibility: Event<boolean>, menuId: MenuId | undefined, listOptions: IListOptions<IChatCollapsibleListItem> | undefined, instantiationService: IInstantiationService, themeService: IThemeService, labelService: ILabelService);
    private listFactory;
    get(): IDisposableReference<WorkbenchList<IChatCollapsibleListItem>>;
}
