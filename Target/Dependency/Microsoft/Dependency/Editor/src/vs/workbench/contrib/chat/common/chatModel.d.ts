import { Event } from '../../../../base/common/event.js';
import { IMarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { IObservable, ITransaction, ObservablePromise } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI, UriComponents, UriDto } from '../../../../base/common/uri.js';
import { IRange } from '../../../../editor/common/core/range.js';
import { TextEdit } from '../../../../editor/common/languages.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ICellEditOperation } from '../../notebook/common/notebookCommon.js';
import { IChatAgentCommand, IChatAgentData, IChatAgentResult, IChatAgentService } from './chatAgents.js';
import { IChatEditingService, IChatEditingSession } from './chatEditingService.js';
import { IParsedChatRequest } from './chatParserTypes.js';
import { ChatAgentVoteDirection, ChatAgentVoteDownReason, IChatAgentMarkdownContentWithVulnerability, IChatCodeCitation, IChatCommandButton, IChatConfirmation, IChatContentInlineReference, IChatContentReference, IChatEditingSessionAction, IChatElicitationRequest, IChatExtensionsContent, IChatFollowup, IChatLocationData, IChatMarkdownContent, IChatNotebookEdit, IChatPrepareToolInvocationPart, IChatProgress, IChatProgressMessage, IChatResponseCodeblockUriPart, IChatResponseProgressFileTreeData, IChatTask, IChatTaskSerialized, IChatTextEdit, IChatToolInvocation, IChatToolInvocationSerialized, IChatTreeData, IChatUndoStop, IChatUsedContext, IChatWarningMessage } from './chatService.js';
import { IChatRequestVariableEntry } from './chatVariableEntries.js';
import { ChatAgentLocation } from './constants.js';
export declare const CHAT_ATTACHABLE_IMAGE_MIME_TYPES: Record<string, string>;
export declare function getAttachableImageExtension(mimeType: string): string | undefined;
export interface IChatRequestVariableData {
    variables: IChatRequestVariableEntry[];
}
export interface IChatRequestModel {
    readonly id: string;
    readonly timestamp: number;
    readonly username: string;
    readonly avatarIconUri?: URI;
    readonly session: IChatModel;
    readonly message: IParsedChatRequest;
    readonly attempt: number;
    readonly variableData: IChatRequestVariableData;
    readonly confirmation?: string;
    readonly locationData?: IChatLocationData;
    readonly attachedContext?: IChatRequestVariableEntry[];
    readonly isCompleteAddedRequest: boolean;
    readonly response?: IChatResponseModel;
    readonly editedFileEvents?: IChatAgentEditedFileEvent[];
    shouldBeRemovedOnSend: IChatRequestDisablement | undefined;
}
export interface IChatTextEditGroupState {
    sha1: string;
    applied: number;
}
export interface IChatTextEditGroup {
    uri: URI;
    edits: TextEdit[][];
    state?: IChatTextEditGroupState;
    kind: 'textEditGroup';
    done: boolean | undefined;
}
export declare function isCellTextEditOperation(value: unknown): value is ICellTextEditOperation;
export interface ICellTextEditOperation {
    edit: TextEdit;
    uri: URI;
}
export interface IChatNotebookEditGroup {
    uri: URI;
    edits: (ICellTextEditOperation | ICellEditOperation)[];
    state?: IChatTextEditGroupState;
    kind: 'notebookEditGroup';
    done: boolean | undefined;
}
/**
 * Progress kinds that are included in the history of a response.
 * Excludes "internal" types that are included in history.
 */
export type IChatProgressHistoryResponseContent = IChatMarkdownContent | IChatAgentMarkdownContentWithVulnerability | IChatResponseCodeblockUriPart | IChatTreeData | IChatContentInlineReference | IChatProgressMessage | IChatCommandButton | IChatWarningMessage | IChatTask | IChatTaskSerialized | IChatTextEditGroup | IChatNotebookEditGroup | IChatConfirmation | IChatExtensionsContent;
/**
 * "Normal" progress kinds that are rendered as parts of the stream of content.
 */
