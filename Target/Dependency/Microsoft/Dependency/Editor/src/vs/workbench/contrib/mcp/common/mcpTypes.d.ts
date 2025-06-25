import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../base/common/observable.js';
import { URI, UriComponents } from '../../../../base/common/uri.js';
import { Location } from '../../../../editor/common/languages.js';
import { ConfigurationTarget } from '../../../../platform/configuration/common/configuration.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IGalleryMcpServer, ILocalMcpServer, IQueryOptions } from '../../../../platform/mcp/common/mcpManagement.js';
import { IMcpDevModeConfig } from '../../../../platform/mcp/common/mcpPlatformTypes.js';
import { StorageScope } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceFolderData } from '../../../../platform/workspace/common/workspace.js';
import { ToolProgress } from '../../chat/common/languageModelToolsService.js';
import { IMcpServerSamplingConfiguration } from './mcpConfiguration.js';
import { McpServerRequestHandler } from './mcpServerRequestHandler.js';
import { MCP } from './modelContextProtocol.js';
import { UriTemplate } from './uriTemplate.js';
export declare const extensionMcpCollectionPrefix = "ext.";
export declare function extensionPrefixedIdentifier(identifier: ExtensionIdentifier, id: string): string;
/**
 * An McpCollection contains McpServers. There may be multiple collections for
 * different locations servers are discovered.
 */
