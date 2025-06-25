import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { ICellViewModel, INotebookEditor } from '../notebookBrowser.js';
import { OutlineEntry } from '../viewModel/OutlineEntry.js';
export type NotebookOutlineEntryArgs = {
    notebookEditor: INotebookEditor;
    outlineEntry: OutlineEntry;
};
export type NotebookCellArgs = {
    notebookEditor: INotebookEditor;
    cell: ICellViewModel;
};
export declare class NotebookRunSingleCellInSection extends Action2 {
    constructor();
    run(_accessor: ServicesAccessor, context: any): Promise<void>;
}
export declare class NotebookRunCellsInSection extends Action2 {
    constructor();
    run(_accessor: ServicesAccessor, context: any): Promise<void>;
}
export declare class NotebookFoldSection extends Action2 {
    constructor();
    run(_accessor: ServicesAccessor, context: any): Promise<void>;
    private toggleFoldRange;
}
export declare class NotebookExpandSection extends Action2 {
    constructor();
    run(_accessor: ServicesAccessor, context: any): Promise<void>;
    private toggleFoldRange;
}
