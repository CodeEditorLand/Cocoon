import { CancellationToken } from '../../../base/common/cancellation.js';
import { IPager } from '../../../base/common/paging.js';
import { URI } from '../../../base/common/uri.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IExtensionGalleryService, IExtensionIdentifier, IExtensionInfo, IGalleryExtension, IGalleryExtensionVersion, InstallOperation, IQueryOptions, IExtensionsControlManifest, ITranslation, StatisticType, IExtensionQueryOptions, IProductVersion, IAllowedExtensionsService } from './extensionManagement.js';
import { IExtensionManifest, TargetPlatform } from '../../extensions/common/extensions.js';
import { IFileService } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { IRequestService } from '../../request/common/request.js';
import { IStorageService } from '../../storage/common/storage.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IAssignmentService } from '../../assignment/common/assignment.js';
import { IExtensionGalleryManifestService } from './extensionGalleryManifest.js';
interface IRawGalleryExtensionFile {
    readonly assetType: string;
    readonly source: string;
}
interface IRawGalleryExtensionProperty {
    readonly key: string;
    readonly value: string;
}
export interface IRawGalleryExtensionVersion {
    readonly version: string;
    readonly lastUpdated: string;
    readonly assetUri: string;
    readonly fallbackAssetUri: string;
    readonly files: IRawGalleryExtensionFile[];
    readonly properties?: IRawGalleryExtensionProperty[];
    readonly targetPlatform?: string;
}
export declare function sortExtensionVersions(versions: IRawGalleryExtensionVersion[], preferredTargetPlatform: TargetPlatform): IRawGalleryExtensionVersion[];
export declare abstract class AbstractExtensionGalleryService implements IExtensionGalleryService {
    private readonly assignmentService;
    private readonly requestService;
    private readonly logService;
    private readonly environmentService;
    private readonly telemetryService;
    private readonly fileService;
    private readonly productService;
    private readonly configurationService;
    private readonly allowedExtensionsService;
    private readonly extensionGalleryManifestService;
    readonly _serviceBrand: undefined;
    private readonly extensionsControlUrl;
    private readonly unpkgResourceApi;
    private readonly commonHeadersPromise;
    private readonly extensionsEnabledWithApiProposalVersion;
    constructor(storageService: IStorageService | undefined, assignmentService: IAssignmentService | undefined, requestService: IRequestService, logService: ILogService, environmentService: IEnvironmentService, telemetryService: ITelemetryService, fileService: IFileService, productService: IProductService, configurationService: IConfigurationService, allowedExtensionsService: IAllowedExtensionsService, extensionGalleryManifestService: IExtensionGalleryManifestService);
    isEnabled(): boolean;
    getExtensions(extensionInfos: ReadonlyArray<IExtensionInfo>, token: CancellationToken): Promise<IGalleryExtension[]>;
    getExtensions(extensionInfos: ReadonlyArray<IExtensionInfo>, options: IExtensionQueryOptions, token: CancellationToken): Promise<IGalleryExtension[]>;
    private getResourceApi;
    private getExtensionsUsingQueryApi;
    private getExtensionsUsingResourceApi;
    private getLatestGalleryExtension;
    getCompatibleExtension(extension: IGalleryExtension, includePreRelease: boolean, targetPlatform: TargetPlatform, productVersion?: IProductVersion): Promise<IGalleryExtension | null>;
    isExtensionCompatible(extension: IGalleryExtension, includePreRelease: boolean, targetPlatform: TargetPlatform, productVersion?: IProductVersion): Promise<boolean>;
    private isValidVersion;
    private areApiProposalsCompatible;
    private isEngineValid;
    query(options: IQueryOptions, token: CancellationToken): Promise<IPager<IGalleryExtension>>;
    private queryGalleryExtensions;
    private queryGalleryExtensionsWithAllVersionsAsFallback;
    private queryGalleryExtensionsUsingIncludeLatestPrereleaseAndStableVersionFlag;
    private getRawGalleryExtensionVersion;
    private queryRawGalleryExtensions;
    private getHeaderValue;
    private getLatestRawGalleryExtension;
    reportStatistic(publisher: string, name: string, version: string, type: StatisticType): Promise<void>;
    download(extension: IGalleryExtension, location: URI, operation: InstallOperation): Promise<void>;
    downloadSignatureArchive(extension: IGalleryExtension, location: URI): Promise<void>;
    getReadme(extension: IGalleryExtension, token: CancellationToken): Promise<string>;
    getManifest(extension: IGalleryExtension, token: CancellationToken): Promise<IExtensionManifest | null>;
    getCoreTranslation(extension: IGalleryExtension, languageId: string): Promise<ITranslation | null>;
    getChangelog(extension: IGalleryExtension, token: CancellationToken): Promise<string>;
    getAllVersions(extensionIdentifier: IExtensionIdentifier): Promise<IGalleryExtensionVersion[]>;
    getAllCompatibleVersions(extensionIdentifier: IExtensionIdentifier, includePreRelease: boolean, targetPlatform: TargetPlatform): Promise<IGalleryExtensionVersion[]>;
    private getVersions;
    private getAsset;
    getExtensionsControlManifest(): Promise<IExtensionsControlManifest>;
}
export declare class ExtensionGalleryService extends AbstractExtensionGalleryService {
    constructor(storageService: IStorageService, requestService: IRequestService, logService: ILogService, environmentService: IEnvironmentService, telemetryService: ITelemetryService, fileService: IFileService, productService: IProductService, configurationService: IConfigurationService, allowedExtensionsService: IAllowedExtensionsService, extensionGalleryManifestService: IExtensionGalleryManifestService);
}
export declare class ExtensionGalleryServiceWithNoStorageService extends AbstractExtensionGalleryService {
    constructor(requestService: IRequestService, logService: ILogService, environmentService: IEnvironmentService, telemetryService: ITelemetryService, fileService: IFileService, productService: IProductService, configurationService: IConfigurationService, allowedExtensionsService: IAllowedExtensionsService, extensionGalleryManifestService: IExtensionGalleryManifestService);
}
export {};