export interface McpCollectionDefinition {
    /** Origin authority from which this collection was discovered. */
    readonly remoteAuthority: string | null;
    /** Globally-unique, stable ID for this definition */
    readonly id: string;
    /** Human-readable label for the definition */
    readonly label: string;
    /** Definitions this collection contains. */
    readonly serverDefinitions: IObservable<readonly McpServerDefinition[]>;
    /** If 'false', consent is required before any MCP servers in this collection are automatically launched. */
    readonly isTrustedByDefault: boolean;
    /** Scope where associated collection info should be stored. */
    readonly scope: StorageScope;
    /** Configuration target where configuration related to this server should be stored. */
    readonly configTarget: ConfigurationTarget;
    /** Resolves a server definition. If present, always called before a server starts. */
    resolveServerLanch?(definition: McpServerDefinition): Promise<McpServerLaunch | undefined>;
    /** For lazy-loaded collections only: */
    readonly lazy?: {
        /** True if `serverDefinitions` were loaded from the cache */
        isCached: boolean;
        /** Triggers a load of the real server definition, which should be pushed to the IMcpRegistry. If not this definition will be removed. */
        load(): Promise<void>;
        /** Called after `load()` if the extension is not found. */
        removed?(): void;
    };
    readonly presentation?: {
        /** Sort order of the collection. */
        readonly order?: number;
        /** Place where this collection is configured, used in workspace trust prompts and "show config" */
        readonly origin?: URI;
    };
}
export declare const enum McpCollectionSortOrder {
    WorkspaceFolder = 0,
    Workspace = 100,
    User = 200,
    Extension = 300,
    Filesystem = 400,
    RemoteBoost = -50
}
export declare namespace McpCollectionDefinition {
    interface FromExtHost {
        readonly id: string;
        readonly label: string;
        readonly isTrustedByDefault: boolean;
        readonly scope: StorageScope;
        readonly canResolveLaunch: boolean;
        readonly extensionId: string;
        readonly configTarget: ConfigurationTarget;
    }
    function equals(a: McpCollectionDefinition, b: McpCollectionDefinition): boolean;
}
export interface McpServerDefinition {
    /** Globally-unique, stable ID for this definition */
    readonly id: string;
    /** Human-readable label for the definition */
    readonly label: string;
    /** Descriptor defining how the configuration should be launched. */
    readonly launch: McpServerLaunch;
    /** Explicit roots. If undefined, all workspace folders. */
    readonly roots?: URI[] | undefined;
    /** If set, allows configuration variables to be resolved in the {@link launch} with the given context */
    readonly variableReplacement?: McpServerDefinitionVariableReplacement;
    /** Nonce used for caching the server. Changing the nonce will indicate that tools need to be refreshed. */
    readonly cacheNonce?: string;
    /** Dev mode configuration for the server */
    readonly devMode?: IMcpDevModeConfig;
    readonly presentation?: {
        /** Sort order of the definition. */
        readonly order?: number;
        /** Place where this server is configured, used in workspace trust prompts and "show config" */
        readonly origin?: Location;
    };
}
export declare namespace McpServerDefinition {
    interface Serialized {
        readonly id: string;
        readonly label: string;
        readonly cacheNonce?: string;
        readonly launch: McpServerLaunch.Serialized;
        readonly variableReplacement?: McpServerDefinitionVariableReplacement.Serialized;
    }
    function toSerialized(def: McpServerDefinition): McpServerDefinition.Serialized;
    function fromSerialized(def: McpServerDefinition.Serialized): McpServerDefinition;
    function equals(a: McpServerDefinition, b: McpServerDefinition): boolean;
}
export interface McpServerDefinitionVariableReplacement {
    section?: string;
    folder?: IWorkspaceFolderData;
    target: ConfigurationTarget;
}
export declare namespace McpServerDefinitionVariableReplacement {
    interface Serialized {
        target: ConfigurationTarget;
        section?: string;
        folder?: {
            name: string;
            index: number;
            uri: UriComponents;
        };
    }
    function toSerialized(def: McpServerDefinitionVariableReplacement): McpServerDefinitionVariableReplacement.Serialized;
    function fromSerialized(def: McpServerDefinitionVariableReplacement.Serialized): McpServerDefinitionVariableReplacement;
}
export interface IMcpService {
    _serviceBrand: undefined;
    readonly servers: IObservable<readonly IMcpServer[]>;
    /** Resets the cached tools. */
    resetCaches(): void;
    /** Set if there are extensions that register MCP servers that have never been activated. */
    readonly lazyCollectionState: IObservable<LazyCollectionState>;
    /** Activatese extensions and runs their MCP servers. */
    activateCollections(): Promise<void>;
}
export declare const enum LazyCollectionState {
    HasUnknown = 0,
    LoadingUnknown = 1,
    AllKnown = 2
}
export declare const IMcpService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IMcpService>;
export interface McpCollectionReference {
    id: string;
    label: string;
    presentation?: McpCollectionDefinition['presentation'];
}
export interface McpDefinitionReference {
    id: string;
    label: string;
}
export interface IMcpServerStartOpts {
    isFromInteraction?: boolean;
    debug?: boolean;
}
export interface IMcpServer extends IDisposable {
    readonly collection: McpCollectionReference;
    readonly definition: McpDefinitionReference;
    readonly connection: IObservable<IMcpServerConnection | undefined>;
    readonly connectionState: IObservable<McpConnectionState>;
    /**
     * Full definition as it exists in the MCP registry. Unlike the references
     * in `collection` and `definition`, this may change over time.
     */
    readDefinitions(): IObservable<{
        server: McpServerDefinition | undefined;
        collection: McpCollectionDefinition | undefined;
    }>;
    /**
     * Reflects the MCP server trust state. True if trusted, false if untrusted,
     * undefined if consent is required but not indicated.
     */
    readonly trusted: IObservable<boolean | undefined>;
    showOutput(): void;
    /**
     * Starts the server and returns its resulting state. One of:
     * - Running, if all good
     * - Error, if the server failed to start
     * - Stopped, if the server was disposed or the user cancelled the launch
     */
    start(opts?: IMcpServerStartOpts): Promise<McpConnectionState>;
    stop(): Promise<void>;
    readonly cacheState: IObservable<McpServerCacheState>;
    readonly tools: IObservable<readonly IMcpTool[]>;
    readonly prompts: IObservable<readonly IMcpPrompt[]>;
    readonly capabilities: IObservable<McpCapability | undefined>;
    /**
     * Lists all resources on the server.
     */
    resources(token?: CancellationToken): AsyncIterable<IMcpResource[]>;
    /**
     * List resource templates on the server.
     */
    resourceTemplates(token?: CancellationToken): Promise<IMcpResourceTemplate[]>;
}
/**
 * A representation of an MCP resource. The `uri` is namespaced to VS Code and
 * can be used in filesystem APIs.
 */
