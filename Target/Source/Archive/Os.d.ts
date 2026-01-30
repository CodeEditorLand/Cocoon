/**
 * @module Os
 * @description Creates a safe shim for the Node.js 'os' module. This shim
 * provides static, host-approved data received during initialization, preventing
 * extensions from directly accessing potentially sensitive, real-time OS information.
 */
import * as NodeOs from "node:os";
import type { IExtensionHostInitData } from "@codeeditorland/output/vs/workbench/services/extensions/common/extensionHostProtocol.js";
/**
 * @description A factory function that creates the shim object for the `os` module.
 * It uses the static `InitData` to construct its methods, ensuring conformance
 * with the real `os` API while maintaining a secure sandbox.
 * @param InitData The initial data payload from the `Mountain` host.
 * @returns A shim object that implements a safe subset of the `os` module's API.
 */
export declare const CreateOsShim: (InitData: IExtensionHostInitData) => Readonly<{
    EOL: string;
    arch: () => NodeJS.Architecture;
    platform: () => NodeJS.Platform;
    constants: typeof NodeOs.constants;
    cpus: () => NodeOs.CpuInfo[];
    freemem: () => number;
    homedir: () => any;
    hostname: () => string;
    loadavg: () => number[];
    networkInterfaces: () => NodeJS.Dict<NodeOs.NetworkInterfaceInfo[]>;
    release: () => string;
    tmpdir: () => string;
    totalmem: () => number;
    type: () => "Windows_NT" | "Darwin" | "Linux";
    userInfo: (_options?: {
        encoding: string;
    }) => {
        uid: number;
        gid: number;
        username: any;
        homedir: any;
        shell: any;
    };
    uptime: () => number;
}>;
//# sourceMappingURL=Os.d.ts.map