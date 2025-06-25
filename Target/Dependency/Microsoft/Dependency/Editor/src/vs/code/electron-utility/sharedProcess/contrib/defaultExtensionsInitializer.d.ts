import { Disposable } from '../../../../base/common/lifecycle.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { INativeServerExtensionManagementService } from '../../../../platform/extensionManagement/node/extensionManagementService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IFileService } from '../../../../platform/files/common/files.js';
export declare class DefaultExtensionsInitializer extends Disposable {
    private readonly environmentService;
    private readonly extensionManagementService;
    private readonly fileService;
    private readonly logService;
    constructor(environmentService: INativeEnvironmentService, extensionManagementService: INativeServerExtensionManagementService, storageService: IStorageService, fileService: IFileService, logService: ILogService);
    private initializeDefaultExtensions;
    private getDefaultExtensionVSIXsLocation;
}
