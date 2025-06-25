import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { IMcpDiscovery } from './mcpDiscovery.js';
import { FilesystemMcpDiscovery } from './nativeMcpDiscoveryAbstract.js';
export declare class CursorWorkspaceMcpDiscoveryAdapter extends FilesystemMcpDiscovery implements IMcpDiscovery {
    private readonly _workspaceContextService;
    private readonly _remoteAgentService;
    private readonly _collections;
    constructor(fileService: IFileService, _workspaceContextService: IWorkspaceContextService, mcpRegistry: IMcpRegistry, configurationService: IConfigurationService, _remoteAgentService: IRemoteAgentService);
    start(): void;
    private watchFolder;
}
