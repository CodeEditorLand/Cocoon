/**
 * @module Process
 * @description Provides a controlled shim for the Node.js `process` global object.
 * This shim selectively exposes safe properties and methods from the real `process`
 * object, returning copies of sensitive data like `env` to prevent modification
 * and filtering out internal environment variables.
 */
import { EventEmitter } from "node:events";
declare class ProcessShimBase extends EventEmitter {
}
/**
 * @description The shim object for the `process` module. Dangerous methods like `exit`
 * are exposed initially but are intended to be patched later by the `PatchProcess` module.
 */
export declare const ProcessShim: {
    platform: NodeJS.Platform;
    arch: string;
    versions: NodeJS.ProcessVersions;
    pid: number;
    ppid: number;
    execPath: string;
    title: string;
    env: {
        [key: string]: string | undefined;
    };
    argv: string[];
    execArgv: string[];
    cwd: () => string;
    memoryUsage: () => NodeJS.MemoryUsage;
    hrtime: (time?: [number, number]) => [number, number];
    uptime: () => number;
    nextTick: (callback: (...args: any[]) => void, ...args: any[]) => void;
    exit: (code?: number) => never;
    kill: (pid: number, signal?: string | number) => true;
    chdir: (_directory: string) => never;
    setuid: (_id: number | string) => never;
    setgid: (_id: number | string) => never;
    addListener<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    emit<E extends string | symbol>(eventName: string | symbol, ...args: any[]): boolean;
    eventNames(): (string | symbol)[];
    getMaxListeners(): number;
    listenerCount<E extends string | symbol>(eventName: string | symbol, listener?: ((...args: any[]) => void) | undefined): number;
    listeners<E extends string | symbol>(eventName: string | symbol): ((...args: any[]) => void)[];
    off<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    on<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    once<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    prependListener<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    prependOnceListener<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    rawListeners<E extends string | symbol>(eventName: string | symbol): ((...args: any[]) => void)[];
    removeAllListeners<E extends string | symbol>(eventName?: string | symbol | undefined): ProcessShimBase;
    removeListener<E extends string | symbol>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    setMaxListeners(n: number): ProcessShimBase;
    [EventEmitter.captureRejectionSymbol]?(error: Error, event: string | symbol, ...args: any[]): void;
};
export {};
//# sourceMappingURL=Process.d.ts.map