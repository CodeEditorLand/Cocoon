/**
 * @module Service (Tasks)
 * @description Defines the interface and Context.Tag for the Tasks service.
 */

import { Context, Effect, Stream } from "effect";
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
	readonly onDidStartTask: Event<any>;
	readonly onDidEndTask: Event<any>;
	// ... other events

	/**
	 * Registers a task provider.
	 */
	readonly RegisterTaskProvider: (
		Type: string,
		Provider: TaskProvider,
		Extension: IExtensionDescription,
	) => Effect.Effect<Disposable, Error>;

	/**
	 * Fetches tasks from all registered providers.
	 */
	readonly FetchTasks: (Filter?: TaskFilter) => Effect.Effect<Task[], Error>;

	/**
	 * Executes a task.
	 */
	readonly ExecuteTask: (
		TaskToExecute: Task,
		Extension: IExtensionDescription,
	) => Effect.Effect<TaskExecution, Error>;
}

export const Tag = Context.Tag<Interface>("Service/Tasks");
