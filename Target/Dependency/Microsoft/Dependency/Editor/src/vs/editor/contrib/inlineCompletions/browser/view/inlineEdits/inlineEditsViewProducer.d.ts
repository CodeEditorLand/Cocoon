import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IObservable, ISettableObservable } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ICodeEditor } from '../../../../../browser/editorBrowser.js';
import { InlineCompletionsModel } from '../../model/inlineCompletionsModel.js';
import { InlineEdit } from '../../model/inlineEdit.js';
export declare class InlineEditsViewAndDiffProducer extends Disposable {
    private readonly _editor;
    private readonly _edit;
    private readonly _model;
    private readonly _focusIsInMenu;
    static readonly hot: IObservable<typeof InlineEditsViewAndDiffProducer>;
    private readonly _editorObs;
    private readonly _inlineEdit;
    private readonly _inlineEditModel;
    private readonly _inlineEditHost;
    private readonly _ghostTextIndicator;
    constructor(_editor: ICodeEditor, _edit: IObservable<InlineEdit | undefined>, _model: IObservable<InlineCompletionsModel | undefined>, _focusIsInMenu: ISettableObservable<boolean>, instantiationService: IInstantiationService);
}
