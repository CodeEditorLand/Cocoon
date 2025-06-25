import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { IAccessibilityService } from '../../../../../../../platform/accessibility/common/accessibility.js';
import { ICodeEditor } from '../../../../../../browser/editorBrowser.js';
import { IInlineEditsView } from '../inlineEditsViewInterface.js';
import { InlineEditWithChanges } from '../inlineEditWithChanges.js';
export declare class InlineEditsCollapsedView extends Disposable implements IInlineEditsView {
    private readonly _editor;
    private readonly _edit;
    private readonly _accessibilityService;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    private readonly _editorObs;
    private readonly _iconRef;
    readonly isVisible: IObservable<boolean>;
    constructor(_editor: ICodeEditor, _edit: IObservable<InlineEditWithChanges | undefined>, _accessibilityService: IAccessibilityService);
    triggerAnimation(): Promise<Animation>;
    private getCollapsedIndicator;
    private createIconPath;
    readonly isHovered: IObservable<boolean>;
}
