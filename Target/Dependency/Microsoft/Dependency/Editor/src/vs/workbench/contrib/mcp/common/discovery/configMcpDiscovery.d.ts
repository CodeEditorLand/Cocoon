import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpConfigPathsService } from '../mcpConfigPathsService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { IMcpDiscovery } from './mcpDiscovery.js';
/**
 * Discovers MCP servers based on various config sources.
 */
export declare class ConfigMcpDiscovery extends Disposable implements IMcpDiscovery {
    private readonly _configurationService;
    private readonly _mcpRegistry;
    private readonly _textModelService;
    private readonly _mcpConfigPathsService;
    private readonly _remoteAgentService;
    private configSources;
    constructor(_configurationService: IConfigurationService, _mcpRegistry: IMcpRegistry, _textModelService: ITextModelService, _mcpConfigPathsService: IMcpConfigPathsService, _remoteAgentService: IRemoteAgentService);
    start(): void;
    private _getServerIdMapping;
    private sync;
}