export interface IMcpResource {
    /** Identifier for the file in VS Code and operable with filesystem API */
    readonly uri: URI;
    /** Identifier of the file as given from the MCP server. */
    readonly mcpUri: string;
    readonly name: string;
    readonly title?: string;
    readonly description?: string;
    readonly mimeType?: string;
    readonly sizeInBytes?: number;
}
export interface IMcpResourceTemplate {
    readonly name: string;
    readonly title?: string;
    readonly description?: string;
    readonly mimeType?: string;
    readonly template: UriTemplate;
    /** Gets string completions for the given template part. */
    complete(templatePart: string, prefix: string, alreadyResolved: Record<string, string | string[]>, token: CancellationToken): Promise<string[]>;
    /** Gets the resolved URI from template parts. */
    resolveURI(vars: Record<string, unknown>): URI;
}
export declare const isMcpResourceTemplate: (obj: IMcpResource | IMcpResourceTemplate) => obj is IMcpResourceTemplate;
export declare const isMcpResource: (obj: IMcpResource | IMcpResourceTemplate) => obj is IMcpResource;
export declare const enum McpServerCacheState {
    /** Tools have not been read before */
    Unknown = 0,
    /** Tools were read from the cache */
    Cached = 1,
    /** Tools were read from the cache or live, but they may be outdated. */
    Outdated = 2,
    /** Tools are refreshing for the first time */
    RefreshingFromUnknown = 3,
    /** Tools are refreshing and the current tools are cached */
    RefreshingFromCached = 4,
    /** Tool state is live, server is connected */
    Live = 5
}
export interface IMcpPrompt {
    readonly id: string;
    readonly name: string;
    readonly title?: string;
    readonly description?: string;
    readonly arguments: readonly MCP.PromptArgument[];
    /** Gets string completions for the given prompt part. */
    complete(argument: string, prefix: string, alreadyResolved: Record<string, string>, token: CancellationToken): Promise<string[]>;
    resolve(args: Record<string, string | undefined>, token?: CancellationToken): Promise<IMcpPromptMessage[]>;
}
export declare const mcpPromptReplaceSpecialChars: (s: string) => string;
export declare const mcpPromptPrefix: (definition: McpDefinitionReference) => string;
export interface IMcpPromptMessage extends MCP.PromptMessage {
}
export interface IMcpToolCallContext {
    chatSessionId?: string;
    chatRequestId?: string;
}
export interface IMcpTool {
    readonly id: string;
    /** Name for #referencing in chat */
    readonly referenceName: string;
    readonly definition: MCP.Tool;
    /**
     * Calls a tool
     * @throws {@link MpcResponseError} if the tool fails to execute
     * @throws {@link McpConnectionFailedError} if the connection to the server fails
     */
    call(params: Record<string, unknown>, context?: IMcpToolCallContext, token?: CancellationToken): Promise<MCP.CallToolResult>;
    /**
     * Identical to {@link call}, but reports progress.
     */
    callWithProgress(params: Record<string, unknown>, progress: ToolProgress, context?: IMcpToolCallContext, token?: CancellationToken): Promise<MCP.CallToolResult>;
}
export declare const enum McpServerTransportType {
    /** A command-line MCP server communicating over standard in/out */
    Stdio = 1,
    /** An MCP server that uses Server-Sent Events */
    HTTP = 2
}
/**
 * MCP server launched on the command line which communicated over stdio.
 * https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/transports/#stdio
 */
export interface McpServerTransportStdio {
    readonly type: McpServerTransportType.Stdio;
    readonly cwd: string | undefined;
    readonly command: string;
    readonly args: readonly string[];
    readonly env: Record<string, string | number | null>;
    readonly envFile: string | undefined;
}
/**
 * MCP server launched on the command line which communicated over SSE or Streamable HTTP.
 * https://spec.modelcontextprotocol.io/specification/2024-11-05/basic/transports/#http-with-sse
 * https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http
 */
