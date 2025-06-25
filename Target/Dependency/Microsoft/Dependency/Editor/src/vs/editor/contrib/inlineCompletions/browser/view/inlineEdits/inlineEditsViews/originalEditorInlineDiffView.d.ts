import { IMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../../base/common/observable.js';
import { ICodeEditor } from '../../../../../../browser/editorBrowser.js';
import { AbstractText } from '../../../../../../common/core/text/abstractText.js';
import { DetailedLineRangeMapping } from '../../../../../../common/diff/rangeMapping.js';
import { ITextModel } from '../../../../../../common/model.js';
import { IInlineEditsView } from '../inlineEditsViewInterface.js';
export interface IOriginalEditorInlineDiffViewState {
    diff: DetailedLineRangeMapping[];
    modifiedText: AbstractText;
    mode: 'insertionInline' | 'sideBySide' | 'deletion' | 'lineReplacement';
    isInDiffEditor: boolean;
    modifiedCodeEditor: ICodeEditor;
}
export declare class OriginalEditorInlineDiffView extends Disposable implements IInlineEditsView {
    private readonly _originalEditor;
    private readonly _state;
    private readonly _modifiedTextModel;
    static supportsInlineDiffRendering(mapping: DetailedLineRangeMapping): boolean;
    private readonly _onDidClick;
    readonly onDidClick: import("../../../../../../../workbench/workbench.web.main.internal.js").Event<IMouseEvent>;
    readonly isHovered: IObservable<boolean>;
    private readonly _tokenizationFinished;
    constructor(_originalEditor: ICodeEditor, _state: IObservable<IOriginalEditorInlineDiffViewState | undefined>, _modifiedTextModel: ITextModel);
    private readonly _decorations;
}
