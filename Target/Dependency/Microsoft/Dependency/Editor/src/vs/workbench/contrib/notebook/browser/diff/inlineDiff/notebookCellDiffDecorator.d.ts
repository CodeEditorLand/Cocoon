import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { INotebookEditor } from '../../notebookBrowser.js';
import { ICodeEditor } from '../../../../../../editor/browser/editorBrowser.js';
import { IEditorWorkerService } from '../../../../../../editor/common/services/editorWorker.js';
import { NotebookCellTextModel } from '../../../common/model/notebookCellTextModel.js';
import { INotebookOriginalCellModelFactory } from './notebookOriginalCellModelFactory.js';
export declare class NotebookCellDiffDecorator extends DisposableStore {
    readonly modifiedCell: NotebookCellTextModel;
    readonly originalCell: NotebookCellTextModel;
    private readonly editor;
    private readonly _editorWorkerService;
    private readonly originalCellModelFactory;
    private _viewZones;
    private readonly throttledDecorator;
    private diffForPreviouslyAppliedDecorators?;
    private readonly perEditorDisposables;
    constructor(notebookEditor: INotebookEditor, modifiedCell: NotebookCellTextModel, originalCell: NotebookCellTextModel, editor: ICodeEditor, _editorWorkerService: IEditorWorkerService, originalCellModelFactory: INotebookOriginalCellModelFactory);
    update(editor: ICodeEditor): void;
    private _updateImpl;
    private _originalModel?;
    private getOrCreateOriginalModel;
    private _updateWithDiff;
}