export interface McpServerTransportHTTP {
    readonly type: McpServerTransportType.HTTP;
    readonly uri: URI;
    readonly headers: [string, string][];
}
export type McpServerLaunch = McpServerTransportStdio | McpServerTransportHTTP;
export declare namespace McpServerLaunch {
    type Serialized = {
        type: McpServerTransportType.HTTP;
        uri: UriComponents;
        headers: [string, string][];
    } | {
        type: McpServerTransportType.Stdio;
        cwd: string | undefined;
        command: string;
        args: readonly string[];
        env: Record<string, string | number | null>;
        envFile: string | undefined;
    };
    function toSerialized(launch: McpServerLaunch): McpServerLaunch.Serialized;
    function fromSerialized(launch: McpServerLaunch.Serialized): McpServerLaunch;
}
/**
 * An instance that manages a connection to an MCP server. It can be started,
 * stopped, and restarted. Once started and in a running state, it will
 * eventually build a {@link IMcpServerConnection.handler}.
 */
export interface IMcpServerConnection extends IDisposable {
    readonly definition: McpServerDefinition;
    readonly state: IObservable<McpConnectionState>;
    readonly handler: IObservable<McpServerRequestHandler | undefined>;
    /**
     * Resolved launch definition. Might not match the `definition.launch` due to
     * resolution logic in extension-provided MCPs.
     */
    readonly launchDefinition: McpServerLaunch;
    /**
     * Starts the server if it's stopped. Returns a promise that resolves once
     * server exits a 'starting' state.
     */
    start(methods: IMcpClientMethods): Promise<McpConnectionState>;
    /**
     * Stops the server.
     */
    stop(): Promise<void>;
}
/** Client methods whose implementations are passed through the server connection. */
export interface IMcpClientMethods {
    /** Handler for `sampling/createMessage` */
    createMessageRequestHandler?(req: MCP.CreateMessageRequest['params']): Promise<MCP.CreateMessageResult>;
    /** Handler for `elicitation/create` */
    elicitationRequestHandler?(req: MCP.ElicitRequest['params']): Promise<MCP.ElicitResult>;
}
/**
 * McpConnectionState is the state of the underlying connection and is
 * communicated e.g. from the extension host to the renderer.
 */
