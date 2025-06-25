import { ExtHostAuthentication, DynamicAuthProvider, IExtHostAuthentication } from '../common/extHostAuthentication.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { IExtHostInitDataService } from '../common/extHostInitDataService.js';
import { IExtHostWindow } from '../common/extHostWindow.js';
import { IExtHostUrlsService } from '../common/extHostUrls.js';
import { ILoggerService, ILogService } from '../../../platform/log/common/log.js';
import { MainThreadAuthenticationShape } from '../common/extHost.protocol.js';
import { IAuthorizationServerMetadata, IAuthorizationProtectedResourceMetadata } from '../../../base/common/oauth.js';
import { Emitter } from '../../../base/common/event.js';
import { IExtHostProgress } from '../common/extHostProgress.js';
import { URI } from '../../../base/common/uri.js';
export declare class NodeDynamicAuthProvider extends DynamicAuthProvider {
    constructor(extHostWindow: IExtHostWindow, extHostUrls: IExtHostUrlsService, initData: IExtHostInitDataService, extHostProgress: IExtHostProgress, loggerService: ILoggerService, proxy: MainThreadAuthenticationShape, authorizationServer: URI, serverMetadata: IAuthorizationServerMetadata, resourceMetadata: IAuthorizationProtectedResourceMetadata | undefined, clientId: string, onDidDynamicAuthProviderTokensChange: Emitter<{
        authProviderId: string;
        clientId: string;
        tokens: any[];
    }>, initialTokens: any[]);
    private _createWithLoopbackServer;
    private _createWithDeviceCode;
}
export declare class NodeExtHostAuthentication extends ExtHostAuthentication implements IExtHostAuthentication {
    protected readonly _dynamicAuthProviderCtor: typeof NodeDynamicAuthProvider;
    constructor(extHostRpc: IExtHostRpcService, initData: IExtHostInitDataService, extHostWindow: IExtHostWindow, extHostUrls: IExtHostUrlsService, extHostProgress: IExtHostProgress, extHostLoggerService: ILoggerService, extHostLogService: ILogService);
}
