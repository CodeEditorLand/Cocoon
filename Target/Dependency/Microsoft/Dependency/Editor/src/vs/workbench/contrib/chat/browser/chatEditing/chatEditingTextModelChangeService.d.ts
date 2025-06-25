import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { DetailedLineRangeMapping } from '../../../../../editor/common/diff/rangeMapping.js';
import { TextEdit } from '../../../../../editor/common/languages.js';
import { ITextModel, ITextSnapshot } from '../../../../../editor/common/model.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { ICellEditOperation } from '../../../notebook/common/notebookCommon.js';
import { ModifiedFileEntryState } from '../../common/chatEditingService.js';
export declare class ChatEditingTextModelChangeService extends Disposable {
    private readonly originalModel;
    private readonly modifiedModel;
    private readonly state;
    private readonly _editorWorkerService;
    private readonly _accessibilitySignalService;
    private static readonly _lastEditDecorationOptions;
    private static readonly _pendingEditDecorationOptions;
    private static readonly _atomicEditDecorationOptions;
    private _isEditFromUs;
    get isEditFromUs(): boolean;
    private _allEditsAreFromUs;
    get allEditsAreFromUs(): boolean;
    private _diffOperation;
    private _diffOperationIds;
    private readonly _diffInfo;
    get diffInfo(): IObservable<{
        originalModel: ITextModel;
        modifiedModel: ITextModel;
        keep: (changes: DetailedLineRangeMapping) => Promise<boolean>;
        undo: (changes: DetailedLineRangeMapping) => Promise<boolean>;
        identical: boolean;
        quitEarly: boolean;
        changes: readonly DetailedLineRangeMapping[];
        moves: readonly import("../../../../../editor/common/diff/linesDiffComputer.js").MovedText[];
    }>;
    private readonly _editDecorationClear;
    private _editDecorations;
    private readonly _didAcceptOrRejectAllHunks;
    readonly onDidAcceptOrRejectAllHunks: import("../../../../workbench.web.main.internal.js").Event<ModifiedFileEntryState.Accepted | ModifiedFileEntryState.Rejected>;
    private readonly _didUserEditModel;
    readonly onDidUserEditModel: import("../../../../workbench.web.main.internal.js").Event<void>;
    private _originalToModifiedEdit;
    constructor(originalModel: ITextModel, modifiedModel: ITextModel, state: IObservable<ModifiedFileEntryState>, _editorWorkerService: IEditorWorkerService, _accessibilitySignalService: IAccessibilitySignalService);
    clearCurrentEditLineDecoration(): void;
    areOriginalAndModifiedIdentical(): Promise<boolean>;
    acceptAgentEdits(resource: URI, textEdits: (TextEdit | ICellEditOperation)[], isLastEdits: boolean): Promise<{
        rewriteRatio: number;
        maxLineNumber: number;
    }>;
    private _applyEdits;
    /**
     * Keeps the current modified document as the final contents.
     */
    keep(): void;
    /**
     * Undoes the current modified document as the final contents.
     */
    undo(): void;
    resetDocumentValues(newOriginal: string | ITextSnapshot | undefined, newModified: string | undefined): Promise<void>;
    private _mirrorEdits;
    private _keepHunk;
    private _undoHunk;
    private _updateDiffInfoSeq;
    private _updateDiffInfo;
}
