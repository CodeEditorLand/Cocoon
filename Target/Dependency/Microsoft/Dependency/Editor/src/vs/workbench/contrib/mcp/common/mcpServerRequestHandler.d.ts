import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogger, LogLevel } from '../../../../platform/log/common/log.js';
import { IMcpMessageTransport } from './mcpRegistryTypes.js';
import { IMcpClientMethods } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
export interface McpRoot {
    uri: string;
    name?: string;
}
export interface IMcpServerRequestHandlerOptions extends IMcpClientMethods {
    /** MCP message transport */
    launch: IMcpMessageTransport;
    /** Logger instance. */
    logger: ILogger;
    /** Log level MCP messages is logged at */
    requestLogLevel?: LogLevel;
}
/**
 * Request handler for communicating with an MCP server.
 *
 * Handles sending requests and receiving responses, with automatic
 * handling of ping requests and typed client request methods.
 */
export declare class McpServerRequestHandler extends Disposable {
    private _nextRequestId;
    private readonly _pendingRequests;
    private _hasAnnouncedRoots;
    private _roots;
    set roots(roots: MCP.Root[]);
    private _serverInit;
    get capabilities(): MCP.ServerCapabilities;
    get serverInfo(): MCP.Implementation;
    private readonly _onDidReceiveCancelledNotification;
    readonly onDidReceiveCancelledNotification: import("../../../workbench.web.main.internal.js").Event<MCP.CancelledNotification>;
    private readonly _onDidReceiveProgressNotification;
    readonly onDidReceiveProgressNotification: import("../../../workbench.web.main.internal.js").Event<MCP.ProgressNotification>;
    private readonly _onDidChangeResourceList;
    readonly onDidChangeResourceList: import("../../../workbench.web.main.internal.js").Event<void>;
    private readonly _onDidUpdateResource;
    readonly onDidUpdateResource: import("../../../workbench.web.main.internal.js").Event<MCP.ResourceUpdatedNotification>;
    private readonly _onDidChangeToolList;
    readonly onDidChangeToolList: import("../../../workbench.web.main.internal.js").Event<void>;
    private readonly _onDidChangePromptList;
    readonly onDidChangePromptList: import("../../../workbench.web.main.internal.js").Event<void>;
    /**
     * Connects to the MCP server and does the initialization handshake.
     * @throws MpcResponseError if the server fails to initialize.
     */
    static create(instaService: IInstantiationService, opts: IMcpServerRequestHandlerOptions, token?: CancellationToken): Promise<McpServerRequestHandler>;
    readonly logger: ILogger;
    private readonly _launch;
    private readonly _requestLogLevel;
    private readonly _createMessageRequestHandler;
    private readonly _elicitationRequestHandler;
    protected constructor({ launch, logger, createMessageRequestHandler, elicitationRequestHandler, requestLogLevel, }: IMcpServerRequestHandlerOptions);
    /**
     * Send a client request to the server and return the response.
     *
     * @param request The request to send
     * @param token Cancellation token
     * @param timeoutMs Optional timeout in milliseconds
     * @returns A promise that resolves with the response
     */
    private sendRequest;
    private send;
    /**
     * Handles paginated requests by making multiple requests until all items are retrieved.
     *
     * @param method The method name to call
     * @param getItems Function to extract the array of items from a result
     * @param initialParams Initial parameters
     * @param token Cancellation token
     * @returns Promise with all items combined
     */
    private sendRequestPaginated;
    private sendNotification;
    /**
     * Handle incoming messages from the server
     */
    private handleMessage;
    /**
     * Handle successful responses
     */
    private handleResult;
    /**
     * Handle error responses
     */
    private handleError;
    /**
     * Handle incoming server requests
     */
    private handleServerRequest;
    /**
     * Handle incoming server notifications
     */
    private handleServerNotification;
    private handleCancelledNotification;
    private handleLoggingNotification;
    /**
     * Send a generic response to a request
     */
    private respondToRequest;
    /**
     * Send a response to a ping request
     */
    private handlePing;
    /**
     * Send a response to a roots/list request
     */
    private handleRootsList;
    private cancelAllRequests;
    dispose(): void;
    /**
     * Send an initialize request
     */
    initialize(params: MCP.InitializeRequest['params'], token?: CancellationToken): Promise<MCP.InitializeResult>;
    /**
     * List available resources
     */
    listResources(params?: MCP.ListResourcesRequest['params'], token?: CancellationToken): Promise<MCP.Resource[]>;
    /**
     * List available resources (iterable)
     */
    listResourcesIterable(params?: MCP.ListResourcesRequest['params'], token?: CancellationToken): AsyncIterable<MCP.Resource[]>;
    /**
     * Read a specific resource
     */
    readResource(params: MCP.ReadResourceRequest['params'], token?: CancellationToken): Promise<MCP.ReadResourceResult>;
    /**
     * List available resource templates
     */
    listResourceTemplates(params?: MCP.ListResourceTemplatesRequest['params'], token?: CancellationToken): Promise<MCP.ResourceTemplate[]>;
    /**
     * Subscribe to resource updates
     */
    subscribe(params: MCP.SubscribeRequest['params'], token?: CancellationToken): Promise<MCP.EmptyResult>;
    /**
     * Unsubscribe from resource updates
     */
    unsubscribe(params: MCP.UnsubscribeRequest['params'], token?: CancellationToken): Promise<MCP.EmptyResult>;
    /**
     * List available prompts
     */
    listPrompts(params?: MCP.ListPromptsRequest['params'], token?: CancellationToken): Promise<MCP.Prompt[]>;
    /**
     * Get a specific prompt
     */
    getPrompt(params: MCP.GetPromptRequest['params'], token?: CancellationToken): Promise<MCP.GetPromptResult>;
    /**
     * List available tools
     */
    listTools(params?: MCP.ListToolsRequest['params'], token?: CancellationToken): Promise<MCP.Tool[]>;
    /**
     * Call a specific tool
     */
    callTool(params: MCP.CallToolRequest['params'] & MCP.Request['params'], token?: CancellationToken): Promise<MCP.CallToolResult>;
    /**
     * Set the logging level
     */
    setLevel(params: MCP.SetLevelRequest['params'], token?: CancellationToken): Promise<MCP.EmptyResult>;
    /**
     * Find completions for an argument
     */
    complete(params: MCP.CompleteRequest['params'], token?: CancellationToken): Promise<MCP.CompleteResult>;
}
