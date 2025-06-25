import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { ObservableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { TextReplacement } from '../../../../../../common/core/edits/textEdit.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { IInlineEditsView, InlineEditTabAction } from '../inlineEditsViewInterface.js';
export declare class InlineEditsWordReplacementView extends Disposable implements IInlineEditsView {
    private readonly _editor;
    /** Must be single-line in both sides */
    private readonly _edit;
    protected readonly _tabAction: IObservable<InlineEditTabAction>;
    private readonly _languageService;
    static MAX_LENGTH: number;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    private readonly _start;
    private readonly _end;
    private readonly _line;
    private readonly _hoverableElement;
    readonly isHovered: IObservable<boolean>;
    constructor(_editor: ObservableCodeEditor, 
    /** Must be single-line in both sides */
    _edit: TextReplacement, _tabAction: IObservable<InlineEditTabAction>, _languageService: ILanguageService);
    private readonly _renderTextEffect;
    private readonly _layout;
    private readonly _root;
}
