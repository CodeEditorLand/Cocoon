import { IExtensionManagementServerService, IExtensionManagementServer } from '../../common/extensionManagement.js';
import { ExtensionEnablementService } from '../../browser/extensionEnablementService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
export declare class TestExtensionEnablementService extends ExtensionEnablementService {
    constructor(instantiationService: TestInstantiationService);
    waitUntilInitialized(): Promise<void>;
    reset(): void;
}
export declare function anExtensionManagementServerService(localExtensionManagementServer: IExtensionManagementServer | null, remoteExtensionManagementServer: IExtensionManagementServer | null, webExtensionManagementServer: IExtensionManagementServer | null): IExtensionManagementServerService;
