import { ServicesAccessor } from '../../../../editor/browser/editorExtensions.js';
import { AccessibleViewType, AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { IAccessibleViewImplementation } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
/**
 * The REPL input is already accessible, so we can show a view for the most recent execution output.
 */
export declare class ReplEditorAccessibleView implements IAccessibleViewImplementation {
    readonly priority = 100;
    readonly name = "replEditorInput";
    readonly type = AccessibleViewType.View;
    readonly when: import("../../../../platform/contextkey/common/contextkey.js").ContextKeyExpression | undefined;
    getProvider(accessor: ServicesAccessor): AccessibleContentProvider | undefined;
}
export declare function getAccessibleOutputProvider(editorService: IEditorService): AccessibleContentProvider | undefined;
