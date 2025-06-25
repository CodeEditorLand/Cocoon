import { AccessibleContentProvider, AccessibleViewType } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibleViewImplementation } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
export declare class MergeEditorAccessibilityHelpProvider implements IAccessibleViewImplementation {
    readonly name = "mergeEditor";
    readonly type = AccessibleViewType.Help;
    readonly priority = 125;
    readonly when: import("../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
