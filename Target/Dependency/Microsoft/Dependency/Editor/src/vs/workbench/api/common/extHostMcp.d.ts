import * as vscode from 'vscode';
import { Disposable, IDisposable } from '../../../base/common/lifecycle.js';
import { IExtensionDescription } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
import { ExtHostMcpShape, MainThreadMcpShape } from './extHost.protocol.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
export declare const IExtHostMpcService: import("../../../platform/instantiation/common/instantiation.js").ServiceIdentifier<IExtHostMpcService>;
export interface IExtHostMpcService extends ExtHostMcpShape {
    registerMcpConfigurationProvider(extension: IExtensionDescription, id: string, provider: vscode.McpServerDefinitionProvider): IDisposable;
}
export declare class ExtHostMcpService extends Disposable implements IExtHostMpcService {
    private readonly _logService;
    private readonly _extHostInitData;
    protected _proxy: MainThreadMcpShape;
    private readonly _initialProviderPromises;
    private readonly _sseEventSources;
    private readonly _unresolvedMcpServers;
    constructor(extHostRpc: IExtHostRpcService, _logService: ILogService, _extHostInitData: IExtHostInitDataService);
    $startMcp(id: number, launch: McpServerLaunch.Serialized): void;
    protected _startMcp(id: number, launch: McpServerLaunch): void;
    $stopMcp(id: number): void;
    $sendMessage(id: number, message: string): void;
    $waitForInitialCollectionProviders(): Promise<void>;
    $resolveMcpLaunch(collectionId: string, label: string): Promise<McpServerLaunch.Serialized | undefined>;
    /** {@link vscode.lm.registerMcpServerDefinitionProvider} */
    registerMcpConfigurationProvider(extension: IExtensionDescription, id: string, provider: vscode.McpServerDefinitionProvider): IDisposable;
}
