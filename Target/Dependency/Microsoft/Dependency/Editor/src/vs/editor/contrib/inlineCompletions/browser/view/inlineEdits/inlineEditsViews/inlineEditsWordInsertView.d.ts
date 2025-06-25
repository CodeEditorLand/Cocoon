import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { ObservableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { TextReplacement } from '../../../../../../common/core/edits/textEdit.js';
import { IInlineEditsView, InlineEditTabAction } from '../inlineEditsViewInterface.js';
export declare class InlineEditsWordInsertView extends Disposable implements IInlineEditsView {
    private readonly _editor;
    /** Must be single-line in both sides */
    private readonly _edit;
    private readonly _tabAction;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    private readonly _start;
    private readonly _layout;
    private readonly _div;
    readonly isHovered: IObservable<boolean>;
    constructor(_editor: ObservableCodeEditor, 
    /** Must be single-line in both sides */
    _edit: TextReplacement, _tabAction: IObservable<InlineEditTabAction>);
}
