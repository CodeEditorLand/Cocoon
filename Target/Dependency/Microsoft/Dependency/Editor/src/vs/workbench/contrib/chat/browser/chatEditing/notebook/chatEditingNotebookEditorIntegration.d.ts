import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IEditorPane } from '../../../../../common/editor.js';
import { INotebookTextDiffEditor } from '../../../../notebook/browser/diff/notebookDiffEditorBrowser.js';
import { NotebookTextModel } from '../../../../notebook/common/model/notebookTextModel.js';
import { IModifiedFileEntryChangeHunk, IModifiedFileEntryEditorIntegration } from '../../../common/chatEditingService.js';
import { ChatEditingModifiedNotebookEntry } from '../chatEditingModifiedNotebookEntry.js';
import { ICellDiffInfo } from './notebookCellChanges.js';
export declare class ChatEditingNotebookEditorIntegration extends Disposable implements IModifiedFileEntryEditorIntegration {
    private readonly instantiationService;
    private integration;
    private notebookEditor;
    constructor(_entry: ChatEditingModifiedNotebookEntry, editor: IEditorPane, notebookModel: NotebookTextModel, originalModel: NotebookTextModel, cellChanges: IObservable<ICellDiffInfo[]>, instantiationService: IInstantiationService);
    get currentIndex(): IObservable<number>;
    reveal(firstOrLast: boolean): void;
    next(wrap: boolean): boolean;
    previous(wrap: boolean): boolean;
    enableAccessibleDiffView(): void;
    acceptNearestChange(change: IModifiedFileEntryChangeHunk | undefined): Promise<void>;
    rejectNearestChange(change: IModifiedFileEntryChangeHunk | undefined): Promise<void>;
    toggleDiff(change: IModifiedFileEntryChangeHunk | undefined, show?: boolean): Promise<void>;
    dispose(): void;
}
export declare class ChatEditingNotebookDiffEditorIntegration extends Disposable implements IModifiedFileEntryEditorIntegration {
    private readonly notebookDiffEditor;
    private readonly cellChanges;
    private readonly _currentIndex;
    readonly currentIndex: IObservable<number>;
    constructor(notebookDiffEditor: INotebookTextDiffEditor, cellChanges: IObservable<ICellDiffInfo[]>);
    reveal(firstOrLast: boolean): void;
    next(_wrap: boolean): boolean;
    previous(_wrap: boolean): boolean;
    enableAccessibleDiffView(): void;
    acceptNearestChange(change: IModifiedFileEntryChangeHunk): Promise<void>;
    rejectNearestChange(change: IModifiedFileEntryChangeHunk): Promise<void>;
    toggleDiff(_change: IModifiedFileEntryChangeHunk | undefined, _show?: boolean): Promise<void>;
}
