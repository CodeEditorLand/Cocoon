import { ICodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { ServicesAccessor } from '../../../../../editor/browser/editorExtensions.js';
import { AccessibleContentProvider, AccessibleViewType } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibleViewImplementation } from '../../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
export declare class PanelChatAccessibilityHelp implements IAccessibleViewImplementation {
    readonly priority = 107;
    readonly name = "panelChat";
    readonly type = AccessibleViewType.Help;
    readonly when: import("../../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
export declare class QuickChatAccessibilityHelp implements IAccessibleViewImplementation {
    readonly priority = 107;
    readonly name = "quickChat";
    readonly type = AccessibleViewType.Help;
    readonly when: import("../../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
export declare class EditsChatAccessibilityHelp implements IAccessibleViewImplementation {
    readonly priority = 119;
    readonly name = "editsView";
    readonly type = AccessibleViewType.Help;
    readonly when: import("../../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
export declare class AgentChatAccessibilityHelp implements IAccessibleViewImplementation {
    readonly priority = 120;
    readonly name = "agentView";
    readonly type = AccessibleViewType.Help;
    readonly when: import("../../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
export declare function getAccessibilityHelpText(type: 'panelChat' | 'inlineChat' | 'quickChat' | 'editsView' | 'agentView', keybindingService: IKeybindingService): string;
export declare function getChatAccessibilityHelpProvider(accessor: ServicesAccessor, editor: ICodeEditor | undefined, type: 'panelChat' | 'inlineChat' | 'quickChat' | 'editsView' | 'agentView'): AccessibleContentProvider | undefined;
