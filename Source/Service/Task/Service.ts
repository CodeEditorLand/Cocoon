/*
 * File: Cocoon/Source/Service/Task/Service.ts
 * Role: Defines the service interface and Effect.Service for the Task service.
 * Responsibilities:
 *   - Declare the contract for the service that implements the `vscode.tasks` API.
 *   - Provide the `Effect.Service` for dependency injection.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type {
	Disposable,
	Event,
	Task,
	TaskEndEvent,
	TaskExecution,
	TaskFilter,
	TaskProcessEndEvent,
	TaskProcessStartEvent,
	TaskProvider,
	TaskStartEvent,
} from "vscode";

/**
 * The `Effect.Service` for the Task service.
 * This service manages the registration of task providers and the execution of tasks.
 */
export class Task extends Effect.Service<Task>("Service/Task")<{
	readonly onDidStartTask: Event<TaskStartEvent>;
	readonly onDidEndTask: Event<TaskEndEvent>;
	readonly onDidStartTaskProcess: Event<TaskProcessStartEvent>;
	readonly onDidEndTaskProcess: Event<TaskProcessEndEvent>;
	readonly taskExecutions: readonly TaskExecution[];

	/**
	 * Registers a task provider.
	 * @param Type - The task provider's type identifier.
	 * @param Provider - The task provider implementation.
	 * @param Extension - The extension registering the provider.
	 * @returns An `Effect` resolving to a `Disposable` for unregistering.
	 */
	readonly RegisterTaskProvider: <T extends Task>(
		Type: string,
		Provider: TaskProvider<T>,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	/**
	 * Fetches tasks from all registered providers that match a given filter.
	 * @param Filter - An optional filter to apply to the tasks.
	 * @returns An `Effect` resolving to an array of `Task` objects.
	 */
	readonly FetchTasks: (Filter?: TaskFilter) => Effect.Effect<Task[], Error>;

	/**
	 * Executes a task.
	 * @param TaskToExecute - The task to execute.
	 * @param Extension - The extension that defined the task.
	 * @returns An `Effect` resolving to the `TaskExecution` for the started task.
	 */
	readonly ExecuteTask: (
		TaskToExecute: Task,
		Extension: IExtensionDescription,
	) => Effect.Effect<TaskExecution, Error>;
}>() {}
