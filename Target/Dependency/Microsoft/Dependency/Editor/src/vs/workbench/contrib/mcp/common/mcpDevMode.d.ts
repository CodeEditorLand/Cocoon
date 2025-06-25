import { Disposable } from '../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IDebugService } from '../../debug/common/debug.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { IMcpServer, McpServerDefinition, McpServerLaunch } from './mcpTypes.js';
export declare class McpDevModeServerAttache extends Disposable {
    active: boolean;
    constructor(server: IMcpServer, fwdRef: {
        lastModeDebugged: boolean;
    }, registry: IMcpRegistry, fileService: IFileService, workspaceContextService: IWorkspaceContextService);
}
export interface IMcpDevModeDebugging {
    readonly _serviceBrand: undefined;
    transform(definition: McpServerDefinition, launch: McpServerLaunch): Promise<McpServerLaunch>;
}
export declare const IMcpDevModeDebugging: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IMcpDevModeDebugging>;
export declare class McpDevModeDebugging implements IMcpDevModeDebugging {
    private readonly _debugService;
    private readonly _commandService;
    readonly _serviceBrand: undefined;
    constructor(_debugService: IDebugService, _commandService: ICommandService);
    transform(definition: McpServerDefinition, launch: McpServerLaunch): Promise<McpServerLaunch>;
    protected ensureListeningOnPort(port: number): Promise<void>;
    protected getDebugPort(): Promise<number>;
}
