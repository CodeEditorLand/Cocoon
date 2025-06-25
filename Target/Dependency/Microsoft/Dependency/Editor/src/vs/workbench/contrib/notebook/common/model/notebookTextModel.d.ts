import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { FindMatch } from '../../../../../editor/common/model.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IUndoRedoService, UndoRedoGroup } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { ICellDto2, ICellEditOperation, INotebookSnapshotOptions, INotebookTextModel, ISelectionState, NotebookCellDefaultCollapseConfig, NotebookData, NotebookDocumentMetadata, NotebookTextModelChangedEvent, NotebookTextModelWillAddRemoveEvent, TransientOptions } from '../notebookCommon.js';
import { INotebookExecutionStateService } from '../notebookExecutionStateService.js';
import { NotebookCellTextModel } from './notebookCellTextModel.js';
export declare class NotebookTextModel extends Disposable implements INotebookTextModel {
    readonly viewType: string;
    readonly uri: URI;
    private readonly _undoService;
    private readonly _modelService;
    private readonly _languageService;
    private readonly _languageDetectionService;
    private readonly _notebookExecutionStateService;
    private _isDisposed;
    private readonly _onWillDispose;
    private readonly _onWillAddRemoveCells;
    private readonly _onDidChangeContent;
    readonly onWillDispose: Event<void>;
    readonly onWillAddRemoveCells: Event<NotebookTextModelWillAddRemoveEvent>;
    readonly onDidChangeContent: Event<NotebookTextModelChangedEvent>;
    private _cellhandlePool;
    private readonly _cellListeners;
    private _cells;
    private _defaultCollapseConfig;
    metadata: NotebookDocumentMetadata;
    transientOptions: TransientOptions;
    private _versionId;
    /**
     * This alternative id is only for non-cell-content changes.
     */
    private _notebookSpecificAlternativeId;
    /**
     * Unlike, versionId, this can go down (via undo) or go to previous values (via redo)
     */
    private _alternativeVersionId;
    private _operationManager;
    private _pauseableEmitter;
    get length(): number;
    get cells(): readonly NotebookCellTextModel[];
    get versionId(): number;
    get alternativeVersionId(): string;
    get notebookType(): string;
    constructor(viewType: string, uri: URI, cells: ICellDto2[], metadata: NotebookDocumentMetadata, options: TransientOptions, _undoService: IUndoRedoService, _modelService: IModelService, _languageService: ILanguageService, _languageDetectionService: ILanguageDetectionService, _notebookExecutionStateService: INotebookExecutionStateService);
    setCellCollapseDefault(collapseConfig: NotebookCellDefaultCollapseConfig | undefined): void;
    _initialize(cells: ICellDto2[], triggerDirty?: boolean): void;
    private _bindCellContentHandler;
    private _generateAlternativeId;
    dispose(): void;
    pushStackElement(): void;
    private _getCellIndexByHandle;
    private _getCellIndexWithOutputIdHandleFromEdits;
    private _getCellIndexWithOutputIdHandle;
    reset(cells: ICellDto2[], metadata: NotebookDocumentMetadata, transientOptions: TransientOptions): void;
    createSnapshot(options: INotebookSnapshotOptions): NotebookData;
    restoreSnapshot(snapshot: NotebookData, transientOptions?: TransientOptions): void;
    static computeEdits(model: NotebookTextModel, cells: ICellDto2[], executingHandles?: number[]): ICellEditOperation[];
    private static _computeOutputEdit;
    private static _commonPrefix;
    private static _commonSuffix;
    private newCellsFromLastEdit;
    private isOnlyEditingMetadataOnNewCells;
    applyEdits(rawEdits: ICellEditOperation[], synchronous: boolean, beginSelectionState: ISelectionState | undefined, endSelectionsComputer: () => ISelectionState | undefined, undoRedoGroup: UndoRedoGroup | undefined, computeUndoRedo: boolean): boolean;
    private _doApplyEdits;
    private _mergeCellEdits;
    private _getDefaultCollapseState;
    private _replaceCells;
    private _increaseVersionId;
    private _overwriteAlternativeVersionId;
    private _updateNotebookCellMetadata;
    private _insertNewCell;
    private _removeCell;
    private _replaceNewCells;
    private _isDocumentMetadataChanged;
    private _isCellMetadataChanged;
    private _customMetadataEqual;
    private _changeCellMetadataPartial;
    private _changeCellMetadata;
    private _changeCellInternalMetadataPartial;
    private _changeCellLanguage;
    private _spliceNotebookCellOutputs2;
    private _spliceNotebookCellOutputs;
    private _appendNotebookCellOutputItems;
    private _replaceNotebookCellOutputItems;
    private _moveCellToIdx;
    private _assertIndex;
    private _indexIsInvalid;
    findNextMatch(searchString: string, searchStart: {
        cellIndex: number;
        position: Position;
    }, isRegex: boolean, matchCase: boolean, wordSeparators: string | null, searchEnd?: {
        cellIndex: number;
        position: Position;
    }): {
        cell: NotebookCellTextModel;
        match: FindMatch;
    } | null;
    findMatches(searchString: string, isRegex: boolean, matchCase: boolean, wordSeparators: string | null): {
        cell: NotebookCellTextModel;
        matches: FindMatch[];
    }[];
}
