import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { NativeFilesystemMcpDiscovery } from './nativeMcpDiscoveryAbstract.js';
/**
 * Discovers MCP servers on the remote filesystem, if any.
 */
export declare class RemoteNativeMpcDiscovery extends NativeFilesystemMcpDiscovery {
    private readonly remoteAgent;
    private readonly logService;
    constructor(remoteAgent: IRemoteAgentService, logService: ILogService, labelService: ILabelService, fileService: IFileService, instantiationService: IInstantiationService, mcpRegistry: IMcpRegistry, configurationService: IConfigurationService);
    start(): Promise<void>;
}
