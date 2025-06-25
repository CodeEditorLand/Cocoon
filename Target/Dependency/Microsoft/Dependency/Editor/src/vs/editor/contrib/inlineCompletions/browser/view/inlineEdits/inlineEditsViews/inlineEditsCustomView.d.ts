import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { ICodeEditor } from '../../../../../../browser/editorBrowser.js';
import { InlineCompletionDisplayLocation } from '../../../../../../common/languages.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { IInlineEditsView, InlineEditTabAction } from '../inlineEditsViewInterface.js';
export declare class InlineEditsCustomView extends Disposable implements IInlineEditsView {
    private readonly _editor;
    private readonly _languageService;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    private readonly _isHovered;
    readonly isHovered: IObservable<boolean>;
    private readonly _viewRef;
    private readonly _editorObs;
    constructor(_editor: ICodeEditor, displayLocation: IObservable<InlineCompletionDisplayLocation | undefined>, tabAction: IObservable<InlineEditTabAction>, themeService: IThemeService, _languageService: ILanguageService);
    private getState;
    private getRendering;
}
