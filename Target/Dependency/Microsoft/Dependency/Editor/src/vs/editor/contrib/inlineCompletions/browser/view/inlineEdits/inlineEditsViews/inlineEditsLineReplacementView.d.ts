import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { ObservableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { Range } from '../../../../../../common/core/range.js';
import { LineRange } from '../../../../../../common/core/ranges/lineRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { IInlineEditsView, InlineEditTabAction } from '../inlineEditsViewInterface.js';
export declare class InlineEditsLineReplacementView extends Disposable implements IInlineEditsView {
    private readonly _editor;
    private readonly _edit;
    private readonly _isInDiffEditor;
    private readonly _tabAction;
    private readonly _languageService;
    private readonly _themeService;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    private readonly _maxPrefixTrim;
    private readonly _modifiedLineElements;
    private readonly _layout;
    private readonly _viewZoneInfo;
    private readonly _div;
    readonly isHovered: IObservable<boolean>;
    constructor(_editor: ObservableCodeEditor, _edit: IObservable<{
        originalRange: LineRange;
        modifiedRange: LineRange;
        modifiedLines: string[];
        replacements: Replacement[];
    } | undefined>, _isInDiffEditor: IObservable<boolean>, _tabAction: IObservable<InlineEditTabAction>, _languageService: ILanguageService, _themeService: IThemeService);
    private _isMouseOverWidget;
    private _previousViewZoneInfo;
    private removePreviousViewZone;
    private addViewZone;
}
export interface Replacement {
    originalRange: Range;
    modifiedRange: Range;
}
