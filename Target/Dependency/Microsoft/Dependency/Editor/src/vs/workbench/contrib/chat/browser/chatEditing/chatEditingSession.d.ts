import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IObservable, IReader } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { ChatEditingSessionState, IChatEditingSession, IEditSessionEntryDiff, IModifiedFileEntry, ISnapshotEntry, IStreamingEdits } from '../../common/chatEditingService.js';
import { IChatResponseModel } from '../../common/chatModel.js';
import { IChatService } from '../../common/chatService.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
export declare class ChatEditingSession extends Disposable implements IChatEditingSession {
    readonly chatSessionId: string;
    readonly isGlobalEditingSession: boolean;
    private _lookupExternalEntry;
    private readonly _instantiationService;
    private readonly _modelService;
    private readonly _languageService;
    private readonly _textModelService;
    readonly _bulkEditService: IBulkEditService;
    private readonly _editorGroupsService;
    private readonly _editorService;
    private readonly _chatService;
    private readonly _notebookService;
    private readonly _editorWorkerService;
    private readonly _configurationService;
    private readonly _accessibilitySignalService;
    private readonly _state;
    private readonly _linearHistory;
    private readonly _linearHistoryIndex;
    /**
     * Contains the contents of a file when the AI first began doing edits to it.
     */
    private readonly _initialFileContents;
    private readonly _entriesObs;
    get entries(): IObservable<readonly IModifiedFileEntry[]>;
    private _editorPane;
    get state(): IObservable<ChatEditingSessionState>;
    readonly canUndo: import("../../../../../base/common/observable.js").IObservableWithChange<boolean, void>;
    readonly canRedo: import("../../../../../base/common/observable.js").IObservableWithChange<boolean, void>;
    private readonly _onDidDispose;
    get onDidDispose(): import("../../../../workbench.web.main.internal.js").Event<void>;
    constructor(chatSessionId: string, isGlobalEditingSession: boolean, _lookupExternalEntry: (uri: URI) => AbstractChatEditingModifiedFileEntry | undefined, _instantiationService: IInstantiationService, _modelService: IModelService, _languageService: ILanguageService, _textModelService: ITextModelService, _bulkEditService: IBulkEditService, _editorGroupsService: IEditorGroupsService, _editorService: IEditorService, _chatService: IChatService, _notebookService: INotebookService, _editorWorkerService: IEditorWorkerService, _configurationService: IConfigurationService, _accessibilitySignalService: IAccessibilitySignalService);
    init(): Promise<void>;
    private _getEntry;
    getEntry(uri: URI): IModifiedFileEntry | undefined;
    readEntry(uri: URI, reader: IReader | undefined): IModifiedFileEntry | undefined;
    storeState(): Promise<void>;
    private _findSnapshot;
    private _findEditStop;
    private _ensurePendingSnapshot;
    private _diffsBetweenStops;
    private _fullDiffs;
    private readonly _ignoreTrimWhitespaceObservable;
    /**
     * Gets diff for text entries between stops.
     * @param entriesContent Observable that observes either snapshot entry
     * @param modelUrisObservable Observable that observes only the snapshot URIs.
     */
    private _entryDiffBetweenTextStops;
    private _createDiffBetweenStopsObservable;
    getEntryDiffBetweenStops(uri: URI, requestId: string | undefined, stopId: string | undefined): IObservable<IEditSessionEntryDiff | undefined>;
    createSnapshot(requestId: string, undoStop: string | undefined, makeEmpty?: boolean): void;
    private _createEmptySnapshot;
    private _createSnapshot;
    getSnapshot(requestId: string, undoStop: string | undefined, snapshotUri: URI): ISnapshotEntry | undefined;
    getSnapshotModel(requestId: string, undoStop: string | undefined, snapshotUri: URI): Promise<ITextModel | null>;
    getSnapshotUri(requestId: string, uri: URI, stopId: string | undefined): URI | undefined;
    /**
     * A snapshot representing the state of the working set before a new request has been sent
     */
    private _pendingSnapshot;
    restoreSnapshot(requestId: string | undefined, stopId: string | undefined): Promise<void>;
    private _restoreSnapshot;
    private _assertNotDisposed;
    accept(...uris: URI[]): Promise<void>;
    reject(...uris: URI[]): Promise<void>;
    show(previousChanges?: boolean): Promise<void>;
    private _stopPromise;
    stop(clearState?: boolean): Promise<void>;
    private _performStop;
    dispose(): void;
    private _streamingEditLocks;
    private get isDisposed();
    startStreamingEdits(resource: URI, responseModel: IChatResponseModel, inUndoStop: string | undefined): IStreamingEdits;
    private _getHistoryEntryByLinearIndex;
    undoInteraction(): Promise<void>;
    redoInteraction(): Promise<void>;
    private _updateRequestHiddenState;
    private _acceptStreamingEditsStart;
    /**
     * Ensures the state of the file in the given snapshot matches the current
     * state of the {@param entry}. This is used to handle concurrent file edits.
     *
     * Given the case of two different edits, we will place and undo stop right
     * before we `textEditGroup` in the underlying markdown stream, but at the
     * time those are added the edits haven't been made yet, so both files will
     * simply have the unmodified state.
     *
     * This method is called after each edit, so after the first file finishes
     * being edits, it will update its content in the second undo snapshot such
     * that it can be undone successfully.
     *
     * We ensure that the same file is not concurrently edited via the
     * {@link _streamingEditLocks}, avoiding race conditions.
     *
     * @param next If true, this will edit the snapshot _after_ the undo stop
     */
    private ensureEditInUndoStopMatches;
    private _acceptEdits;
    private _getTelemetryInfoForModel;
    private _resolve;
    /**
     * Retrieves or creates a modified file entry.
     *
     * @returns The modified file entry.
     */
    private _getOrCreateModifiedFileEntry;
    private _createModifiedFileEntry;
    private _collapse;
}
