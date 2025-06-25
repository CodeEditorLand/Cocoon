import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { URI } from '../../../../base/common/uri.js';
export declare const IChatTransferService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IChatTransferService>;
export interface IChatTransferService {
    readonly _serviceBrand: undefined;
    checkAndSetTransferredWorkspaceTrust(): Promise<void>;
    addWorkspaceToTransferred(workspace: URI): void;
}
export declare class ChatTransferService implements IChatTransferService {
    private readonly workspaceService;
    private readonly storageService;
    private readonly fileService;
    private readonly workspaceTrustManagementService;
    _serviceBrand: undefined;
    constructor(workspaceService: IWorkspaceContextService, storageService: IStorageService, fileService: IFileService, workspaceTrustManagementService: IWorkspaceTrustManagementService);
    deleteWorkspaceFromTransferredList(workspace: URI): void;
    addWorkspaceToTransferred(workspace: URI): void;
    checkAndSetTransferredWorkspaceTrust(): Promise<void>;
    isChatTransferredWorkspace(workspace: URI, storageService: IStorageService): boolean;
}
