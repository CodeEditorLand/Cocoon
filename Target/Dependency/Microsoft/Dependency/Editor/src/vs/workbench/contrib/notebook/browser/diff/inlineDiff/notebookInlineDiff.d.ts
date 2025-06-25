import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookEditorWorkerService } from '../../../common/services/notebookWorkerService.js';
import { INotebookEditorContribution, INotebookEditor } from '../../notebookBrowser.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
export declare class NotebookInlineDiffDecorationContribution extends Disposable implements INotebookEditorContribution {
    private readonly notebookEditor;
    private readonly notebookEditorWorkerService;
    private readonly instantiationService;
    private readonly logService;
    static ID: string;
    private previous?;
    private insertedCellDecorator;
    private deletedCellDecorator;
    private readonly cellDecorators;
    private cachedNotebookDiff?;
    private listeners;
    constructor(notebookEditor: INotebookEditor, notebookEditorWorkerService: INotebookEditorWorkerService, instantiationService: IInstantiationService, logService: INotebookLoggingService);
    private clear;
    dispose(): void;
    private initialize;
    private _update;
    private updateCells;
}
