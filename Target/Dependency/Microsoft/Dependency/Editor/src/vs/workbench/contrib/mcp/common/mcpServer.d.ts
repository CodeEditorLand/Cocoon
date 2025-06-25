import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IStorageService, StorageScope } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { ToolProgress } from '../../chat/common/languageModelToolsService.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpServerRequestHandler } from './mcpServerRequestHandler.js';
import { IMcpElicitationService, IMcpPrompt, IMcpResource, IMcpResourceTemplate, IMcpSamplingService, IMcpServer, IMcpServerConnection, IMcpServerStartOpts, IMcpTool, IMcpToolCallContext, McpCapability, McpCollectionDefinition, McpCollectionReference, McpConnectionState, McpDefinitionReference, McpServerCacheState, McpServerDefinition } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
interface IToolCacheEntry {
    readonly nonce: string | undefined;
    /** Cached tools so we can show what's available before it's started */
    readonly tools: readonly IValidatedMcpTool[];
    /** Cached prompts */
    readonly prompts: readonly MCP.Prompt[] | undefined;
    /** Cached capabilities */
    readonly capabilities: McpCapability | undefined;
}
interface IServerCacheEntry {
    readonly servers: readonly McpServerDefinition.Serialized[];
}
export declare class McpServerMetadataCache extends Disposable {
    private didChange;
    private readonly cache;
    private readonly extensionServers;
    constructor(scope: StorageScope, storageService: IStorageService);
    /** Resets the cache for primitives and extension servers */
    reset(): void;
    /** Gets cached primitives for a server (used before a server is running) */
    get(definitionId: string): IToolCacheEntry | undefined;
    /** Sets cached primitives for a server */
    store(definitionId: string, entry: IToolCacheEntry): void;
    /** Gets cached servers for a collection (used for extensions, before the extension activates) */
    getServers(collectionId: string): IServerCacheEntry | undefined;
    /** Sets cached servers for a collection */
    storeServers(collectionId: string, entry: IServerCacheEntry | undefined): void;
}
interface IValidatedMcpTool extends MCP.Tool {
    /**
     * Tool name as published by the MCP server. This may
     * be different than the one in {@link definition} due to name normalization
     * in {@link McpServer._getValidatedTools}.
     */
    serverToolName: string;
}
export declare class McpServer extends Disposable implements IMcpServer {
    readonly collection: McpCollectionReference;
    readonly definition: McpDefinitionReference;
    private readonly _requiresExtensionActivation;
    private readonly _primitiveCache;
    private readonly _mcpRegistry;
    private readonly _extensionService;
    private readonly _loggerService;
    private readonly _outputService;
    private readonly _telemetryService;
    private readonly _commandService;
    private readonly _instantiationService;
    private readonly _notificationService;
    private readonly _openerService;
    private readonly _samplingService;
    private readonly _elicitationService;
    private readonly _remoteAuthorityResolverService;
    /**
     * Helper function to call the function on the handler once it's online. The
     * connection started if it is not already.
     */
    static callOn<R>(server: IMcpServer, fn: (handler: McpServerRequestHandler) => Promise<R>, token?: CancellationToken): Promise<R>;
    private readonly _connectionSequencer;
    private readonly _connection;
    readonly connection: import("../../../../base/common/observable.js").ISettableObservable<IMcpServerConnection | undefined, void> & IDisposable;
    readonly connectionState: IObservable<McpConnectionState>;
    private readonly _capabilities;
    get capabilities(): import("../../../../base/common/observable.js").ISettableObservable<number | undefined, void>;
    private readonly _tools;
    get tools(): IObservable<readonly IMcpTool[]>;
    private readonly _prompts;
    get prompts(): IObservable<readonly IMcpPrompt[]>;
    private readonly _fullDefinitions;
    readonly cacheState: import("../../../../base/common/observable.js").IObservableWithChange<McpServerCacheState, void>;
    private readonly _loggerId;
    private readonly _logger;
    private _lastModeDebugged;
    /** Count of running tool calls, used to detect if sampling is during an LM call */
    runningToolCalls: Set<IMcpToolCallContext>;
    get trusted(): IObservable<boolean | undefined>;
    constructor(collection: McpCollectionReference, definition: McpDefinitionReference, explicitRoots: URI[] | undefined, _requiresExtensionActivation: boolean | undefined, _primitiveCache: McpServerMetadataCache, toolPrefix: string, _mcpRegistry: IMcpRegistry, workspacesService: IWorkspaceContextService, _extensionService: IExtensionService, _loggerService: ILoggerService, _outputService: IOutputService, _telemetryService: ITelemetryService, _commandService: ICommandService, _instantiationService: IInstantiationService, _notificationService: INotificationService, _openerService: IOpenerService, _samplingService: IMcpSamplingService, _elicitationService: IMcpElicitationService, _remoteAuthorityResolverService: IRemoteAuthorityResolverService);
    readDefinitions(): IObservable<{
        server: McpServerDefinition | undefined;
        collection: McpCollectionDefinition | undefined;
    }>;
    showOutput(): void;
    resources(token?: CancellationToken): AsyncIterable<IMcpResource[]>;
    resourceTemplates(token?: CancellationToken): Promise<IMcpResourceTemplate[]>;
    start({ isFromInteraction, debug }?: IMcpServerStartOpts): Promise<McpConnectionState>;
    private showInteractiveError;
    stop(): Promise<void>;
    private resetLiveData;
    private _normalizeTool;
    private _getValidatedTools;
    private populateLiveData;
}
export declare class McpTool implements IMcpTool {
    private readonly _server;
    private readonly _definition;
    readonly id: string;
    readonly referenceName: string;
    get definition(): MCP.Tool;
    constructor(_server: McpServer, idPrefix: string, _definition: IValidatedMcpTool);
    call(params: Record<string, unknown>, context?: IMcpToolCallContext, token?: CancellationToken): Promise<MCP.CallToolResult>;
    callWithProgress(params: Record<string, unknown>, progress: ToolProgress, context?: IMcpToolCallContext, token?: CancellationToken): Promise<MCP.CallToolResult>;
    _callWithProgress(params: Record<string, unknown>, progress: ToolProgress, token?: CancellationToken, allowRetry?: boolean): Promise<MCP.CallToolResult>;
    compare(other: IMcpTool): number;
}
export {};
