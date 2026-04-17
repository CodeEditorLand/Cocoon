/**
 * @module Handler/VscodeAPI/TasksNamespace
 * @description
 * Factory for the vscode.tasks namespace shim. Bridges provider registration
 * and execution to Mountain via `register_task_provider`, `execute_task`,
 * `terminate_task` gRPC RPCs. Task lifecycle events arrive through
 * `Context.Emitter` on `"task.*"` channels.
 */

import type { HandlerContext } from "../HandlerContext.js";

let TaskProviderCounter = 0;

const EventSubscriber =
	(Context: HandlerContext, EventName: string) =>
	(Listener: (...Arguments: any[]) => any) => {
		Context.Emitter.on(EventName, Listener);
		return {
			dispose: () => {
				Context.Emitter.off(EventName, Listener);
			},
		};
	};

const CreateTasksNamespace = (Context: HandlerContext) => ({
	registerTaskProvider: (TaskType: string, _Provider: unknown) => {
		const Handle = `taskProvider:${++TaskProviderCounter}`;
		Context.SendToMountain("register_task_provider", {
			handle: Handle,
			task_type: TaskType,
			extension_id: "",
		}).catch(() => {});
		return {
			dispose: () => {
				Context.SendToMountain("unregister_task_provider", {
					handle: Handle,
				}).catch(() => {});
			},
		};
	},

	fetchTasks: async (Filter?: unknown): Promise<unknown[]> => {
		try {
			// Task.Fetch — not yet routed in CreateEffectForRequest.
			// Falls back to empty array via catch while Rust side is wired.
			const Response = await Context.MountainClient?.sendRequest("Task.Fetch", [
				Filter,
			]);
			return Array.isArray(Response) ? Response : [];
		} catch {
			return [];
		}
	},

	executeTask: async (Task: unknown): Promise<unknown> => {
		try {
			// Task.Execute — not yet routed in CreateEffectForRequest.
			return await Context.MountainClient?.sendRequest("Task.Execute", [Task]);
		} catch {
			return undefined;
		}
	},

	onDidStartTask: EventSubscriber(Context, "task.didStart"),
	onDidEndTask: EventSubscriber(Context, "task.didEnd"),
	onDidStartTaskProcess: EventSubscriber(Context, "task.didStartProcess"),
	onDidEndTaskProcess: EventSubscriber(Context, "task.didEndProcess"),

	taskExecutions: [] as unknown[],
});

export default CreateTasksNamespace;
