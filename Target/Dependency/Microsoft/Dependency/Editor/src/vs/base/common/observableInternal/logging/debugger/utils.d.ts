import { IDisposable } from '../../../lifecycle.js';
export declare function getFirstStackFrameOutsideOf(stack: string, pattern?: RegExp): ILocation | undefined;
export interface ILocation {
    fileName: string;
    line: number;
    column: number;
    id: string;
}
export declare class Debouncer implements IDisposable {
    private _timeout;
    debounce(fn: () => void, timeoutMs: number): void;
    dispose(): void;
}
export declare class Throttler implements IDisposable {
    private _timeout;
    throttle(fn: () => void, timeoutMs: number): void;
    dispose(): void;
}
export declare function deepAssign<T>(target: T, source: T): void;
export declare function deepAssignDeleteNulls<T>(target: T, source: T): void;
