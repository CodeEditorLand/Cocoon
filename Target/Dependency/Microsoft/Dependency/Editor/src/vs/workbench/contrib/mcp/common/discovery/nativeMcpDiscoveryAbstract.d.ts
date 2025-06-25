import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { IObservable, IReader, ISettableObservable } from '../../../../../base/common/observable.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { INativeMcpDiscoveryData } from '../../../../../platform/mcp/common/nativeMcpDiscoveryHelper.js';
import { Dto } from '../../../../services/extensions/common/proxyIdentifier.js';
import { DiscoverySource } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { McpCollectionDefinition, McpServerDefinition } from '../mcpTypes.js';
import { IMcpDiscovery } from './mcpDiscovery.js';
export type WritableMcpCollectionDefinition = McpCollectionDefinition & {
    serverDefinitions: ISettableObservable<readonly McpServerDefinition[]>;
};
export declare abstract class FilesystemMcpDiscovery extends Disposable {
    private readonly _fileService;
    private readonly _mcpRegistry;
    protected readonly _fsDiscoveryEnabled: IObservable<boolean | {
        [K in DiscoverySource]: boolean;
    }>;
    constructor(configurationService: IConfigurationService, _fileService: IFileService, _mcpRegistry: IMcpRegistry);
    protected _isDiscoveryEnabled(reader: IReader, discoverySource: DiscoverySource | undefined): boolean;
    protected watchFile(file: URI, collection: WritableMcpCollectionDefinition, discoverySource: DiscoverySource | undefined, adaptFile: (contents: VSBuffer) => McpServerDefinition[] | undefined): IDisposable;
}
/**
 * Base class that discovers MCP servers on a filesystem, outside of the ones
 * defined in VS Code settings.
 */
export declare abstract class NativeFilesystemMcpDiscovery extends FilesystemMcpDiscovery implements IMcpDiscovery {
    private readonly adapters;
    private suffix;
    constructor(remoteAuthority: string | null, labelService: ILabelService, fileService: IFileService, instantiationService: IInstantiationService, mcpRegistry: IMcpRegistry, configurationService: IConfigurationService);
    abstract start(): void;
    protected setDetails(detailsDto: Dto<INativeMcpDiscoveryData> | undefined): void;
}
