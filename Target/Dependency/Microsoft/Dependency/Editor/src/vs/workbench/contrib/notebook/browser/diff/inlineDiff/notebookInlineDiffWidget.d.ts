import * as DOM from '../../../../../../base/browser/dom.js';
import { CodeWindow } from '../../../../../../base/browser/window.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { NotebookTextModel } from '../../../common/model/notebookTextModel.js';
import { NotebookDiffEditorInput } from '../../../common/notebookDiffEditorInput.js';
import { INotebookEditorOptions } from '../../notebookBrowser.js';
import { NotebookEditorWidget } from '../../notebookEditorWidget.js';
import { NotebookOptions } from '../../notebookOptions.js';
import { INotebookEditorService } from '../../services/notebookEditorService.js';
export declare class NotebookInlineDiffWidget extends Disposable {
    private readonly rootElement;
    private readonly groupId;
    private readonly window;
    private readonly options;
    private dimension;
    private readonly instantiationService;
    private readonly widgetService;
    private widget;
    private position;
    get editorWidget(): NotebookEditorWidget | undefined;
    constructor(rootElement: HTMLElement, groupId: number, window: CodeWindow, options: NotebookOptions, dimension: DOM.Dimension | undefined, instantiationService: IInstantiationService, widgetService: INotebookEditorService);
    show(input: NotebookDiffEditorInput, model: NotebookTextModel | undefined, previousModel: NotebookTextModel | undefined, options: INotebookEditorOptions | undefined): Promise<void>;
    hide(): void;
    setLayout(dimension: DOM.Dimension, position: DOM.IDomPosition): void;
    private createNotebookWidget;
    dispose(): void;
}
