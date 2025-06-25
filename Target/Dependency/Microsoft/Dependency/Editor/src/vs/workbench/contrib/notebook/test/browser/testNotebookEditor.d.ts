import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { EditorModel } from '../../../../common/editor/editorModel.js';
import { IActiveNotebookEditorDelegate, INotebookEditorDelegate } from '../../browser/notebookBrowser.js';
import { NotebookCellList } from '../../browser/view/notebookCellList.js';
import { NotebookViewModel } from '../../browser/viewModel/notebookViewModelImpl.js';
import { ViewContext } from '../../browser/viewModel/viewContext.js';
import { NotebookCellTextModel } from '../../common/model/notebookCellTextModel.js';
import { NotebookTextModel } from '../../common/model/notebookTextModel.js';
import { CellKind, INotebookDiffEditorModel, INotebookEditorModel, IOutputDto, IResolvedNotebookEditorModel, NotebookCellMetadata } from '../../common/notebookCommon.js';
import { ICellExecutionStateChangedEvent, IExecutionStateChangedEvent, INotebookCellExecution, INotebookExecution, INotebookExecutionStateService, INotebookFailStateChangedEvent } from '../../common/notebookExecutionStateService.js';
import { ICellRange } from '../../common/notebookRange.js';
import { IWorkingCopySaveEvent } from '../../../../services/workingCopy/common/workingCopy.js';
export declare class TestCell extends NotebookCellTextModel {
    viewType: string;
    source: string;
    constructor(viewType: string, handle: number, source: string, language: string, cellKind: CellKind, outputs: IOutputDto[], languageService: ILanguageService);
}
export declare class NotebookEditorTestModel extends EditorModel implements INotebookEditorModel {
    private _notebook;
    private _dirty;
    protected readonly _onDidSave: Emitter<IWorkingCopySaveEvent>;
    readonly onDidSave: Event<IWorkingCopySaveEvent>;
    protected readonly _onDidChangeDirty: Emitter<void>;
    readonly onDidChangeDirty: Event<void>;
    readonly onDidChangeOrphaned: Event<any>;
    readonly onDidChangeReadonly: Event<any>;
    readonly onDidRevertUntitled: Event<any>;
    private readonly _onDidChangeContent;
    readonly onDidChangeContent: Event<void>;
    get viewType(): string;
    get resource(): URI;
    get notebook(): NotebookTextModel;
    constructor(_notebook: NotebookTextModel);
    isReadonly(): boolean;
    isOrphaned(): boolean;
    hasAssociatedFilePath(): boolean;
    isDirty(): boolean;
    get hasErrorState(): boolean;
    isModified(): boolean;
    getNotebook(): NotebookTextModel;
    load(): Promise<IResolvedNotebookEditorModel>;
    save(): Promise<boolean>;
    saveAs(): Promise<EditorInput | undefined>;
    revert(): Promise<void>;
}
export declare function setupInstantiationService(disposables: Pick<DisposableStore, 'add'>): TestInstantiationService;
export declare function createTestNotebookEditor(instantiationService: TestInstantiationService, disposables: DisposableStore, cells: [source: string, lang: string, kind: CellKind, output?: IOutputDto[], metadata?: NotebookCellMetadata][]): {
    editor: INotebookEditorDelegate;
    viewModel: NotebookViewModel;
};
export declare function withTestNotebookDiffModel<R = any>(originalCells: [source: string, lang: string, kind: CellKind, output?: IOutputDto[], metadata?: NotebookCellMetadata][], modifiedCells: [source: string, lang: string, kind: CellKind, output?: IOutputDto[], metadata?: NotebookCellMetadata][], callback: (diffModel: INotebookDiffEditorModel, disposables: DisposableStore, accessor: TestInstantiationService) => Promise<R> | R): Promise<R>;
interface IActiveTestNotebookEditorDelegate extends IActiveNotebookEditorDelegate {
    visibleRanges: ICellRange[];
}
export type MockNotebookCell = [
    source: string,
    lang: string,
    kind: CellKind,
    output?: IOutputDto[],
    metadata?: NotebookCellMetadata
];
export type MockDocumentSymbol = {
    name: string;
    range: {};
    kind?: number;
    children?: MockDocumentSymbol[];
};
export declare function withTestNotebook<R = any>(cells: MockNotebookCell[], callback: (editor: IActiveTestNotebookEditorDelegate, viewModel: NotebookViewModel, disposables: DisposableStore, accessor: TestInstantiationService) => Promise<R> | R, accessor?: TestInstantiationService): Promise<R>;
export declare function createNotebookCellList(instantiationService: TestInstantiationService, disposables: Pick<DisposableStore, 'add'>, viewContext?: ViewContext): NotebookCellList;
export declare function valueBytesFromString(value: string): VSBuffer;
export declare class TestNotebookExecutionStateService implements INotebookExecutionStateService {
    _serviceBrand: undefined;
    private _executions;
    onDidChangeExecution: Event<ICellExecutionStateChangedEvent | IExecutionStateChangedEvent>;
    onDidChangeLastRunFailState: Event<INotebookFailStateChangedEvent>;
    forceCancelNotebookExecutions(notebookUri: URI): void;
    getCellExecutionsForNotebook(notebook: URI): INotebookCellExecution[];
    getCellExecution(cellUri: URI): INotebookCellExecution | undefined;
    createCellExecution(notebook: URI, cellHandle: number): INotebookCellExecution;
    getCellExecutionsByHandleForNotebook(notebook: URI): Map<number, INotebookCellExecution> | undefined;
    getLastFailedCellForNotebook(notebook: URI): number | undefined;
    getLastCompletedCellForNotebook(notebook: URI): number | undefined;
    getExecution(notebook: URI): INotebookExecution | undefined;
    createExecution(notebook: URI): INotebookExecution;
}
export {};
