import { INotebookEditorModelResolverService } from '../../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookLoggingService } from '../../../../notebook/common/notebookLoggingService.js';
import { INotebookEditorWorkerService } from '../../../../notebook/common/services/notebookWorkerService.js';
import { IEditSessionEntryDiff, ISnapshotEntry } from '../../../common/chatEditingService.js';
export declare class ChatEditingModifiedNotebookDiff {
    private readonly original;
    private readonly modified;
    private readonly notebookEditorWorkerService;
    private readonly notebookLoggingService;
    private readonly notebookEditorModelService;
    static NewModelCounter: number;
    constructor(original: ISnapshotEntry, modified: ISnapshotEntry, notebookEditorWorkerService: INotebookEditorWorkerService, notebookLoggingService: INotebookLoggingService, notebookEditorModelService: INotebookEditorModelResolverService);
    computeDiff(): Promise<IEditSessionEntryDiff>;
}
