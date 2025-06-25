import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IMcpServer } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
interface ISamplingStoredData {
    head: number;
    bins: number[];
    lastReqs: {
        request: MCP.SamplingMessage[];
        response: string;
        at: number;
        model: string;
    }[];
}
export declare class McpSamplingLog extends Disposable {
    private readonly _storageService;
    private readonly _logs;
    constructor(_storageService: IStorageService);
    has(server: IMcpServer): boolean;
    get(server: IMcpServer): Readonly<ISamplingStoredData | undefined>;
    getAsText(server: IMcpServer): string;
    private _formatRecentRequests;
    add(server: IMcpServer, request: MCP.SamplingMessage[], response: string, model: string): Promise<void>;
    private _getLogStorageForServer;
}
export {};
