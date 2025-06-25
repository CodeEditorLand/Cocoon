import { ILogService } from '../../../platform/log/common/log.js';
import { McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { ExtHostMcpService } from '../common/extHostMcp.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
export declare class NodeExtHostMpcService extends ExtHostMcpService {
    constructor(extHostRpc: IExtHostRpcService, initDataService: IExtHostInitDataService, logService: ILogService);
    private nodeServers;
    protected _startMcp(id: number, launch: McpServerLaunch): void;
    $stopMcp(id: number): void;
    $sendMessage(id: number, message: string): void;
    private startNodeMpc;
}
/**
 * Formats arguments to avoid issues on Windows for CVE-2024-27980.
 */
export declare const formatSubprocessArguments: (executable: string, args: ReadonlyArray<string>, cwd: string | undefined, env: Record<string, string | undefined>) => Promise<{
    executable: string;
    args: readonly string[];
    shell: boolean;
}>;
