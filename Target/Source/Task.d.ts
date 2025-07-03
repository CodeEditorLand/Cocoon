/**
 * @module Task
 * @description Defines the service for implementing the `vscode.tasks` API, which
 * manages the registration and lifecycle of `TaskProvider`s and orchestrates
 * task fetching and execution by proxying requests to the host process.
 */
import type { IExtensionDescription } from "@codeeditorland/output/vs/platform/extensions/common/extensions.js";
import { Effect } from "effect";
import { Disposable, type Event, type TaskEndEvent, type TaskExecution, type TaskFilter, type TaskProcessEndEvent, type TaskProcessStartEvent, type TaskProvider, type TaskStartEvent, type Task as VSCodeTask } from "vscode";
import { CancellationService } from "./Cancellation.js";
import { IPCService } from "./IPC.js";
/**
 * @interface ProviderEntry
 * @description An internal type associating a task provider with its metadata.
 */
export interface ProviderEntry<T extends VSCodeTask> {
    readonly Type: string;
    readonly Provider: TaskProvider<T>;
    readonly Extension: IExtensionDescription;
}
/**
 * @interface Task
 * @description The contract for the Task service.
 */
export interface Task {
    readonly onDidStartTask: Event<TaskStartEvent>;
    readonly onDidEndTask: Event<TaskEndEvent>;
    readonly onDidStartTaskProcess: Event<TaskProcessStartEvent>;
    readonly onDidEndTaskProcess: Event<TaskProcessEndEvent>;
    readonly taskExecutions: readonly TaskExecution[];
    readonly RegisterTaskProvider: <T extends VSCodeTask>(type: string, provider: TaskProvider<T>, extension: IExtensionDescription) => Effect.Effect<Disposable, Error>;
    readonly FetchTasks: (filter?: TaskFilter) => Effect.Effect<VSCodeTask[], Error>;
    readonly ExecuteTask: (task: VSCodeTask, extension: IExtensionDescription) => Effect.Effect<TaskExecution, Error>;
}
declare const TaskService_base: Effect.Service.Class<TaskService, "Service/Task", {
    readonly effect: Effect.Effect<{
        onDidStartTask: import("@codeeditorland/output/vs/workbench/workbench.web.main.internal.js").Event<TaskStartEvent>;
        onDidEndTask: import("@codeeditorland/output/vs/workbench/workbench.web.main.internal.js").Event<TaskEndEvent>;
        onDidStartTaskProcess: import("@codeeditorland/output/vs/workbench/workbench.web.main.internal.js").Event<TaskProcessStartEvent>;
        onDidEndTaskProcess: import("@codeeditorland/output/vs/workbench/workbench.web.main.internal.js").Event<TaskProcessEndEvent>;
        readonly taskExecutions: readonly TaskExecution[];
        RegisterTaskProvider: <T extends VSCodeTask>(Type: string, Provider: TaskProvider<T>, Extension: IExtensionDescription) => Effect.Effect<any, never, never>;
        FetchTasks: (Filter?: TaskFilter) => Effect.Effect<VSCode.Task[], Error, never>;
        ExecuteTask: (TaskToExecute: VSCodeTask, Extension: IExtensionDescription) => Effect.Effect<VSCode.TaskExecution, Error, never>;
    }, never, CancellationService | IPCService>;
}>;
/**
 * @class Task
 * @description The `Effect.Service` for the Task service.
 */
export declare class TaskService extends TaskService_base {
}
export {};
//# sourceMappingURL=Task.d.ts.map