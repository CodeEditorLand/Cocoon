import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IDebugService } from '../../debug/common/debug.js';
import { McpDevModeDebugging } from '../common/mcpDevMode.js';
export declare class McpDevModeDebuggingNode extends McpDevModeDebugging {
    private readonly _nativeHostService;
    constructor(debugService: IDebugService, commandService: ICommandService, _nativeHostService: INativeHostService);
    protected ensureListeningOnPort(port: number): Promise<void>;
    protected getDebugPort(): Promise<number>;
}
