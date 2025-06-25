import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { ICodeEditor } from '../../../../../../browser/editorBrowser.js';
import { LineRange } from '../../../../../../common/core/ranges/lineRange.js';
import { Range } from '../../../../../../common/core/range.js';
import { IInlineEditsView, InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { InlineEditWithChanges } from '../inlineEditWithChanges.js';
export declare class InlineEditsDeletionView extends Disposable implements IInlineEditsView {
    private readonly _editor;
    private readonly _edit;
    private readonly _uiState;
    private readonly _tabAction;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    private readonly _editorObs;
    private readonly _originalVerticalStartPosition;
    private readonly _originalVerticalEndPosition;
    private readonly _originalDisplayRange;
    constructor(_editor: ICodeEditor, _edit: IObservable<InlineEditWithChanges | undefined>, _uiState: IObservable<{
        originalRange: LineRange;
        deletions: Range[];
        inDiffEditor: boolean;
    } | undefined>, _tabAction: IObservable<InlineEditTabAction>);
    private readonly _display;
    private readonly _editorMaxContentWidthInRange;
    private readonly _maxPrefixTrim;
    private readonly _editorLayoutInfo;
    private readonly _originalOverlay;
    private readonly _nonOverflowView;
    readonly isHovered: IObservable<boolean>;
}
