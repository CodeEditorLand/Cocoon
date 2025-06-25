import { INativeMcpDiscoveryData, INativeMcpDiscoveryHelperService } from '../common/nativeMcpDiscoveryHelper.js';
export declare class NativeMcpDiscoveryHelperService implements INativeMcpDiscoveryHelperService {
    readonly _serviceBrand: undefined;
    constructor();
    load(): Promise<INativeMcpDiscoveryData>;
    private uriFromEnvVariable;
}
