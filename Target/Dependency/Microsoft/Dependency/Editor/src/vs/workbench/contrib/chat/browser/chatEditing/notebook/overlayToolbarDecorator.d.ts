import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IAccessibilitySignalService } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookEditor } from '../../../../notebook/browser/notebookBrowser.js';
import { NotebookTextModel } from '../../../../notebook/common/model/notebookTextModel.js';
import { ICellDiffInfo } from './notebookCellChanges.js';
export declare class OverlayToolbarDecorator extends Disposable {
    private readonly notebookEditor;
    private readonly notebookModel;
    private readonly instantiationService;
    private readonly accessibilitySignalService;
    private _timeout;
    private readonly overlayDisposables;
    constructor(notebookEditor: INotebookEditor, notebookModel: NotebookTextModel, instantiationService: IInstantiationService, accessibilitySignalService: IAccessibilitySignalService);
    decorate(changes: ICellDiffInfo[]): void;
    private createMarkdownPreviewToolbars;
    private getCellViewModel;
    dispose(): void;
}