export declare namespace McpConnectionState {
    const enum Kind {
        Stopped = 0,
        Starting = 1,
        Running = 2,
        Error = 3
    }
    const toString: (s: McpConnectionState) => string;
    const toKindString: (s: McpConnectionState.Kind) => string;
    /** Returns if the MCP state is one where starting a new server is valid */
    const canBeStarted: (s: Kind) => s is Kind.Stopped | Kind.Error;
    /** Gets whether the state is a running state. */
    const isRunning: (s: McpConnectionState) => boolean;
    interface Stopped {
        readonly state: Kind.Stopped;
    }
    interface Starting {
        readonly state: Kind.Starting;
    }
    interface Running {
        readonly state: Kind.Running;
    }
    interface Error {
        readonly state: Kind.Error;
        readonly code?: string;
        readonly shouldRetry?: boolean;
        readonly message: string;
    }
}
export type McpConnectionState = McpConnectionState.Stopped | McpConnectionState.Starting | McpConnectionState.Running | McpConnectionState.Error;
export declare class MpcResponseError extends Error {
    readonly code: number;
    readonly data: unknown;
    constructor(message: string, code: number, data: unknown);
}
export declare class McpConnectionFailedError extends Error {
}
export interface IMcpServerContainer extends IDisposable {
    mcpServer: IWorkbenchMcpServer | null;
    update(): void;
}
export interface IWorkbenchMcpServer {
    readonly gallery: IGalleryMcpServer | undefined;
    readonly local: ILocalMcpServer | undefined;
    readonly id: string;
    readonly name: string;
    readonly label: string;
    readonly description: string;
    readonly iconUrl?: string;
    readonly publisherUrl?: string;
    readonly publisherDisplayName?: string;
    readonly installCount?: number;
    readonly ratingCount?: number;
    readonly rating?: number;
    readonly url?: string;
    readonly repository?: string;
    getReadme(token: CancellationToken): Promise<string>;
}
export declare const IMcpWorkbenchService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IMcpWorkbenchService>;
export interface IMcpWorkbenchService {
    readonly _serviceBrand: undefined;
    readonly onChange: Event<IWorkbenchMcpServer | undefined>;
    readonly local: readonly IWorkbenchMcpServer[];
    queryLocal(): Promise<IWorkbenchMcpServer[]>;
    queryGallery(options?: IQueryOptions, token?: CancellationToken): Promise<IWorkbenchMcpServer[]>;
    install(mcpServer: IWorkbenchMcpServer): Promise<void>;
    uninstall(mcpServer: IWorkbenchMcpServer): Promise<void>;
    open(extension: IWorkbenchMcpServer | string, options?: IEditorOptions): Promise<void>;
}
export declare class McpServerContainers extends Disposable {
    private readonly containers;
    constructor(containers: IMcpServerContainer[], mcpWorkbenchService: IMcpWorkbenchService);
    set mcpServer(extension: IWorkbenchMcpServer | null);
    update(server: IWorkbenchMcpServer | undefined): void;
}
export declare const McpServersGalleryEnabledContext: RawContextKey<boolean>;
export declare const HasInstalledMcpServersContext: RawContextKey<boolean>;
export declare const InstalledMcpServersViewId = "workbench.views.mcp.installed";
export declare const mcpServerIcon: import("../../../../base/common/themables.js").ThemeIcon;
export declare namespace McpResourceURI {
    const scheme = "mcp-resource";
    function fromServer(def: McpDefinitionReference, resourceURI: URI | string): URI;
    function toServer(uri: URI | string): {
        definitionId: string;
        resourceURI: URI;
    };
}
/** Warning: this enum is cached in `mcpServer.ts` and all changes MUST only be additive. */
export declare const enum McpCapability {
    Logging = 1,
    Completions = 2,
    Prompts = 4,
    PromptsListChanged = 8,
    Resources = 16,
    ResourcesSubscribe = 32,
    ResourcesListChanged = 64,
    Tools = 128,
    ToolsListChanged = 256
}
export interface ISamplingOptions {
    server: IMcpServer;
    isDuringToolCall: boolean;
    params: MCP.CreateMessageRequest['params'];
}
export interface ISamplingResult {
    sample: MCP.CreateMessageResult;
}
export interface IMcpSamplingService {
    _serviceBrand: undefined;
    sample(opts: ISamplingOptions): Promise<ISamplingResult>;
    /** Whether MCP sampling logs are available for this server */
    hasLogs(server: IMcpServer): boolean;
    /** Gets a text report of the MCP server's sampling usage */
    getLogText(server: IMcpServer): string;
    getConfig(server: IMcpServer): IMcpServerSamplingConfiguration;
    updateConfig(server: IMcpServer, mutate: (r: IMcpServerSamplingConfiguration) => unknown): Promise<IMcpServerSamplingConfiguration>;
}
export declare const IMcpSamplingService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IMcpSamplingService>;
export declare class McpError extends Error {
    readonly code: number;
    readonly data?: unknown | undefined;
    static methodNotFound(method: string): McpError;
    static notAllowed(): McpError;
    static unknown(e: Error): McpError;
    constructor(code: number, message: string, data?: unknown | undefined);
}
export declare const enum McpToolName {
    Prefix = "mcp_",
    MaxPrefixLen = 18,
    MaxLength = 64
}
export interface IMcpElicitationService {
    _serviceBrand: undefined;
    /**
     * Elicits a response from the user. The `context` is optional and can be used
     * to provide additional information about the request.
     *
     * @param context Context for the elicitation, e.g. chat session ID.
     * @param elicitation Request to elicit a response.
     * @returns A promise that resolves to an {@link ElicitationResult}.
     */
    elicit(server: IMcpServer, context: IMcpToolCallContext | undefined, elicitation: MCP.ElicitRequest['params'], token: CancellationToken): Promise<MCP.ElicitResult>;
}
export declare const IMcpElicitationService: import("../../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IMcpElicitationService>;
