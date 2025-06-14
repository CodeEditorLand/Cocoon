/**
 * @module Service (Task)
 * @description Defines the interface and Context.Tag for the Task service.
 */

import { Context, type Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	Event,
	Task,
	TaskExecution,
	TaskFilter,
	TaskProvider,
} from "vscode";

export interface Interface {
	readonly onDidStartTask: Event<any>; // TaskStartEvent
	readonly onDidEndTask: Event<any>; // TaskEndEvent
	readonly onDidStartTaskProcess: Event<any>; // TaskProcessStartEvent
	readonly onDidEndTaskProcess: Event<any>; // TaskProcessEndEvent

	readonly taskExecutions: readonly TaskExecution[];

	/**
	 * Registers a task provider.
	 * @param Type The task provider's type identifier.
	 * @param Provider The task provider to register.
	 * @param Extension The extension registering the provider.
	 * @returns An `Effect` resolving to a `Disposable`.
	 */
	readonly RegisterTaskProvider: (
		Type: string,
		Provider: TaskProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	/**
	 * Fetches tasks from all registered providers that match a given filter.
	 * @param Filter An optional filter to apply to the tasks.
	 * @returns An `Effect` resolving to an array of `Task` objects.
	 */
	readonly FetchTasks: (Filter?: TaskFilter) => Effect.Effect<Task[], Error>;

	/**
	 * Executes a task.
	 * @param TaskToExecute The task to execute.
	 * @param Extension The extension that defined the task.
	 * @returns An `Effect` resolving to the `TaskExecution` for the started task.
	 */
	readonly ExecuteTask: (
		TaskToExecute: Task,
		Extension: IExtensionDescription,
	) => Effect.Effect<TaskExecution, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Task");