export type IChatProgressResponseContent = IChatProgressHistoryResponseContent | IChatToolInvocation | IChatToolInvocationSerialized | IChatUndoStop | IChatPrepareToolInvocationPart | IChatElicitationRequest;
export declare function toChatHistoryContent(content: ReadonlyArray<IChatProgressResponseContent>): IChatProgressHistoryResponseContent[];
export type IChatProgressRenderableResponseContent = Exclude<IChatProgressResponseContent, IChatContentInlineReference | IChatAgentMarkdownContentWithVulnerability | IChatResponseCodeblockUriPart>;
export interface IResponse {
    readonly value: ReadonlyArray<IChatProgressResponseContent>;
    getMarkdown(): string;
    toString(): string;
}
export interface IChatResponseModel {
    readonly onDidChange: Event<ChatResponseModelChangeReason>;
    readonly id: string;
    readonly requestId: string;
    readonly username: string;
    readonly avatarIcon?: ThemeIcon | URI;
    readonly session: IChatModel;
    readonly agent?: IChatAgentData;
    readonly usedContext: IChatUsedContext | undefined;
    readonly contentReferences: ReadonlyArray<IChatContentReference>;
    readonly codeCitations: ReadonlyArray<IChatCodeCitation>;
    readonly progressMessages: ReadonlyArray<IChatProgressMessage>;
    readonly slashCommand?: IChatAgentCommand;
    readonly agentOrSlashCommandDetected: boolean;
    /** View of the response shown to the user, may have parts omitted from undo stops. */
    readonly response: IResponse;
    /** Entire response from the model. */
    readonly entireResponse: IResponse;
    readonly isComplete: boolean;
    readonly isCanceled: boolean;
    readonly isPaused: IObservable<boolean>;
    readonly isPendingConfirmation: IObservable<boolean>;
    readonly isInProgress: IObservable<boolean>;
    readonly shouldBeRemovedOnSend: IChatRequestDisablement | undefined;
    readonly isCompleteAddedRequest: boolean;
    /** A stale response is one that has been persisted and rehydrated, so e.g. Commands that have their arguments stored in the EH are gone. */
    readonly isStale: boolean;
    readonly vote: ChatAgentVoteDirection | undefined;
    readonly voteDownReason: ChatAgentVoteDownReason | undefined;
    readonly followups?: IChatFollowup[] | undefined;
    readonly result?: IChatAgentResult;
    addUndoStop(undoStop: IChatUndoStop): void;
    setVote(vote: ChatAgentVoteDirection): void;
    setVoteDownReason(reason: ChatAgentVoteDownReason | undefined): void;
    setEditApplied(edit: IChatTextEditGroup, editCount: number): boolean;
    setPaused(isPause: boolean, tx?: ITransaction): void;
    /**
     * Adopts any partially-undo {@link response} as the {@link entireResponse}.
     * Only valid when {@link isComplete}. This is needed because otherwise an
     * undone and then diverged state would start showing old data because the
     * undo stops would no longer exist in the model.
     */
    finalizeUndoState(): void;
}
export type ChatResponseModelChangeReason = {
    reason: 'other';
} | {
    reason: 'undoStop';
    id: string;
};
export interface IChatRequestModelParameters {
    session: ChatModel;
    message: IParsedChatRequest;
    variableData: IChatRequestVariableData;
    timestamp: number;
    attempt?: number;
    confirmation?: string;
    locationData?: IChatLocationData;
    attachedContext?: IChatRequestVariableEntry[];
    isCompleteAddedRequest?: boolean;
    modelId?: string;
    restoredId?: string;
    editedFileEvents?: IChatAgentEditedFileEvent[];
}
export declare class ChatRequestModel implements IChatRequestModel {
    readonly id: string;
    response: ChatResponseModel | undefined;
    shouldBeRemovedOnSend: IChatRequestDisablement | undefined;
    readonly timestamp: number;
    readonly message: IParsedChatRequest;
    readonly isCompleteAddedRequest: boolean;
    readonly modelId?: string;
    private _session;
    private readonly _attempt;
    private _variableData;
    private readonly _confirmation?;
    private readonly _locationData?;
    private readonly _attachedContext?;
    private readonly _editedFileEvents?;
    get session(): ChatModel;
    get username(): string;
    get avatarIconUri(): URI | undefined;
    get attempt(): number;
    get variableData(): IChatRequestVariableData;
    set variableData(v: IChatRequestVariableData);
    get confirmation(): string | undefined;
    get locationData(): IChatLocationData | undefined;
    get attachedContext(): IChatRequestVariableEntry[] | undefined;
    get editedFileEvents(): IChatAgentEditedFileEvent[] | undefined;
    constructor(params: IChatRequestModelParameters);
    adoptTo(session: ChatModel): void;
}
declare class AbstractResponse implements IResponse {
    protected _responseParts: IChatProgressResponseContent[];
    /**
     * A stringified representation of response data which might be presented to a screenreader or used when copying a response.
     */
    protected _responseRepr: string;
    /**
     * Just the markdown content of the response, used for determining the rendering rate of markdown
     */
    protected _markdownContent: string;
    get value(): IChatProgressResponseContent[];
    constructor(value: IChatProgressResponseContent[]);
    toString(): string;
    /**
     * _Just_ the content of markdown parts in the response
     */
    getMarkdown(): string;
    protected _updateRepr(): void;
    private partsToRepr;
    private inlineRefToRepr;
    private uriToRepr;
}
export declare class Response extends AbstractResponse implements IDisposable {
    private _onDidChangeValue;
    get onDidChangeValue(): Event<void>;
    private _citations;
    constructor(value: IMarkdownString | ReadonlyArray<IMarkdownString | IChatResponseProgressFileTreeData | IChatContentInlineReference | IChatAgentMarkdownContentWithVulnerability | IChatResponseCodeblockUriPart>);
    dispose(): void;
    clear(): void;
    updateContent(progress: IChatProgressResponseContent | IChatTextEdit | IChatNotebookEdit | IChatTask, quiet?: boolean): void;
    addCitation(citation: IChatCodeCitation): void;
    protected _updateRepr(quiet?: boolean): void;
}
export interface IChatResponseModelParameters {
    responseContent: IMarkdownString | ReadonlyArray<IMarkdownString | IChatResponseProgressFileTreeData | IChatContentInlineReference | IChatAgentMarkdownContentWithVulnerability | IChatResponseCodeblockUriPart>;
    session: ChatModel;
    agent?: IChatAgentData;
    slashCommand?: IChatAgentCommand;
    requestId: string;
    isComplete?: boolean;
    isCanceled?: boolean;
    vote?: ChatAgentVoteDirection;
    voteDownReason?: ChatAgentVoteDownReason;
    result?: IChatAgentResult;
    followups?: ReadonlyArray<IChatFollowup>;
    isCompleteAddedRequest?: boolean;
    shouldBeRemovedOnSend?: IChatRequestDisablement;
    restoredId?: string;
}
export declare class ChatResponseModel extends Disposable implements IChatResponseModel {
    private readonly _onDidChange;
    readonly onDidChange: Event<ChatResponseModelChangeReason>;
    readonly id: string;
    readonly requestId: string;
    private _session;
    private _agent;
    private _slashCommand;
    private _isComplete;
    private _isCanceled;
    private _vote?;
    private _voteDownReason?;
    private _result?;
    private _shouldBeRemovedOnSend;
    readonly isCompleteAddedRequest: boolean;
    get session(): ChatModel;
    get shouldBeRemovedOnSend(): IChatRequestDisablement | undefined;
    get isComplete(): boolean;
    set shouldBeRemovedOnSend(disablement: IChatRequestDisablement | undefined);
    get isCanceled(): boolean;
    get vote(): ChatAgentVoteDirection | undefined;
    get voteDownReason(): ChatAgentVoteDownReason | undefined;
    get followups(): IChatFollowup[] | undefined;
    private _response;
    private _finalizedResponse?;
    get entireResponse(): IResponse;
    get result(): IChatAgentResult | undefined;
    get username(): string;
    get avatarIcon(): ThemeIcon | URI | undefined;
    private _followups?;
    get agent(): IChatAgentData | undefined;
    get slashCommand(): IChatAgentCommand | undefined;
    private _agentOrSlashCommandDetected;
    get agentOrSlashCommandDetected(): boolean;
    private _usedContext;
    get usedContext(): IChatUsedContext | undefined;
    private readonly _contentReferences;
    get contentReferences(): ReadonlyArray<IChatContentReference>;
    private readonly _codeCitations;
    get codeCitations(): ReadonlyArray<IChatCodeCitation>;
    private readonly _progressMessages;
    get progressMessages(): ReadonlyArray<IChatProgressMessage>;
    private _isStale;
    get isStale(): boolean;
    private readonly _isPaused;
    get isPaused(): IObservable<boolean>;
    readonly isPendingConfirmation: IObservable<boolean>;
    readonly isInProgress: IObservable<boolean>;
    private _responseView?;
    get response(): IResponse;
    /** Functions run once the chat response is unpaused. */
    private bufferedPauseContent?;
    constructor(params: IChatResponseModelParameters);
    /**
     * Apply a progress update to the actual response content.
     */
    updateContent(responsePart: IChatProgressResponseContent | IChatTextEdit | IChatNotebookEdit, quiet?: boolean): void;
    /**
     * Adds an undo stop at the current position in the stream.
     */
    addUndoStop(undoStop: IChatUndoStop): void;
    /**
     * Apply one of the progress updates that are not part of the actual response content.
     */
    applyReference(progress: IChatUsedContext | IChatContentReference): void;
    applyCodeCitation(progress: IChatCodeCitation): void;
    setAgent(agent: IChatAgentData, slashCommand?: IChatAgentCommand): void;
    setResult(result: IChatAgentResult): void;
    complete(): void;
    cancel(): void;
    setFollowups(followups: IChatFollowup[] | undefined): void;
    setVote(vote: ChatAgentVoteDirection): void;
    setVoteDownReason(reason: ChatAgentVoteDownReason | undefined): void;
    setEditApplied(edit: IChatTextEditGroup, editCount: number): boolean;
    adoptTo(session: ChatModel): void;
    setPaused(isPause: boolean, tx?: ITransaction): void;
    finalizeUndoState(): void;
    private bufferWhenPaused;
}
export declare const enum ChatPauseState {
    NotPausable = 0,
    Paused = 1,
    Unpaused = 2
}
export interface IChatRequestDisablement {
    requestId: string;
    afterUndoStop?: string;
}
export interface IChatModel {
    readonly onDidDispose: Event<void>;
    readonly onDidChange: Event<IChatChangeEvent>;
    readonly sessionId: string;
    readonly initialLocation: ChatAgentLocation;
    readonly title: string;
    readonly requestInProgress: boolean;
    readonly requestInProgressObs: IObservable<boolean>;
    readonly requestPausibility: ChatPauseState;
    readonly inputPlaceholder?: string;
    readonly editingSessionObs?: ObservablePromise<IChatEditingSession> | undefined;
    readonly editingSession?: IChatEditingSession | undefined;
    toggleLastRequestPaused(paused?: boolean): void;
    /**
     * Sets requests as 'disabled', removing them from the UI. If a request ID
     * is given without undo stops, it's removed entirely. If an undo stop
     * is given, all content after that stop is removed.
     */
    setDisabledRequests(requestIds: IChatRequestDisablement[]): void;
    getRequests(): IChatRequestModel[];
    toExport(): IExportableChatData;
    toJSON(): ISerializableChatData;
}
export interface ISerializableChatsData {
    [sessionId: string]: ISerializableChatData;
}
export type ISerializableChatAgentData = UriDto<IChatAgentData>;
export interface ISerializableChatRequestData {
    requestId: string;
    message: string | IParsedChatRequest;
    /** Is really like "prompt data". This is the message in the format in which the agent gets it + variable values. */
    variableData: IChatRequestVariableData;
    response: ReadonlyArray<IMarkdownString | IChatResponseProgressFileTreeData | IChatContentInlineReference | IChatAgentMarkdownContentWithVulnerability> | undefined;
    /**Old, persisted name for shouldBeRemovedOnSend */
    isHidden?: boolean;
    shouldBeRemovedOnSend?: IChatRequestDisablement;
    responseId?: string;
    agent?: ISerializableChatAgentData;
    workingSet?: UriComponents[];
    slashCommand?: IChatAgentCommand;
    result?: IChatAgentResult;
    followups: ReadonlyArray<IChatFollowup> | undefined;
    isCanceled: boolean | undefined;
    vote: ChatAgentVoteDirection | undefined;
    voteDownReason?: ChatAgentVoteDownReason;
    /** For backward compat: should be optional */
    usedContext?: IChatUsedContext;
    contentReferences?: ReadonlyArray<IChatContentReference>;
    codeCitations?: ReadonlyArray<IChatCodeCitation>;
    timestamp?: number;
    confirmation?: string;
    editedFileEvents?: IChatAgentEditedFileEvent[];
}
export interface IExportableChatData {
    initialLocation: ChatAgentLocation | undefined;
    requests: ISerializableChatRequestData[];
    requesterUsername: string;
    responderUsername: string;
    requesterAvatarIconUri: UriComponents | undefined;
    responderAvatarIconUri: ThemeIcon | UriComponents | undefined;
}
export interface ISerializableChatData1 extends IExportableChatData {
    sessionId: string;
    creationDate: number;
    isImported: boolean;
    /** Indicates that this session was created in this window. Is cleared after the chat has been written to storage once. Needed to sync chat creations/deletions between empty windows. */
    isNew?: boolean;
}
export interface ISerializableChatData2 extends ISerializableChatData1 {
    version: 2;
    lastMessageDate: number;
    computedTitle: string | undefined;
}
export interface ISerializableChatData3 extends Omit<ISerializableChatData2, 'version' | 'computedTitle'> {
    version: 3;
    customTitle: string | undefined;
}
/**
 * Chat data that has been parsed and normalized to the current format.
 */
