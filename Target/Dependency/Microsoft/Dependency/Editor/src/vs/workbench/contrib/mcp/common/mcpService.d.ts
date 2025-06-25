import { Disposable } from '../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpServerMetadataCache } from './mcpServer.js';
import { IMcpServer, IMcpService } from './mcpTypes.js';
export declare class McpService extends Disposable implements IMcpService {
    private readonly _instantiationService;
    private readonly _mcpRegistry;
    private readonly _toolsService;
    private readonly _logService;
    _serviceBrand: undefined;
    private readonly _servers;
    readonly servers: IObservable<readonly IMcpServer[]>;
    get lazyCollectionState(): IObservable<import("./mcpTypes.js").LazyCollectionState>;
    protected readonly userCache: McpServerMetadataCache;
    protected readonly workspaceCache: McpServerMetadataCache;
    constructor(_instantiationService: IInstantiationService, _mcpRegistry: IMcpRegistry, _toolsService: ILanguageModelToolsService, _logService: ILogService);
    resetCaches(): void;
    activateCollections(): Promise<void>;
    private _syncTools;
    updateCollectedServers(): void;
    dispose(): void;
}
