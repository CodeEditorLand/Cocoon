import { Event } from '../../../base/common/event.js';
import { IURITransformer } from '../../../base/common/uriIpc.js';
import { IServerChannel } from '../../../base/parts/ipc/common/ipc.js';
import { INativeMcpDiscoveryHelperService } from '../common/nativeMcpDiscoveryHelper.js';
export declare class NativeMcpDiscoveryHelperChannel implements IServerChannel {
    private getUriTransformer;
    private nativeMcpDiscoveryHelperService;
    constructor(getUriTransformer: undefined | ((requestContext: any) => IURITransformer), nativeMcpDiscoveryHelperService: INativeMcpDiscoveryHelperService);
    listen(context: any, event: string): Event<any>;
    call(context: any, command: string, args?: any): Promise<any>;
}