export type ISerializableChatData = ISerializableChatData3;
/**
 * Chat data that has been loaded but not normalized, and could be any format
 */
export type ISerializableChatDataIn = ISerializableChatData1 | ISerializableChatData2 | ISerializableChatData3;
/**
 * Normalize chat data from storage to the current format.
 * TODO- ChatModel#_deserialize and reviveSerializedAgent also still do some normalization and maybe that should be done in here too.
 */
export declare function normalizeSerializableChatData(raw: ISerializableChatDataIn): ISerializableChatData;
export declare function isExportableSessionData(obj: unknown): obj is IExportableChatData;
export declare function isSerializableSessionData(obj: unknown): obj is ISerializableChatData;
export type IChatChangeEvent = IChatInitEvent | IChatAddRequestEvent | IChatChangedRequestEvent | IChatRemoveRequestEvent | IChatAddResponseEvent | IChatSetAgentEvent | IChatMoveEvent | IChatSetHiddenEvent | IChatCompletedRequestEvent;
export interface IChatAddRequestEvent {
    kind: 'addRequest';
    request: IChatRequestModel;
}
export interface IChatChangedRequestEvent {
    kind: 'changedRequest';
    request: IChatRequestModel;
}
export interface IChatCompletedRequestEvent {
    kind: 'completedRequest';
    request: IChatRequestModel;
}
export interface IChatAddResponseEvent {
    kind: 'addResponse';
    response: IChatResponseModel;
}
export declare const enum ChatRequestRemovalReason {
    /**
     * "Normal" remove
     */
    Removal = 0,
    /**
     * Removed because the request will be resent
     */
    Resend = 1,
    /**
     * Remove because the request is moving to another model
     */
    Adoption = 2
}
export interface IChatRemoveRequestEvent {
    kind: 'removeRequest';
    requestId: string;
    responseId?: string;
    reason: ChatRequestRemovalReason;
}
export interface IChatSetHiddenEvent {
    kind: 'setHidden';
    hiddenRequestIds: readonly IChatRequestDisablement[];
}
export interface IChatMoveEvent {
    kind: 'move';
    target: URI;
    range: IRange;
}
export interface IChatSetAgentEvent {
    kind: 'setAgent';
    agent: IChatAgentData;
    command?: IChatAgentCommand;
}
export interface IChatInitEvent {
    kind: 'initialize';
}
export declare class ChatModel extends Disposable implements IChatModel {
    private readonly initialData;
    private readonly _initialLocation;
    private readonly logService;
    private readonly chatAgentService;
    private readonly chatEditingService;
    static getDefaultTitle(requests: (ISerializableChatRequestData | IChatRequestModel)[]): string;
    private readonly _onDidDispose;
    readonly onDidDispose: Event<void>;
    private readonly _onDidChange;
    readonly onDidChange: Event<IChatChangeEvent>;
    private _requests;
    private _sessionId;
    get sessionId(): string;
    get requestInProgress(): boolean;
    readonly requestInProgressObs: IObservable<boolean>;
    get requestPausibility(): ChatPauseState;
    get hasRequests(): boolean;
    get lastRequest(): ChatRequestModel | undefined;
    private _creationDate;
    get creationDate(): number;
    private _lastMessageDate;
    get lastMessageDate(): number;
    private get _defaultAgent();
    get requesterUsername(): string;
    get responderUsername(): string;
    private readonly _initialRequesterAvatarIconUri;
    get requesterAvatarIconUri(): URI | undefined;
    private readonly _initialResponderAvatarIconUri;
    get responderAvatarIcon(): ThemeIcon | URI | undefined;
    private _isImported;
    get isImported(): boolean;
    private _customTitle;
    get customTitle(): string | undefined;
    get title(): string;
    get initialLocation(): ChatAgentLocation;
    private _editingSession;
    get editingSessionObs(): ObservablePromise<IChatEditingSession> | undefined;
    get editingSession(): IChatEditingSession | undefined;
    constructor(initialData: ISerializableChatData | IExportableChatData | undefined, _initialLocation: ChatAgentLocation, logService: ILogService, chatAgentService: IChatAgentService, chatEditingService: IChatEditingService);
    startEditingSession(isGlobalEditingSession?: boolean): void;
    private currentEditedFileEvents;
    notifyEditingAction(action: IChatEditingSessionAction): void;
    private _deserialize;
    private reviveVariableData;
    private getParsedRequestFromString;
    toggleLastRequestPaused(isPaused?: boolean): void;
    getRequests(): ChatRequestModel[];
    private _checkpoint;
    get checkpoint(): ChatRequestModel | undefined;
    setDisabledRequests(requestIds: IChatRequestDisablement[]): void;
    addRequest(message: IParsedChatRequest, variableData: IChatRequestVariableData, attempt: number, chatAgent?: IChatAgentData, slashCommand?: IChatAgentCommand, confirmation?: string, locationData?: IChatLocationData, attachments?: IChatRequestVariableEntry[], isCompleteAddedRequest?: boolean, modelId?: string): ChatRequestModel;
    setCustomTitle(title: string): void;
    updateRequest(request: ChatRequestModel, variableData: IChatRequestVariableData): void;
    adoptRequest(request: ChatRequestModel): void;
    acceptResponseProgress(request: ChatRequestModel, progress: IChatProgress, quiet?: boolean): void;
    removeRequest(id: string, reason?: ChatRequestRemovalReason): void;
    cancelRequest(request: ChatRequestModel): void;
    setResponse(request: ChatRequestModel, result: IChatAgentResult): void;
    completeResponse(request: ChatRequestModel): void;
    setFollowups(request: ChatRequestModel, followups: IChatFollowup[] | undefined): void;
    setResponseModel(request: ChatRequestModel, response: ChatResponseModel): void;
    toExport(): IExportableChatData;
    toJSON(): ISerializableChatData;
    dispose(): void;
}
export declare function updateRanges(variableData: IChatRequestVariableData, diff: number): IChatRequestVariableData;
export declare function canMergeMarkdownStrings(md1: IMarkdownString, md2: IMarkdownString): boolean;
export declare function appendMarkdownString(md1: IMarkdownString, md2: IMarkdownString | string): IMarkdownString;
export declare function getCodeCitationsMessage(citations: ReadonlyArray<IChatCodeCitation>): string;
export declare enum ChatRequestEditedFileEventKind {
    Keep = 1,
    Undo = 2,
    UserModification = 3
}
export interface IChatAgentEditedFileEvent {
    readonly uri: URI;
    readonly eventKind: ChatRequestEditedFileEventKind;
}
/** URI for a resource embedded in a chat request/response */
export declare namespace ChatResponseResource {
    const scheme = "vscode-chat-response-resource";
    function createUri(sessionId: string, requestId: string, toolCallId: string, index: number, basename?: string): URI;
    function parseUri(uri: URI): undefined | {
        sessionId: string;
        requestId: string;
        toolCallId: string;
        index: number;
    };
}
export {};
