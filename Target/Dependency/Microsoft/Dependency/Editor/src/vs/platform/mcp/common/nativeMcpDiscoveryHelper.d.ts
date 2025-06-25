import { Platform } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
export declare const INativeMcpDiscoveryHelperService: import("../../instantiation/common/instantiation.js").ServiceIdentifier<INativeMcpDiscoveryHelperService>;
export declare const NativeMcpDiscoveryHelperChannelName = "NativeMcpDiscoveryHelper";
export interface INativeMcpDiscoveryData {
    platform: Platform;
    homedir: URI;
    winAppData?: URI;
    xdgHome?: URI;
}
export interface INativeMcpDiscoveryHelperService {
    readonly _serviceBrand: undefined;
    load(): Promise<INativeMcpDiscoveryData>;
}
