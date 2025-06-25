import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { ICodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IPosition, Position } from '../../../../editor/common/core/position.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { ISelection } from '../../../../editor/common/core/selection.js';
import { IEditorContribution } from '../../../../editor/common/editorCommon.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IChatRequestVariableEntry } from '../../chat/common/chatVariableEntries.js';
import { IChatService } from '../../chat/common/chatService.js';
import { INotebookEditorService } from '../../notebook/browser/services/notebookEditorService.js';
import { HunkInformation, Session } from './inlineChatSession.js';
import { IInlineChatSessionService } from './inlineChatSessionService.js';
import { EditorBasedInlineChatWidget } from './inlineChatWidget.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IChatAttachmentResolveService } from '../../chat/browser/chatAttachmentResolveService.js';
import { ICellEditOperation } from '../../notebook/common/notebookCommon.js';
export declare const enum State {
    CREATE_SESSION = "CREATE_SESSION",
    INIT_UI = "INIT_UI",
    WAIT_FOR_INPUT = "WAIT_FOR_INPUT",
    SHOW_REQUEST = "SHOW_REQUEST",
    PAUSE = "PAUSE",
    CANCEL = "CANCEL",
    ACCEPT = "DONE"
}
export declare abstract class InlineChatRunOptions {
    initialSelection?: ISelection;
    initialRange?: IRange;
    message?: string;
    attachments?: URI[];
    autoSend?: boolean;
    existingSession?: Session;
    position?: IPosition;
    static isInlineChatRunOptions(options: any): options is InlineChatRunOptions;
}
export declare class InlineChatController implements IEditorContribution {
    static ID: string;
    static get(editor: ICodeEditor): InlineChatController | null;
    private readonly _delegate;
    constructor(editor: ICodeEditor, configurationService: IConfigurationService);
    dispose(): void;
    get isActive(): boolean;
    run(arg?: InlineChatRunOptions): Promise<boolean>;
    focus(): void;
    get widget(): EditorBasedInlineChatWidget;
    getWidgetPosition(): Position | undefined;
    acceptSession(): void;
}
/**
 * @deprecated
 */
export declare class InlineChatController1 implements IEditorContribution {
    private readonly _editor;
    private readonly _instaService;
    private readonly _inlineChatSessionService;
    private readonly _editorWorkerService;
    private readonly _logService;
    private readonly _configurationService;
    private readonly _dialogService;
    private readonly _chatService;
    private readonly _editorService;
    private readonly _webContentExtractorService;
    private readonly _fileService;
    private readonly _chatAttachmentResolveService;
    static get(editor: ICodeEditor): InlineChatController1 | null;
    private _isDisposed;
    private readonly _store;
    private readonly _ui;
    private readonly _ctxVisible;
    private readonly _ctxEditing;
    private readonly _ctxResponseType;
    private readonly _ctxRequestInProgress;
    private readonly _ctxResponse;
    private readonly _messages;
    protected readonly _onDidEnterState: Emitter<State>;
    get chatWidget(): import("../../chat/browser/chatWidget.js").ChatWidget;
    private readonly _sessionStore;
    private readonly _stashedSession;
    private _session?;
    private _strategy?;
    constructor(_editor: ICodeEditor, _instaService: IInstantiationService, _inlineChatSessionService: IInlineChatSessionService, _editorWorkerService: IEditorWorkerService, _logService: ILogService, _configurationService: IConfigurationService, _dialogService: IDialogService, contextKeyService: IContextKeyService, _chatService: IChatService, _editorService: IEditorService, notebookEditorService: INotebookEditorService, _webContentExtractorService: ISharedWebContentExtractorService, _fileService: IFileService, _chatAttachmentResolveService: IChatAttachmentResolveService);
    dispose(): void;
    private _log;
    get widget(): EditorBasedInlineChatWidget;
    getId(): string;
    getWidgetPosition(): Position | undefined;
    private _currentRun?;
    run(options?: InlineChatRunOptions | undefined): Promise<boolean>;
    protected _nextState(state: State, options: InlineChatRunOptions): Promise<void>;
    private [State.CREATE_SESSION];
    private [State.INIT_UI];
    private [State.WAIT_FOR_INPUT];
    private [State.SHOW_REQUEST];
    private [State.PAUSE];
    private [State.ACCEPT];
    private [State.CANCEL];
    private _showWidget;
    private _resetWidget;
    private _updateCtxResponseType;
    private _createChatTextEditGroupState;
    private _makeChanges;
    private _updatePlaceholder;
    private _updateInput;
    arrowOut(up: boolean): void;
    focus(): void;
    viewInChat(): Promise<void>;
    acceptSession(): void;
    acceptHunk(hunkInfo?: HunkInformation): void | undefined;
    discardHunk(hunkInfo?: HunkInformation): void | undefined;
    toggleDiff(hunkInfo?: HunkInformation): void | undefined;
    moveHunk(next: boolean): void;
    cancelSession(): Promise<void>;
    reportIssue(): void;
    unstashLastSession(): Session | undefined;
    joinCurrentRun(): Promise<void> | undefined;
    get isActive(): boolean;
    createImageAttachment(attachment: URI): Promise<IChatRequestVariableEntry | undefined>;
}
export declare class InlineChatController2 implements IEditorContribution {
    private readonly _editor;
    private readonly _instaService;
    private readonly _notebookEditorService;
    private readonly _inlineChatSessions;
    private readonly _webContentExtractorService;
    private readonly _fileService;
    private readonly _chatAttachmentResolveService;
    private readonly _editorService;
    static readonly ID = "editor.contrib.inlineChatController2";
    static get(editor: ICodeEditor): InlineChatController2 | undefined;
    private readonly _store;
    private readonly _showWidgetOverrideObs;
    private readonly _isActiveController;
    private readonly _zone;
    private readonly _currentSession;
    get widget(): EditorBasedInlineChatWidget;
    get isActive(): boolean;
    constructor(_editor: ICodeEditor, _instaService: IInstantiationService, _notebookEditorService: INotebookEditorService, _inlineChatSessions: IInlineChatSessionService, codeEditorService: ICodeEditorService, contextKeyService: IContextKeyService, _webContentExtractorService: ISharedWebContentExtractorService, _fileService: IFileService, _chatAttachmentResolveService: IChatAttachmentResolveService, _editorService: IEditorService, inlineChatService: IInlineChatSessionService);
    dispose(): void;
    toggleWidgetUntilNextRequest(): void;
    getWidgetPosition(): Position | undefined;
    focus(): void;
    markActiveController(): void;
    run(arg?: InlineChatRunOptions): Promise<boolean>;
    acceptSession(): void;
    createImageAttachment(attachment: URI): Promise<IChatRequestVariableEntry | undefined>;
}
export declare function reviewEdits(accessor: ServicesAccessor, editor: ICodeEditor, stream: AsyncIterable<TextEdit[]>, token: CancellationToken): Promise<boolean>;
export declare function reviewNotebookEdits(accessor: ServicesAccessor, uri: URI, stream: AsyncIterable<[URI, TextEdit[]] | ICellEditOperation[]>, token: CancellationToken): Promise<boolean>;
