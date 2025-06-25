import { IDisposable } from '../../../../base/common/lifecycle.js';
import { Comment } from '../../../../editor/common/languages.js';
import { IMenu, IMenuService, MenuItemAction, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
export declare class CommentMenus implements IDisposable {
    private readonly menuService;
    constructor(menuService: IMenuService);
    getCommentThreadTitleActions(contextKeyService: IContextKeyService): IMenu;
    getCommentThreadActions(contextKeyService: IContextKeyService): IMenu;
    getCommentEditorActions(contextKeyService: IContextKeyService): IMenu;
    getCommentThreadAdditionalActions(contextKeyService: IContextKeyService): IMenu;
    getCommentTitleActions(comment: Comment, contextKeyService: IContextKeyService): IMenu;
    getCommentActions(comment: Comment, contextKeyService: IContextKeyService): IMenu;
    getCommentThreadTitleContextActions(contextKeyService: IContextKeyService): (MenuItemAction | SubmenuItemAction)[];
    private getMenu;
    private getActions;
    dispose(): void;
}
