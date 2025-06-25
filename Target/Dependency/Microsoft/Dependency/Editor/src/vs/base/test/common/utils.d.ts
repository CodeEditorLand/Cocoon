import { DisposableStore } from '../../common/lifecycle.js';
import { URI } from '../../common/uri.js';
export type ValueCallback<T = any> = (value: T | Promise<T>) => void;
export declare function toResource(this: any, path: string): URI;
export declare function suiteRepeat(n: number, description: string, callback: (this: any) => void): void;
export declare function testRepeat(n: number, description: string, callback: (this: any) => any): void;
export declare function assertThrowsAsync(block: () => any, message?: string | Error): Promise<void>;
/**
 * Use this function to ensure that all disposables are cleaned up at the end of each test in the current suite.
 *
 * Use `markAsSingleton` if disposable singletons are created lazily that are allowed to outlive the test.
 * Make sure that the singleton properly registers all child disposables so that they are excluded too.
 *
 * @returns A {@link DisposableStore} that can optionally be used to track disposables in the test.
 * This will be automatically disposed on test teardown.
*/
export declare function ensureNoDisposablesAreLeakedInTestSuite(): Pick<DisposableStore, 'add'>;
export declare function throwIfDisposablesAreLeaked(body: () => void, logToConsole?: boolean): void;
export declare function throwIfDisposablesAreLeakedAsync(body: () => Promise<void>): Promise<void>;
