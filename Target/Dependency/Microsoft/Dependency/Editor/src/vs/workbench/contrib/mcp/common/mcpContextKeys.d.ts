import { Disposable } from '../../../../base/common/lifecycle.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { IMcpService } from './mcpTypes.js';
export declare namespace McpContextKeys {
    const serverCount: RawContextKey<number>;
    const hasUnknownTools: RawContextKey<boolean>;
    /**
     * A context key that indicates whether there are any servers with errors.
     *
     * @type {boolean}
     * @default undefined
     * @description This key is used to track the presence of servers with errors in the MCP context.
     */
    const hasServersWithErrors: RawContextKey<boolean>;
    const toolsCount: RawContextKey<number>;
}
export declare class McpContextKeysController extends Disposable implements IWorkbenchContribution {
    static readonly ID = "workbench.contrib.mcp.contextKey";
    constructor(mcpService: IMcpService, contextKeyService: IContextKeyService);
}
