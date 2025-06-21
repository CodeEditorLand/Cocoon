/**
 * @module CreateTasksNamespace
 * @description Constructs the `vscode.tasks` namespace for the API object.
 */

import type { IExtensionDescription } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

import type TaskService from "../../Service/Task/Service.js";

/**
 * Creates the `vscode.tasks` namespace object.
 *
 * This factory function takes the central `TaskService` and creates a sandboxed
 * `tasks` object whose methods now return `Effect`s.
 *
 * @param Task The central service for task management.
 * @param AsEvent A function to create a safe event subscription.
 * @param Extension The description of the extension for which this API is being created.
 * @returns An object that implements the `vscode.tasks` API.
 */
const CreateTasksNamespace = (
	Task: TaskService["Type"],
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

		// --- Methods (now return Effects) ---
		registerTaskProvider: (Type, Provider) =>
			Task.RegisterTaskProvider(Type, Provider, Extension) as any,
		fetchTasks: (Filter) => Task.FetchTasks(Filter) as any,
		executeTask: (TaskParameter) =>
			Task.ExecuteTask(TaskParameter, Extension) as any,
	} as unknown as typeof VSCode.tasks;
};

export default CreateTasksNamespace;
