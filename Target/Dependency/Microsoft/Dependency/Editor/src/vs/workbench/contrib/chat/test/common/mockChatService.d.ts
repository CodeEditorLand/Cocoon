import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { ChatModel, IChatModel, IChatRequestModel, IChatRequestVariableData, ISerializableChatData } from '../../common/chatModel.js';
import { IParsedChatRequest } from '../../common/chatParserTypes.js';
import { IChatCompleteResponse, IChatDetail, IChatProviderInfo, IChatSendRequestData, IChatSendRequestOptions, IChatService, IChatTransferredSessionData, IChatUserActionEvent } from '../../common/chatService.js';
import { ChatAgentLocation } from '../../common/constants.js';
export declare class MockChatService implements IChatService {
    edits2Enabled: boolean;
    _serviceBrand: undefined;
    transferredSessionData: IChatTransferredSessionData | undefined;
    onDidSubmitRequest: Event<{
        chatSessionId: string;
    }>;
    private sessions;
    isEnabled(location: ChatAgentLocation): boolean;
    hasSessions(): boolean;
    getProviderInfos(): IChatProviderInfo[];
    startSession(location: ChatAgentLocation, token: CancellationToken): ChatModel;
    addSession(session: IChatModel): void;
    getSession(sessionId: string): IChatModel | undefined;
    getOrRestoreSession(sessionId: string): Promise<IChatModel | undefined>;
    loadSessionFromContent(data: ISerializableChatData): IChatModel | undefined;
    /**
     * Returns whether the request was accepted.
     */
    sendRequest(sessionId: string, message: string): Promise<IChatSendRequestData | undefined>;
    resendRequest(request: IChatRequestModel, options?: IChatSendRequestOptions | undefined): Promise<void>;
    adoptRequest(sessionId: string, request: IChatRequestModel): Promise<void>;
    removeRequest(sessionid: string, requestId: string): Promise<void>;
    cancelCurrentRequestForSession(sessionId: string): void;
    clearSession(sessionId: string): Promise<void>;
    addCompleteRequest(sessionId: string, message: IParsedChatRequest | string, variableData: IChatRequestVariableData | undefined, attempt: number | undefined, response: IChatCompleteResponse): void;
    getHistory(): Promise<IChatDetail[]>;
    clearAllHistoryEntries(): Promise<void>;
    removeHistoryEntry(sessionId: string): Promise<void>;
    onDidPerformUserAction: Event<IChatUserActionEvent>;
    notifyUserAction(event: IChatUserActionEvent): void;
    onDidDisposeSession: Event<{
        sessionId: string;
        reason: 'cleared';
    }>;
    transferChatSession(transferredSessionData: IChatTransferredSessionData, toWorkspace: URI): void;
    setChatSessionTitle(sessionId: string, title: string): void;
    isEditingLocation(location: ChatAgentLocation): boolean;
    getChatStorageFolder(): URI;
    logChatIndex(): void;
    isPersistedSessionEmpty(sessionId: string): boolean;
    activateDefaultAgent(location: ChatAgentLocation): Promise<void>;
}
