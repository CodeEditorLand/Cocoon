import { IExtHostRpcService } from '../../common/extHostRpcService.js';
import { IExtHostContext } from '../../../services/extensions/common/extHostCustomers.js';
import { ExtensionHostKind } from '../../../services/extensions/common/extensionHostKind.js';
import { Proxied, ProxyIdentifier } from '../../../services/extensions/common/proxyIdentifier.js';
export declare function SingleProxyRPCProtocol(thing: any): IExtHostContext & IExtHostRpcService;
/** Makes a fake {@link SingleProxyRPCProtocol} on which any method can be called */
export declare function AnyCallRPCProtocol<T>(useCalls?: {
    [K in keyof T]: T[K];
}): IExtHostContext & IExtHostRpcService;
export declare class TestRPCProtocol implements IExtHostContext, IExtHostRpcService {
    _serviceBrand: undefined;
    remoteAuthority: never;
    extensionHostKind: ExtensionHostKind;
    private _callCountValue;
    private _idle?;
    private _completeIdle?;
    private readonly _locals;
    private readonly _proxies;
    constructor();
    drain(): Promise<void>;
    private get _callCount();
    private set _callCount(value);
    sync(): Promise<any>;
    getProxy<T>(identifier: ProxyIdentifier<T>): Proxied<T>;
    private _createProxy;
    set<T, R extends T>(identifier: ProxyIdentifier<T>, value: R): R;
    protected _remoteCall(proxyId: string, path: string, args: any[]): Promise<any>;
    dispose(): void;
    assertRegistered(identifiers: ProxyIdentifier<any>[]): void;
}
