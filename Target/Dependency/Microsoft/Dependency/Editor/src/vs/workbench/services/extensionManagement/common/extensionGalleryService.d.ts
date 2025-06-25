import { IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IRequestService } from '../../../../platform/request/common/request.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { AbstractExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IWorkbenchAssignmentService } from '../../assignment/common/assignmentService.js';
import { IExtensionGalleryManifestService } from '../../../../platform/extensionManagement/common/extensionGalleryManifest.js';
export declare class WorkbenchExtensionGalleryService extends AbstractExtensionGalleryService {
    constructor(storageService: IStorageService, assignmentService: IWorkbenchAssignmentService, requestService: IRequestService, logService: ILogService, environmentService: IEnvironmentService, telemetryService: ITelemetryService, fileService: IFileService, productService: IProductService, configurationService: IConfigurationService, allowedExtensionsService: IAllowedExtensionsService, extensionGalleryManifestService: IExtensionGalleryManifestService);
}
