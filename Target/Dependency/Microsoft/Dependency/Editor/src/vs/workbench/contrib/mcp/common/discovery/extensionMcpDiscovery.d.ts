import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { IMcpDiscovery } from './mcpDiscovery.js';
export declare class ExtensionMcpDiscovery extends Disposable implements IMcpDiscovery {
    private readonly _mcpRegistry;
    private readonly _extensionService;
    private readonly _extensionCollectionIdsToPersist;
    private readonly cachedServers;
    constructor(_mcpRegistry: IMcpRegistry, storageService: IStorageService, _extensionService: IExtensionService);
    start(): void;
    private _activateExtensionServers;
    private static _validate;
}
