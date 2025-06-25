import * as cp from 'child_process';
import * as Platform from '../common/platform.js';
import { CommandOptions, ForkOptions, Source, SuccessData, TerminateResponse, TerminateResponseCode } from '../common/processes.js';
export { Source, TerminateResponseCode, type CommandOptions, type ForkOptions, type SuccessData, type TerminateResponse };
export type ValueCallback<T> = (value: T | Promise<T>) => void;
export type ErrorCallback = (error?: any) => void;
export type ProgressCallback<T> = (progress: T) => void;
export declare function getWindowsShell(env?: Platform.IProcessEnvironment): string;
export interface IQueuedSender {
    send: (msg: any) => void;
}
export declare function createQueuedSender(childProcess: cp.ChildProcess): IQueuedSender;
export declare function getWindowPathExtensions(env?: Platform.IProcessEnvironment): string[];
export declare function findExecutable(command: string, cwd?: string, paths?: string[], env?: Platform.IProcessEnvironment, fileExists?: (path: string) => Promise<boolean>): Promise<string | undefined>;
/**
 * Kills a process and all its children.
 * @param pid the process id to kill
 * @param forceful whether to forcefully kill the process (default: false). Note
 * that on Windows, terminal processes can _only_ be killed forcefully and this
 * will throw when not forceful.
 */
export declare function killTree(pid: number, forceful?: boolean): Promise<void>;
