import { URI } from '../../../../base/common/uri.js';
import { IStorageService } from '../../../storage/common/storage.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
import { IStringDictionary } from '../../../../base/common/collections.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { IUserDataProfile } from '../../../userDataProfile/common/userDataProfile.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { AbstractSynchroniser, IAcceptResult, IFileResourcePreview, IMergeResult } from '../abstractSynchronizer.js';
import { IFileService } from '../../../files/common/files.js';
import { IRemoteUserData, ISyncData, IUserDataSyncLocalStoreService, IUserDataSynchroniser, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncStoreService } from '../userDataSync.js';
interface IPromptsResourcePreview extends IFileResourcePreview {
    previewResult: IMergeResult;
}
export declare function parsePrompts(syncData: ISyncData): IStringDictionary<string>;
/**
 * Synchronizer class for the "user" prompt files.
 * Adopted from {@link SnippetsSynchroniser}.
 */
export declare class PromptsSynchronizer extends AbstractSynchroniser implements IUserDataSynchroniser {
    protected readonly version: number;
    private readonly promptsFolder;
    constructor(profile: IUserDataProfile, collection: string | undefined, environmentService: IEnvironmentService, fileService: IFileService, storageService: IStorageService, userDataSyncStoreService: IUserDataSyncStoreService, userDataSyncLocalStoreService: IUserDataSyncLocalStoreService, logService: IUserDataSyncLogService, configurationService: IConfigurationService, userDataSyncEnablementService: IUserDataSyncEnablementService, telemetryService: ITelemetryService, uriIdentityService: IUriIdentityService);
    protected generateSyncPreview(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, isRemoteDataFromCurrentMachine: boolean): Promise<IPromptsResourcePreview[]>;
    protected hasRemoteChanged(lastSyncUserData: IRemoteUserData): Promise<boolean>;
    protected getMergeResult(resourcePreview: IPromptsResourcePreview, token: CancellationToken): Promise<IMergeResult>;
    protected getAcceptResult(resourcePreview: IPromptsResourcePreview, resource: URI, content: string | null | undefined, token: CancellationToken): Promise<IAcceptResult>;
    protected applyResult(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, resourcePreviews: [IPromptsResourcePreview, IAcceptResult][], force: boolean): Promise<void>;
    private getResourcePreviews;
    resolveContent(uri: URI): Promise<string | null>;
    hasLocalData(): Promise<boolean>;
    private updateLocalBackup;
    private updateLocalPrompts;
    private updateRemotePrompts;
    private parsePrompts;
    private toPromptContents;
    private getPromptsFileContents;
}
export {};
