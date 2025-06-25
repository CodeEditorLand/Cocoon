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
    addListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    on<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    once<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    removeListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    off<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    removeAllListeners(eventName?: string | symbol | undefined): ProcessShimBase;
    setMaxListeners(n: number): ProcessShimBase;
    getMaxListeners(): number;
    listeners<K>(eventName: string | symbol): Function[];
    rawListeners<K>(eventName: string | symbol): Function[];
    emit<K>(eventName: string | symbol, ...args: any[]): boolean;
    listenerCount<K>(eventName: string | symbol, listener?: Function | undefined): number;
    prependListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    prependOnceListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): ProcessShimBase;
    eventNames(): (string | symbol)[];
};
export {};
