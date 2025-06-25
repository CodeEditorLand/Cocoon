import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../../base/common/observable.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IDocumentDiff } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { DetailedLineRangeMapping } from '../../../../../../editor/common/diff/rangeMapping.js';
import { TextEdit } from '../../../../../../editor/common/languages.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { NotebookCellTextModel } from '../../../../notebook/common/model/notebookCellTextModel.js';
import { ModifiedFileEntryState } from '../../../common/chatEditingService.js';
import { IChatResponseModel } from '../../../common/chatModel.js';
/**
 * This is very closely similar to the ChatEditingModifiedDocumentEntry class.
 * Most of the code has been borrowed from there, as a cell is effectively a document.
 * Hence most of the same functionality applies.
 */
export declare class ChatEditingNotebookCellEntry extends Disposable {
    readonly notebookUri: URI;
    readonly cell: NotebookCellTextModel;
    private readonly modifiedModel;
    private readonly originalModel;
    private readonly notebookEditorService;
    private readonly instantiationService;
    get isDisposed(): boolean;
    get isEditFromUs(): boolean;
    get allEditsAreFromUs(): boolean;
    get diffInfo(): IObservable<IDocumentDiff>;
    private readonly _maxModifiedLineNumber;
    readonly maxModifiedLineNumber: import("../../../../../../base/common/observable.js").ISettableObservable<number, void>;
    protected readonly _stateObs: import("../../../../../../base/common/observable.js").ISettableObservable<ModifiedFileEntryState, void>;
    readonly state: IObservable<ModifiedFileEntryState>;
    private readonly initialContent;
    private readonly _textModelChangeService;
    constructor(notebookUri: URI, cell: NotebookCellTextModel, modifiedModel: ITextModel, originalModel: ITextModel, disposables: DisposableStore, notebookEditorService: INotebookEditorService, instantiationService: IInstantiationService);
    clearCurrentEditLineDecoration(): void;
    acceptAgentEdits(textEdits: TextEdit[], isLastEdits: boolean, responseModel: IChatResponseModel): Promise<void>;
    revertMarkdownPreviewState(): void;
    keep(change: DetailedLineRangeMapping): Promise<boolean>;
    undo(change: DetailedLineRangeMapping): Promise<boolean>;
}
