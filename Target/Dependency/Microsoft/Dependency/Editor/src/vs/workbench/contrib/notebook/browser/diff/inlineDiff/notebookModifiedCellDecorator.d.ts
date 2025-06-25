import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CellDiffInfo } from '../notebookDiffViewModel.js';
import { INotebookEditor } from '../../notebookBrowser.js';
export declare class NotebookModifiedCellDecorator extends Disposable {
    private readonly notebookEditor;
    private readonly decorators;
    constructor(notebookEditor: INotebookEditor);
    apply(diffInfo: CellDiffInfo[]): void;
    clear(): void;
}
