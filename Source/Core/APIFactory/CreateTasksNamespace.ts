/**
 * @module CreateTasksNamespace
 * @description Constructs the `vscode.tasks` namespace for the API object.
 */

import { Effect } from "effect";
import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type TaskService from "../../Service/Task/Service.js";

/**
 * Creates the `vscode.tasks` namespace object.
 *
 * This factory function takes the central `TaskService` and the extension's
 * description to create a sandboxed `tasks` object. The methods and events on this
 * object delegate to the central service.
 *
 * @param Task The central service for task management.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.tasks` API.
 */
const CreateTasksNamespace = (
	Task: TaskService,
	AsEvent: <T>(Event: VSCode.Event<T>) => VSCode.Event<T>,
	Extension: IExtensionDescription,
): typeof VSCode.tasks => {
	return {
		// --- Properties ---
		get taskExecutions() {
			return Task.taskExecutions;
		},

		// --- Events ---
		onDidStartTask: AsEvent(Task.onDidStartTask),
		onDidEndTask: AsEvent(Task.onDidEndTask),
		onDidStartTaskProcess: AsEvent(Task.onDidStartTaskProcess),
		onDidEndTaskProcess: AsEvent(Task.onDidEndTaskProcess),

		// --- Methods ---
		registerTaskProvider: (Type, Provider) => {
			return Effect.runSync(
				Task.RegisterTaskProvider(Type, Provider, Extension),
			);
		},
		fetchTasks: (Filter) => {
			return Effect.runPromise(Task.FetchTasks(Filter));
		},
		executeTask: (TaskParameter) => {
			return Effect.runPromise(
				Task.ExecuteTask(TaskParameter, Extension),
			);
		},
	} as unknown as typeof VSCode.tasks; // Cast to bypass missing properties if any
};

export default CreateTasksNamespace;
