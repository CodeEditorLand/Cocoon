/**
 * @module CreateTasksNamespace
 * @description Constructs the `vscode.tasks` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type * as Service from "../../Service.js";

/**
 * Creates the `vscode.tasks` namespace object.
 *
 * This factory function takes the central `TaskService` and the extension's
 * description to create a sandboxed `tasks` object. The methods and events on this
 * object delegate to the central service.
 *
 * @param TaskService The central service for task management.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.tasks` API.
 */
export function CreateTasksNamespace(
	TaskService: Service.Task.Interface,
	AsEvent: <T>(event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.tasks {
	return {
		// --- Properties ---
		get taskExecutions() {
			return TaskService.taskExecutions;
		},

		// --- Events ---
		onDidStartTask: AsEvent(TaskService.onDidStartTask),
		onDidEndTask: AsEvent(TaskService.onDidEndTask),
		onDidStartTaskProcess: AsEvent(TaskService.onDidStartTaskProcess),
		onDidEndTaskProcess: AsEvent(TaskService.onDidEndTaskProcess),

		// --- Methods ---
		registerTaskProvider: (type, provider) => {
			return Effect.runSync(
				TaskService.RegisterTaskProvider(type, provider, Extension),
			);
		},
		fetchTasks: (filter) => {
			return Effect.runPromise(TaskService.FetchTasks(filter));
		},
		executeTask: (task) => {
			return Effect.runPromise(TaskService.ExecuteTask(task, Extension));
		},
	};
}
