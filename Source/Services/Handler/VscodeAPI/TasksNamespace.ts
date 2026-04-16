/**
 * @module Handler/VscodeAPI/TasksNamespace
 * @description
 * Factory for the vscode.tasks namespace shim.
 * Provides stub implementations for task provider registration,
 * task fetching, execution, and lifecycle events.
 */

import type { HandlerContext } from "../HandlerContext.js";

const CreateTasksNamespace = (
	_Context: HandlerContext,
) => ({
	registerTaskProvider: () => ({ dispose: () => {} }),
	fetchTasks: async () => [],
	executeTask: async () => undefined,
	onDidStartTask: () => ({ dispose: () => {} }),
	onDidEndTask: () => ({ dispose: () => {} }),
});

export default CreateTasksNamespace;
