import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IUserDataSyncEnablementService, IUserDataSyncStoreManagementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
export declare class InstallRemoteExtensionsContribution implements IWorkbenchContribution {
    private readonly remoteAgentService;
    private readonly remoteExtensionsScannerService;
    private readonly extensionGalleryService;
    private readonly extensionManagementServerService;
    private readonly extensionsWorkbenchService;
    private readonly logService;
    private readonly configurationService;
    constructor(remoteAgentService: IRemoteAgentService, remoteExtensionsScannerService: IRemoteExtensionsScannerService, extensionGalleryService: IExtensionGalleryService, extensionManagementServerService: IExtensionManagementServerService, extensionsWorkbenchService: IExtensionsWorkbenchService, logService: ILogService, configurationService: IConfigurationService);
    private installExtensionsIfInstalledLocallyInRemote;
    private installFailedRemoteExtensions;
}
export declare class RemoteExtensionsInitializerContribution implements IWorkbenchContribution {
    private readonly extensionManagementServerService;
    private readonly storageService;
    private readonly remoteAgentService;
    private readonly userDataSyncStoreManagementService;
    private readonly instantiationService;
    private readonly logService;
    private readonly authenticationService;
    private readonly remoteAuthorityResolverService;
    private readonly userDataSyncEnablementService;
    constructor(extensionManagementServerService: IExtensionManagementServerService, storageService: IStorageService, remoteAgentService: IRemoteAgentService, userDataSyncStoreManagementService: IUserDataSyncStoreManagementService, instantiationService: IInstantiationService, logService: ILogService, authenticationService: IAuthenticationService, remoteAuthorityResolverService: IRemoteAuthorityResolverService, userDataSyncEnablementService: IUserDataSyncEnablementService);
    private initializeRemoteExtensions;
}
