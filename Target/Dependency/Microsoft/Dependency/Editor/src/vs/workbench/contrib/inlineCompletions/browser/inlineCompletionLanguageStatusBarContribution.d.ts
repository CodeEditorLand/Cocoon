import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageStatusService } from '../../../services/languageStatus/common/languageStatusService.js';
export declare class InlineCompletionLanguageStatusBarContribution extends Disposable implements IWorkbenchContribution {
    private readonly _languageStatusService;
    private readonly _editorService;
    static readonly hot: import("../../../../base/common/observable.js").IObservable<typeof InlineCompletionLanguageStatusBarContribution>;
    static Id: string;
    static readonly languageStatusBarDisposables: Set<DisposableStore>;
    private _activeEditor;
    private _state;
    constructor(_languageStatusService: ILanguageStatusService, _editorService: IEditorService);
}
