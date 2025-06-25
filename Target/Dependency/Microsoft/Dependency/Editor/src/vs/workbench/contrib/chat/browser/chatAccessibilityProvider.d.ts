import { AriaRole } from '../../../../base/browser/ui/aria/aria.js';
import { IListAccessibilityProvider } from '../../../../base/browser/ui/list/listWidget.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ChatTreeItem } from './chat.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatToolInvocation } from '../common/chatService.js';
export declare const getToolConfirmationAlert: (accessor: ServicesAccessor, toolInvocation: IChatToolInvocation[]) => string;
export declare class ChatAccessibilityProvider implements IListAccessibilityProvider<ChatTreeItem> {
    private readonly _accessibleViewService;
    private readonly _instantiationService;
    constructor(_accessibleViewService: IAccessibleViewService, _instantiationService: IInstantiationService);
    getWidgetRole(): AriaRole;
    getRole(element: ChatTreeItem): AriaRole | undefined;
    getWidgetAriaLabel(): string;
    getAriaLabel(element: ChatTreeItem): string;
    private _getLabelWithInfo;
}
