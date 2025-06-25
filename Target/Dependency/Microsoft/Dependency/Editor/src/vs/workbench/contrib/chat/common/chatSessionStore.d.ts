import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ChatModel, ISerializableChatData, ISerializableChatsData } from './chatModel.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
export declare class ChatSessionStore extends Disposable {
    private readonly fileService;
    private readonly environmentService;
    private readonly logService;
    private readonly workspaceContextService;
    private readonly telemetryService;
    private readonly storageService;
    private readonly lifecycleService;
    private readonly userDataProfilesService;
    private readonly storageRoot;
    private readonly previousEmptyWindowStorageRoot;
    private readonly storeQueue;
    private storeTask;
    private shuttingDown;
    constructor(fileService: IFileService, environmentService: IEnvironmentService, logService: ILogService, workspaceContextService: IWorkspaceContextService, telemetryService: ITelemetryService, storageService: IStorageService, lifecycleService: ILifecycleService, userDataProfilesService: IUserDataProfilesService);
    storeSessions(sessions: ChatModel[]): Promise<void>;
    private writeSession;
    private flushIndex;
    private getIndexStorageScope;
    private trimEntries;
    private internalDeleteSession;
    hasSessions(): boolean;
    isSessionEmpty(sessionId: string): boolean;
    deleteSession(sessionId: string): Promise<void>;
    clearAllSessions(): Promise<void>;
    setSessionTitle(sessionId: string, title: string): Promise<void>;
    private reportError;
    private indexCache;
    private internalGetIndex;
    getIndex(): Promise<IChatSessionIndex>;
    logIndex(): void;
    migrateDataIfNeeded(getInitialData: () => ISerializableChatsData | undefined): Promise<void>;
    private migrate;
    readSession(sessionId: string): Promise<ISerializableChatData | undefined>;
    private readSessionFromPreviousLocation;
    private getStorageLocation;
    getChatStorageFolder(): URI;
}
interface IChatSessionEntryMetadata {
    sessionId: string;
    title: string;
    lastMessageDate: number;
    isImported?: boolean;
    initialLocation?: ChatAgentLocation;
    /**
     * This only exists because the migrated data from the storage service had empty sessions persisted, and it's impossible to know which ones are
     * currently in use. Now, `clearSession` deletes empty sessions, so old ones shouldn't take up space in the store anymore, but we still need to
     * filter the old ones out of history.
     */
    isEmpty?: boolean;
}
export type IChatSessionIndex = Record<string, IChatSessionEntryMetadata>;
export interface IChatTransfer {
    toWorkspace: URI;
    timestampInMilliseconds: number;
    inputValue: string;
    location: ChatAgentLocation;
    mode: ChatMode;
}
export interface IChatTransfer2 extends IChatTransfer {
    chat: ISerializableChatData;
}
export {};
/**
 * Map of destination workspace URI to chat transfer data
 */
