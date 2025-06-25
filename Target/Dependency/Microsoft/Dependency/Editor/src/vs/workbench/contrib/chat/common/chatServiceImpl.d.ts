import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatModel, IChatModel, IChatRequestModel, IChatRequestVariableData, IExportableChatData, ISerializableChatData } from './chatModel.js';
import { IParsedChatRequest } from './chatParserTypes.js';
import { IChatCompleteResponse, IChatDetail, IChatSendRequestData, IChatSendRequestOptions, IChatService, IChatTransferredSessionData, IChatUserActionEvent } from './chatService.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatTransferService } from './chatTransferService.js';
import { ChatAgentLocation } from './constants.js';
import { ILanguageModelsService } from './languageModels.js';
export declare class ChatService extends Disposable implements IChatService {
    private readonly storageService;
    private readonly logService;
    private readonly extensionService;
    private readonly instantiationService;
    private readonly telemetryService;
    private readonly workspaceContextService;
    private readonly chatSlashCommandService;
    private readonly chatAgentService;
    private readonly configurationService;
    private readonly experimentService;
    private readonly chatTransferService;
    private readonly languageModelsService;
    _serviceBrand: undefined;
    private readonly _sessionModels;
    private readonly _pendingRequests;
    private _persistedSessions;
    /** Just for empty windows, need to enforce that a chat was deleted, even though other windows still have it */
    private _deletedChatIds;
    private _transferredSessionData;
    get transferredSessionData(): IChatTransferredSessionData | undefined;
    private readonly _onDidSubmitRequest;
    readonly onDidSubmitRequest: Event<{
        chatSessionId: string;
    }>;
    private readonly _onDidPerformUserAction;
    readonly onDidPerformUserAction: Event<IChatUserActionEvent>;
    private readonly _onDidDisposeSession;
    readonly onDidDisposeSession: Event<{
        sessionId: string;
        reason: "cleared";
    }>;
    private readonly _sessionFollowupCancelTokens;
    private readonly _chatServiceTelemetry;
    private readonly _chatSessionStore;
    private get useFileStorage();
    get edits2Enabled(): boolean;
    private get isEmptyWindow();
    constructor(storageService: IStorageService, logService: ILogService, extensionService: IExtensionService, instantiationService: IInstantiationService, telemetryService: ITelemetryService, workspaceContextService: IWorkspaceContextService, chatSlashCommandService: IChatSlashCommandService, chatAgentService: IChatAgentService, configurationService: IConfigurationService, experimentService: IWorkbenchAssignmentService, chatTransferService: IChatTransferService, languageModelsService: ILanguageModelsService);
    isEnabled(location: ChatAgentLocation): boolean;
    private saveState;
    private syncEmptyWindowChats;
    notifyUserAction(action: IChatUserActionEvent): void;
    setChatSessionTitle(sessionId: string, title: string): Promise<void>;
    private trace;
    private error;
    private deserializeChats;
    private getTransferredSessionData;
    /**
     * Returns an array of chat details for all persisted chat sessions that have at least one request.
     * Chat sessions that have already been loaded into the chat view are excluded from the result.
     * Imported chat sessions are also excluded from the result.
     */
    getHistory(): Promise<IChatDetail[]>;
    removeHistoryEntry(sessionId: string): Promise<void>;
    clearAllHistoryEntries(): Promise<void>;
    startSession(location: ChatAgentLocation, token: CancellationToken, isGlobalEditingSession?: boolean): ChatModel;
    private _startSession;
    private initializeSession;
    activateDefaultAgent(location: ChatAgentLocation): Promise<void>;
    getSession(sessionId: string): IChatModel | undefined;
    getOrRestoreSession(sessionId: string): Promise<ChatModel | undefined>;
    /**
     * This is really just for migrating data from the edit session location to the panel.
     */
    isPersistedSessionEmpty(sessionId: string): boolean;
    loadSessionFromContent(data: IExportableChatData | ISerializableChatData): IChatModel | undefined;
    resendRequest(request: IChatRequestModel, options?: IChatSendRequestOptions): Promise<void>;
    sendRequest(sessionId: string, request: string, options?: IChatSendRequestOptions): Promise<IChatSendRequestData | undefined>;
    private parseChatRequest;
    private refreshFollowupsCancellationToken;
    private _sendRequestAsync;
    private resolveModelId;
    private prepareContext;
    private checkAgentAllowed;
    private attachmentKindsForTelemetry;
    private getHistoryEntriesFromModel;
    removeRequest(sessionId: string, requestId: string): Promise<void>;
    adoptRequest(sessionId: string, request: IChatRequestModel): Promise<void>;
    addCompleteRequest(sessionId: string, message: IParsedChatRequest | string, variableData: IChatRequestVariableData | undefined, attempt: number | undefined, response: IChatCompleteResponse): Promise<void>;
    cancelCurrentRequestForSession(sessionId: string): void;
    clearSession(sessionId: string): Promise<void>;
    hasSessions(): boolean;
    transferChatSession(transferredSessionData: IChatTransferredSessionData, toWorkspace: URI): void;
    getChatStorageFolder(): URI;
    logChatIndex(): void;
}
