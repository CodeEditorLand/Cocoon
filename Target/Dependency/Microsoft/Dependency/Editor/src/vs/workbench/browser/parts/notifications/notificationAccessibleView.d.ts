import { AccessibleViewType, AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibleViewImplementation } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
export declare class NotificationAccessibleView implements IAccessibleViewImplementation {
    readonly priority = 90;
    readonly name = "notifications";
    readonly when: import("../../../../platform/contextkey/common/contextkey.js").RawContextKey<boolean>;
    readonly type = AccessibleViewType.View;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
