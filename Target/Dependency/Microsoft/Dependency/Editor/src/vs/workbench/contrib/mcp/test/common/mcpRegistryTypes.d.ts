import { Event } from '../../../../../base/common/event.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../../base/common/observable.js';
import { ConfigurationTarget } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LogLevel } from '../../../../../platform/log/common/log.js';
import { StorageScope } from '../../../../../platform/storage/common/storage.js';
import { IWorkspaceFolderData } from '../../../../../platform/workspace/common/workspace.js';
import { IResolvedValue } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IMcpHostDelegate, IMcpMessageTransport, IMcpRegistry, IMcpResolveConnectionOptions } from '../../common/mcpRegistryTypes.js';
import { IMcpServerConnection, LazyCollectionState, McpCollectionDefinition, McpCollectionReference, McpConnectionState, McpDefinitionReference, McpServerDefinition } from '../../common/mcpTypes.js';
import { MCP } from '../../common/modelContextProtocol.js';
/**
 * Implementation of IMcpMessageTransport for testing purposes.
 * Allows tests to easily send/receive messages and control the connection state.
 */
export declare class TestMcpMessageTransport extends Disposable implements IMcpMessageTransport {
    private readonly _onDidLog;
    readonly onDidLog: Event<{
        level: LogLevel;
        message: string;
    }>;
    private readonly _onDidReceiveMessage;
    readonly onDidReceiveMessage: Event<MCP.JSONRPCMessage>;
    private readonly _stateValue;
    readonly state: import("../../../../../base/common/observable.js").ISettableObservable<McpConnectionState, void>;
    private readonly _sentMessages;
    constructor();
    /**
     * Set a responder function for a specific method.
     * The responder receives the sent message and should return a response object,
     * which will be simulated as a server response.
     */
    setResponder(method: string, responder: (message: any) => MCP.JSONRPCMessage | undefined): void;
    private _responders?;
    /**
     * Send a message through the transport.
     */
    send(message: MCP.JSONRPCMessage): void;
    /**
     * Stop the transport.
     */
    stop(): void;
    /**
     * Simulate receiving a message from the server.
     */
    simulateReceiveMessage(message: MCP.JSONRPCMessage): void;
    /**
     * Simulates a reply to an 'initialized' request.
     */
    simulateInitialized(): void;
    /**
     * Simulate a log event.
     */
    simulateLog(message: string): void;
    /**
     * Set the connection state.
     */
    setConnectionState(state: McpConnectionState): void;
    /**
     * Get all messages that have been sent.
     */
    getSentMessages(): readonly MCP.JSONRPCMessage[];
    /**
     * Clear the sent messages history.
     */
    clearSentMessages(): void;
}
export declare class TestMcpRegistry implements IMcpRegistry {
    private readonly _instantiationService;
    makeTestTransport: () => TestMcpMessageTransport;
    constructor(_instantiationService: IInstantiationService);
    _serviceBrand: undefined;
    onDidChangeInputs: Event<any>;
    collections: import("../../../../../base/common/observable.js").ISettableObservable<readonly McpCollectionDefinition[], void>;
    delegates: import("../../../../../base/common/observable.js").ISettableObservable<readonly IMcpHostDelegate[], void>;
    lazyCollectionState: import("../../../../../base/common/observable.js").ISettableObservable<LazyCollectionState, void>;
    collectionToolPrefix(collection: McpCollectionReference): IObservable<string>;
    getServerDefinition(collectionRef: McpDefinitionReference, definitionRef: McpDefinitionReference): IObservable<{
        server: McpServerDefinition | undefined;
        collection: McpCollectionDefinition | undefined;
    }>;
    discoverCollections(): Promise<McpCollectionDefinition[]>;
    registerDelegate(delegate: IMcpHostDelegate): IDisposable;
    registerCollection(collection: McpCollectionDefinition): IDisposable;
    resetTrust(): void;
    getTrust(collection: McpCollectionReference): IObservable<boolean | undefined>;
    getAuthenticationUsage(mcpServerId: string): string | undefined;
    setAuthenticationUsage(mcpServerId: string, providerId: string): void;
    clearSavedInputs(scope: StorageScope, inputId?: string): Promise<void>;
    editSavedInput(inputId: string, folderData: IWorkspaceFolderData | undefined, configSection: string, target: ConfigurationTarget): Promise<void>;
    setSavedInput(inputId: string, target: ConfigurationTarget, value: string): Promise<void>;
    getSavedInputs(scope: StorageScope): Promise<{
        [id: string]: IResolvedValue;
    }>;
    resolveConnection(options: IMcpResolveConnectionOptions): Promise<IMcpServerConnection | undefined>;
}
