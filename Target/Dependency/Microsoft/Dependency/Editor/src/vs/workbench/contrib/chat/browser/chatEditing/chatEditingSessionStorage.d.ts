import { ResourceMap } from '../../../../../base/common/map.js';
import { URI } from '../../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ISnapshotEntry } from '../../common/chatEditingService.js';
export interface StoredSessionState {
    readonly initialFileContents: ResourceMap<string>;
    readonly pendingSnapshot?: IChatEditingSessionStop;
    readonly recentSnapshot: IChatEditingSessionStop;
    readonly linearHistoryIndex: number;
    readonly linearHistory: readonly IChatEditingSessionSnapshot[];
}
export declare class ChatEditingSessionStorage {
    private readonly chatSessionId;
    private readonly _fileService;
    private readonly _environmentService;
    private readonly _logService;
    private readonly _workspaceContextService;
    constructor(chatSessionId: string, _fileService: IFileService, _environmentService: IEnvironmentService, _logService: ILogService, _workspaceContextService: IWorkspaceContextService);
    protected _getStorageLocation(): URI;
    restoreState(): Promise<StoredSessionState | undefined>;
    storeState(state: StoredSessionState): Promise<void>;
    clearState(): Promise<void>;
}
export interface IChatEditingSessionSnapshot {
    /**
     * Index of this session in the linear history. It's the sum of the lengths
     * of all {@link stops} prior this one.
     */
    readonly startIndex: number;
    readonly requestId: string | undefined;
    /**
     * Edit stops in the request. Always initially populatd with stopId: undefind
     * for th request's initial state.
     *
     * Invariant: never empty.
     */
    readonly stops: IChatEditingSessionStop[];
    /** Stop that represents changes after the last undo stop, kept for diffing purposes. */
    readonly postEdit: ResourceMap<ISnapshotEntry> | undefined;
}
export interface IChatEditingSessionStop {
    /** Edit stop ID, first for a request is always undefined. */
    stopId: string | undefined;
    readonly entries: ResourceMap<ISnapshotEntry>;
}
