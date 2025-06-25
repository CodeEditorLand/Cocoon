import { Event } from '../../common/event.js';
import { Disposable, IDisposable } from '../../common/lifecycle.js';
export type TimeOffset = number;
export interface Scheduler {
    schedule(task: ScheduledTask): IDisposable;
    get now(): TimeOffset;
}
export interface ScheduledTask {
    readonly time: TimeOffset;
    readonly source: ScheduledTaskSource;
    run(): void;
}
export interface ScheduledTaskSource {
    toString(): string;
    readonly stackTrace: string | undefined;
}
export declare class TimeTravelScheduler implements Scheduler {
    private taskCounter;
    private _now;
    private readonly queue;
    private readonly taskScheduledEmitter;
    readonly onTaskScheduled: Event<{
        task: ScheduledTask;
    }>;
    schedule(task: ScheduledTask): IDisposable;
    get now(): TimeOffset;
    get hasScheduledTasks(): boolean;
    getScheduledTasks(): readonly ScheduledTask[];
    runNext(): ScheduledTask | undefined;
    installGlobally(): IDisposable;
}
export declare class AsyncSchedulerProcessor extends Disposable {
    private readonly scheduler;
    private isProcessing;
    private readonly _history;
    get history(): readonly ScheduledTask[];
    private readonly maxTaskCount;
    private readonly useSetImmediate;
    private readonly queueEmptyEmitter;
    readonly onTaskQueueEmpty: Event<void>;
    private lastError;
    constructor(scheduler: TimeTravelScheduler, options?: {
        useSetImmediate?: boolean;
        maxTaskCount?: number;
    });
    private schedule;
    private process;
    waitForEmptyQueue(): Promise<void>;
}
export declare function runWithFakedTimers<T>(options: {
    useFakeTimers?: boolean;
    useSetImmediate?: boolean;
    maxTaskCount?: number;
}, fn: () => Promise<T>): Promise<T>;
export declare const originalGlobalValues: {
    setTimeout: typeof globalThis.setTimeout;
    clearTimeout: typeof clearTimeout;
    setInterval: typeof globalThis.setInterval;
    clearInterval: typeof clearInterval;
    setImmediate: typeof setImmediate;
    clearImmediate: typeof clearImmediate;
    requestAnimationFrame: typeof requestAnimationFrame;
    cancelAnimationFrame: typeof cancelAnimationFrame;
    Date: DateConstructor;
};
