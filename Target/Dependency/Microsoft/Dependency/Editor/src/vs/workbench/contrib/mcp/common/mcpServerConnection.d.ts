import { Disposable } from '../../../../base/common/lifecycle.js';
import { IObservable } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogger } from '../../../../platform/log/common/log.js';
import { IMcpHostDelegate } from './mcpRegistryTypes.js';
import { McpServerRequestHandler } from './mcpServerRequestHandler.js';
import { IMcpClientMethods, IMcpServerConnection, McpCollectionDefinition, McpConnectionState, McpServerDefinition, McpServerLaunch } from './mcpTypes.js';
export declare class McpServerConnection extends Disposable implements IMcpServerConnection {
    private readonly _collection;
    readonly definition: McpServerDefinition;
    private readonly _delegate;
    readonly launchDefinition: McpServerLaunch;
    private readonly _logger;
    private readonly _instantiationService;
    private readonly _launch;
    private readonly _state;
    private readonly _requestHandler;
    readonly state: IObservable<McpConnectionState>;
    readonly handler: IObservable<McpServerRequestHandler | undefined>;
    constructor(_collection: McpCollectionDefinition, definition: McpServerDefinition, _delegate: IMcpHostDelegate, launchDefinition: McpServerLaunch, _logger: ILogger, _instantiationService: IInstantiationService);
    /** @inheritdoc */
    start(methods: IMcpClientMethods): Promise<McpConnectionState>;
    private adoptLaunch;
    stop(): Promise<void>;
    dispose(): void;
    private _waitForState;
}
